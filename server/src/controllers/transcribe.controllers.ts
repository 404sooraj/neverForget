import { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import { Transcript } from "../modals/transcript.modals";
import { GoogleGenAI } from "@google/genai";
import User from "../modals/user.modals";
import multer from "multer";
import path from "path";
import { addTranscriptToUser } from "./user.controller";
import { transcriptionQueue } from "../config/queue";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
      };
    }
  }
}

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to validate transcription text
const isValidTranscription = (text: string): boolean => {
  if (!text) return false;
  const cleaned = text.trim();
  return cleaned.length > 0 && !/^[\s\n\r]*$/.test(cleaned);
};

// Helper function to check if file exists
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const transcribeAudio = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { username } = req.body;
    if (!username) {
      // Clean up the file if username is missing
      fs.unlink(req.file.path, () => {});
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      // Clean up the file if user not found
      fs.unlink(req.file.path, () => {});
      res.status(404).json({ error: "User not found" });
      return;
    }

    const filePath = req.file.path;

    // Verify file exists before processing
    const exists = await fileExists(filePath);
    if (!exists) {
      res.status(400).json({ error: "File not found or inaccessible" });
      return;
    }

    // Add job to queue and get job ID
    const jobId = await transcriptionQueue.addJob(
      filePath,
      username,
      async (error) => {
        if (error) {
          console.error("Transcription failed:", error);
          // Clean up the file if transcription failed
          fs.unlink(filePath, (unlinkError) => {
            if (unlinkError) {
              console.error(
                "Error deleting failed transcription file:",
                unlinkError
              );
            }
          });
          return;
        }

        try {
          // Verify transcription file exists
          const transcriptionPath = `${filePath}.txt`;
          const transcriptionExists = await fileExists(transcriptionPath);
          if (!transcriptionExists) {
            console.error("Transcription file not found:", transcriptionPath);
            return;
          }

          // Read and validate the transcription result
          const transcriptionText = await fs.promises.readFile(
            transcriptionPath,
            "utf8"
          );

          if (!isValidTranscription(transcriptionText)) {
            console.log("Invalid or empty transcription result");
            // Clean up files for invalid transcription
            fs.unlink(filePath, () => {});
            fs.unlink(transcriptionPath, () => {});
            return;
          }

          // Store transcript in MongoDB
          const newTranscript = new Transcript({
            userId: user._id,
            audioFile: req.file?.originalname,
            transcript: transcriptionText,
          });

          await newTranscript.save();
          await addTranscriptToUser(user._id, newTranscript._id);

          // Clean up files
          fs.unlink(filePath, () => {});
          fs.unlink(transcriptionPath, () => {});

          // Only generate summary if transcription is valid
          if (isValidTranscription(transcriptionText)) {
            generateAndSaveSummary(newTranscript).catch((summaryError) => {
              console.error(
                "Background summary generation failed:",
                summaryError
              );
            });
          } else {
            // Mark as summarized with error if transcription is invalid
            newTranscript.isSummarized = true;
            newTranscript.summaryError = "Invalid or empty transcription";
            await newTranscript.save();
          }
        } catch (error) {
          console.error("Error processing transcription result:", error);
          // Clean up files in case of error
          fs.unlink(filePath, () => {});
          fs.unlink(`${filePath}.txt`, () => {});
        }
      }
    );

    // Return immediately with job ID
    res.status(202).json({
      message: "Transcription job queued",
      jobId,
      status: "queued",
    });
  } catch (error) {
    console.error("Failed to queue transcription:", error);
    // Clean up the file in case of error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: "Failed to queue transcription" });
  }
};

// Function to generate summary using Gemini
export const generateSummary = async (
  transcript: string
): Promise<{ summary: string; oneLiner: string }> => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Generating summary using Gemini API...");
    const prompt = `You are a helpful AI assistant for a memory-aid device designed to help people with dementia remember recent conversations. Given the following raw transcript from a live conversation, generate two things:

    1. A **concise one-line summary** capturing the core message or intention of the conversation. This must be direct, essential, and free of filler.
    2. A **clear and coherent summary** of the conversation that covers all important details, rephrased for clarity and ease of recall. Do NOT mention that this is a summary—just present the key details in a natural, narrative style.
    
    Output your response as a JSON object like this:
    {
      "oneLiner": "One sentence that captures the essence of the conversation.",
      "summary": "A multi-paragraph detailed summary rephrased in simple language, suitable for someone with memory loss to understand easily."
    }
    
    Transcript:
    """
    ${transcript}
    """`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("Failed to generate summary: Empty response from Gemini");
    }

    console.log("Raw Gemini response received");

    try {
      // Extract JSON if the response has extra text
      let jsonText = response.text.trim();

      // Remove markdown code blocks and any prefixes
      jsonText = jsonText.replace(/^```json\s*|\s*```$/g, "");
      jsonText = jsonText.replace(/^```\s*|\s*```$/g, "");

      // Try to parse the response as JSON
      const parsedResponse = JSON.parse(jsonText);

      // Validate that we have both fields
      if (!parsedResponse.summary || !parsedResponse.oneLiner) {
        throw new Error("Response missing required fields");
      }

      console.log("Summary generated successfully");
      return {
        summary: parsedResponse.summary,
        oneLiner: parsedResponse.oneLiner,
      };
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);

      // Fallback: use the whole response as the summary and generate a default one-liner
      return {
        summary: response.text.trim(),
        oneLiner: "Summary of transcript",
      };
    }
  } catch (error: any) {
    console.error("Summary generation failed:", error);
    throw new Error(
      `Failed to generate summary: ${error?.message || "Unknown error"}`
    );
  }
};

