import { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import { Transcript } from "../modals/transcript.modals";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export const transcribeAudio = async (req: Request, res: Response): Promise<void> => {
  console.log("Received transcription request...");

  if (!req.file) {
    console.log("No file received");
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const filePath = req.file.path;
  const outputTxt = `${filePath}.txt`;

  exec(`whisper ${filePath} --model base  --output_dir uploads`, async (err) => {
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
          userId: req.user?._id,
          audioFile: req.file!.originalname,
          transcript: data,
        });

        await transcript.save();

        fs.unlinkSync(filePath);
        fs.unlinkSync(outputTxt);
        console.log("Transcription successful and stored in database");
        res.json({ transcript: data });
      } catch (error) {
        console.error("Database storage failed:", error);
        res.status(500).json({ error: "Failed to store transcript" });
      }
    });
  });
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
      timestamp: { $lt: thirtyMinutesAgo }
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
export const storeTranscribedData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, audioFileName } = req.body;

    if (!transcript || !audioFileName) {
      res.status(400).json({ error: "Transcript and audio file name are required" });
      return;
    }

    // Store transcript in MongoDB
    const newTranscript = new Transcript({
      userId: req.user?._id,
      audioFile: audioFileName,
      transcript: transcript,
    });

    await newTranscript.save();
    console.log("Transcribed data stored successfully");
    res.json({ message: "Transcribed data stored successfully", transcript: newTranscript });
  } catch (error) {
    console.error("Failed to store transcribed data:", error);
    res.status(500).json({ error: "Failed to store transcribed data" });
  }
};
