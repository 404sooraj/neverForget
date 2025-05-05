import { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import { Transcript } from "../modals/transcript.modals";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    exec(
      `whisper ${filePath} --model tiny --output_dir uploads`,
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
            // Store transcript in MongoDB
            const transcript = new Transcript({
              userId: user._id,
              audioFile: req.file!.originalname,
              transcript: data,
            });

            await transcript.save();

            // Add transcript to user's transcripts array
            await addTranscriptToUser(user._id, transcript._id);

            // Clean up files
            fs.unlinkSync(filePath);
            fs.unlinkSync(outputTxt);

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
export const generateSummary = async (transcript: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Please provide a concise summary of the following transcript:\n\n${transcript}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini summary generation failed:", error);
    throw error;
  }
};

// Function to process pending transcripts
export const processPendingTranscripts = async (): Promise<void> => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const pendingTranscripts = await Transcript.find({
      isSummarized: false,
      timestamp: { $lt: thirtyMinutesAgo },
    });

    for (const transcript of pendingTranscripts) {
      try {
        const summary = await generateSummary(transcript.transcript);
        transcript.summary = summary;
        transcript.isSummarized = true;
        await transcript.save();
        console.log(`Summary generated for transcript ${transcript._id}`);
      } catch (error) {
        console.error(`Failed to process transcript ${transcript._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to process pending transcripts:", error);
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

    // Add transcript to user's transcripts array
    await addTranscriptToUser(user._id, newTranscript._id);

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