// Helper function to generate and save summary
const generateAndSaveSummary = async (transcriptDoc: any): Promise<void> => {
  try {
    console.log(
      `Checking transcript ${transcriptDoc._id} for summarization...`
    );

    // Check if transcript is valid
    if (
      !transcriptDoc.transcript ||
      !isValidTranscription(transcriptDoc.transcript)
    ) {
      console.log(
        `Transcript ${transcriptDoc._id} is empty or invalid, skipping summarization`
      );
      transcriptDoc.isSummarized = true;
      transcriptDoc.summaryError = "Empty or invalid transcript";
      transcriptDoc.summaryTimestamp = new Date();
      await transcriptDoc.save();
      return;
    }

    console.log(`Generating summary for transcript ${transcriptDoc._id}...`);
    const { summary, oneLiner } = await generateSummary(
      transcriptDoc.transcript
    );

    transcriptDoc.summary = summary;
    transcriptDoc.oneLiner = oneLiner;
    transcriptDoc.isSummarized = true;
    transcriptDoc.summaryTimestamp = new Date();
    await transcriptDoc.save();

    console.log(`Summary saved for transcript ${transcriptDoc._id}`);
  } catch (error) {
    console.error(
      `Failed to generate/save summary for transcript ${transcriptDoc._id}:`,
      error
    );
    transcriptDoc.isSummarized = true;
    transcriptDoc.summaryError = (error as unknown as any).message;
    transcriptDoc.summaryTimestamp = new Date();
    await transcriptDoc.save();
  }
};

// New controller for storing already transcribed data
export const storeTranscribedData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { transcript, audioFileName, username } = req.body;

    if (!transcript || !audioFileName || !username) {
      res.status(400).json({
        error: "Transcript, audio file name, and username are required",
      });
      return;
    }

    // Validate transcript content
    if (!isValidTranscription(transcript)) {
      res.status(400).json({
        error: "Transcript is empty or invalid",
      });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Store transcript in MongoDB
    const newTranscript = new Transcript({
      userId: user._id,
      audioFile: audioFileName,
      transcript: transcript,
    });

    await newTranscript.save();
    console.log(`New transcript created with ID: ${newTranscript._id}`);

    // Add transcript to user's transcripts array
    await addTranscriptToUser(user._id, newTranscript._id);

    // Generate summary asynchronously only if transcript is valid
    generateAndSaveSummary(newTranscript).catch((error) => {
      console.error("Background summary generation failed:", error);
    });

    console.log("Transcribed data stored successfully");
    res.json({
      message: "Transcribed data stored successfully",
      transcript: newTranscript,
    });
  } catch (error) {
    console.error("Failed to store transcribed data:", error);
    res.status(500).json({ error: "Failed to store transcribed data" });
  }
};

// Get all transcripts for the user by username
export const getTranscriptsByUsername = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const transcripts = await Transcript.find({ userId: user._id }).sort({
      timestamp: -1,
    });
    res.json(transcripts);
  } catch (error) {
    console.error("Failed to fetch transcripts:", error);
    res.status(500).json({ error: "Failed to fetch transcripts" });
  }
};

// Delete a transcript
export const deleteTranscript = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const transcript = await Transcript.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }

    // Remove transcript from user's transcripts array
    await User.findByIdAndUpdate(user._id, { $pull: { transcripts: id } });

    res.json({ message: "Transcript deleted successfully" });
  } catch (error) {
    console.error("Failed to delete transcript:", error);
    res.status(500).json({ error: "Failed to delete transcript" });
  }
};

// Get all transcripts
export const getAllTranscripts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const transcripts = await Transcript.find().sort({ timestamp: -1 });
    res.json(transcripts);
  } catch (error) {
    console.error("Failed to fetch all transcripts:", error);
    res.status(500).json({ error: "Failed to fetch all transcripts" });
  }
};

