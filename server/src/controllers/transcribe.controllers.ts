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

// Helper function to validate transcript text
const isValidTranscript = (text: string): boolean => {
  // Remove whitespace and check if there's actual content
  const cleaned = text.trim();
  return cleaned.length > 0 && !/^[\s\n\r]*$/.test(cleaned);
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
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const filePath = req.file.path;

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
              console.error("Error deleting failed transcription file:", unlinkError);
            }
          });
          return;
        }

        try {
          // Read the transcription result
          const transcriptionText = fs.readFileSync(`${filePath}.txt`, 'utf8');

          // Check if transcription is valid
          if (!isValidTranscript(transcriptionText)) {
            console.log("Transcription result is empty or invalid");
            fs.unlink(filePath, () => {});
            fs.unlink(`${filePath}.txt`, () => {});
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
          fs.unlink(`${filePath}.txt`, () => {});

          // Generate summary asynchronously only if transcript is valid
          generateAndSaveSummary(newTranscript).catch((summaryError) => {
            console.error("Background summary generation failed:", summaryError);
          });

        } catch (error) {
          console.error("Error processing transcription result:", error);
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
    const prompt = `Please analyze the following transcript and provide both a detailed summary and a one-line summary. Format your response as a valid JSON object with the following structure:
{
  "oneLiner": "A brief one-sentence summary of the key point",
  "summary": "A more detailed multi-paragraph summary of the transcript"
}

Transcript:
${transcript}`;

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
    console.log(`Checking transcript ${transcriptDoc._id} for summarization...`);
    
    // Check if transcript is valid
    if (!transcriptDoc.transcript || !isValidTranscript(transcriptDoc.transcript)) {
      console.log(`Transcript ${transcriptDoc._id} is empty or invalid, skipping summarization`);
      transcriptDoc.isSummarized = true;
      transcriptDoc.summaryError = "Empty or invalid transcript";
      transcriptDoc.summaryTimestamp = new Date();
      await transcriptDoc.save();
      return;
    }

    console.log(`Generating summary for transcript ${transcriptDoc._id}...`);
    const { summary, oneLiner } = await generateSummary(transcriptDoc.transcript);

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
    if (!isValidTranscript(transcript)) {
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
