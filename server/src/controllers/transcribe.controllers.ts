import { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import { Transcript } from "../modals/transcript.modals";
import { GoogleGenAI } from "@google/genai";
import User from "../modals/user.modals";
import multer from "multer";
import path from "path";
import { addTranscriptToUser } from "./user.controller";

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
    const outputTxt = `${filePath}.txt`;

    console.log(`Processing audio file: ${req.file.originalname}`);
    exec(
      `whisper ${filePath} --model base --output_dir uploads`,
      async (err) => {
        if (err) {
          console.error("Whisper failed:", err);
          res.status(500).json({ error: "Transcription failed" });
          return;
        }

        fs.readFile(outputTxt, "utf8", async (err, data) => {
          if (err) {
            console.error("Reading transcript failed:", err);
            res.status(500).json({ error: "Failed to read transcript" });
            return;
          }

          try {
            console.log(
              "Audio transcription successful, storing in database..."
            );
            // Store transcript in MongoDB
            const transcript = new Transcript({
              userId: user._id,
              audioFile: req.file!.originalname,
              transcript: data,
            });

            await transcript.save();
            console.log(`Transcript saved with ID: ${transcript._id}`);

            // Add transcript to user's transcripts array
            await addTranscriptToUser(user._id, transcript._id);

            // Generate summary asynchronously
            generateAndSaveSummary(transcript).catch((error) => {
              console.error("Background summary generation failed:", error);
            });

            // Clean up files
            fs.unlinkSync(filePath);
            fs.unlinkSync(outputTxt);
            console.log("Temporary files cleaned up");

            res.json({ transcript: data });
          } catch (error) {
            console.error("Database storage failed:", error);
            res.status(500).json({ error: "Failed to store transcript" });
          }
        });
      }
    );
  } catch (error) {
    console.error("Transcription process failed:", error);
    res.status(500).json({ error: "Transcription process failed" });
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

    // Generate summary asynchronously
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