// Determine the current task based on recent summaries
export const getCurrentTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { username } = req.params;
  console.log(`Attempting to get current task for user: ${username}`);

  try {
    // 1. Find the user
    const user = await User.findOne({ username });
    if (!user) {
      console.warn(`User not found: ${username}`);
      res.status(404).json({ error: "User not found" });
      return;
    }
    console.log(`User found: ${username}, ID: ${user._id}`);

    // 2. Get the latest 6 transcripts with non-empty, non-error summaries
    const recentTranscripts = await Transcript.find({
      userId: user._id,
      isSummarized: true,
      summary: { $exists: true, $ne: "" }, // Ensure summary exists and is not empty
      summaryError: null, // Ensure no summary error occurred
    })
      .sort({ timestamp: -1 }) // Latest first
      .limit(6) // Limit to the last 6
      .select("summary oneLiner timestamp") // Select only necessary fields
      .lean(); // Use lean for better performance with raw JS objects

    if (recentTranscripts.length === 0) {
      console.log(`No recent summaries found for user: ${username}`);
      res.status(200).json({
        currentTask:
          "No recent summaries available to determine the current task.",
      });
      return;
    }
    console.log(
      `Found ${recentTranscripts.length} recent summaries for user: ${username}`
    );

    // 3. Prepare summaries for the Gemini prompt (latest first)
    const summariesText = recentTranscripts
      .map(
        (t, index) =>
          `Summary ${index + 1} (Latest):\nOne-liner: ${
            t.oneLiner
          }\nFull Summary: ${t.summary}`
      )
      .join("\n\n---\n\n"); // Separate summaries clearly

    // 4. Construct the prompt for Gemini
    const prompt = `Analyze these recent conversation summaries (ordered from newest to oldest) and extract the user's current primary task or focus. If there's no clear pattern or insufficient context, respond with "Unable to determine, need more context". Keep the response very concise (max 10-15 words) and focused only on the active task/goal.\n\nSummaries:\n${summariesText}\n\nCurrent Task:`;

    console.log(`Generating current task for user ${username} with prompt...`);

    // 5. Call Gemini API
    let currentTask = "Could not determine current task at this time.";
    try {
      if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured.");
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const geminiAPIResponse = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let extractedText = "";

      // Based on the linter error, geminiAPIResponse.text is a 'get' accessor, not a function.
      if (geminiAPIResponse && typeof geminiAPIResponse.text === "string") {
        extractedText = geminiAPIResponse.text;
        console.log("Extracted text using response.text property.");
      } else if (
        geminiAPIResponse &&
        geminiAPIResponse.candidates &&
        geminiAPIResponse.candidates.length > 0 &&
        geminiAPIResponse.candidates[0].content &&
        geminiAPIResponse.candidates[0].content.parts &&
        geminiAPIResponse.candidates[0].content.parts.length > 0 &&
        typeof geminiAPIResponse.candidates[0].content.parts[0].text ===
          "string"
      ) {
        extractedText = geminiAPIResponse.candidates[0].content.parts[0].text;
        console.log("Extracted text using response.candidates structure.");
      } else {
        // This case handles if .text is not a string and candidates structure is also not matching/empty.
        // It also covers if geminiAPIResponse itself is null or undefined.
        console.warn(
          `Gemini returned an unexpected or empty response structure (user: ${username}). Response: ${JSON.stringify(
            geminiAPIResponse
          )}`
        );
        currentTask =
          "Unable to determine current task due to an unexpected API response format.";
      }

      if (extractedText && extractedText.trim() !== "") {
        currentTask = extractedText.trim();
        console.log(`Current task determined for ${username}: ${currentTask}`);
      } else if (
        currentTask === "Could not determine current task at this time."
      ) {
        // Only update if currentTask wasn't set by the unexpected format error above.
        console.warn(
          `Gemini returned an empty or invalid text content (user: ${username}).`
        );
        currentTask =
          "Unable to determine current task from the provided summaries (empty text).";
      }
    } catch (geminiError: any) {
      console.error(
        `Gemini API call failed for current task determination (user: ${username}):`,
        geminiError
      );
      currentTask = `Error determining task: ${
        geminiError.message || "Unknown Gemini API error"
      }`;
    }

    // 6. Send the response
    res.json({ currentTask });
  } catch (error: any) {
    console.error(
      `Overall error in getCurrentTask for user ${username}:`,
      error
    );
    res.status(500).json({
      error: "Failed to determine current task due to a server error",
    });
  }
};

// Process pending transcripts that need summaries
export const processPendingTranscripts = async (): Promise<void> => {
  try {
    console.log("Processing pending transcripts...");

    // Find transcripts that haven't been summarized yet
    const pendingTranscripts = await Transcript.find({
      isSummarized: false,
    });

    console.log(`Found ${pendingTranscripts.length} pending transcripts`);

    for (const transcript of pendingTranscripts) {
      try {
        await generateAndSaveSummary(transcript);
        console.log(`Processed transcript ${transcript._id}`);
      } catch (error) {
        console.error(`Error processing transcript ${transcript._id}:`, error);
      }
    }

    console.log("Finished processing pending transcripts");
  } catch (error) {
    console.error("Error in processPendingTranscripts:", error);
  }
};

// Add new endpoint to check transcription status
export const getTranscriptionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;

    const position = transcriptionQueue.getJobPosition(jobId);
    const { queueLength, isProcessing } = transcriptionQueue.getQueueStatus();

    if (position === -1) {
      // Job not found in queue (either completed or failed)
      res.json({
        status: "not_found",
        message: "Job not found in queue (may have completed or failed)",
      });
      return;
    }

    res.json({
      status: position === 0 && isProcessing ? "processing" : "queued",
      position: position + 1,
      queueLength,
    });
  } catch (error) {
    console.error("Error checking transcription status:", error);
    res.status(500).json({ error: "Failed to check transcription status" });
  }
};
