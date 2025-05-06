import { spawn } from "child_process";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { Transcript } from "../modals/transcript.modals";
import User from "../modals/user.modals";
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

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

export const transcribeAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { username, mode } = req.body;
    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const filePath = req.file.path;

    if (mode === "immediate") {
      // === Immediate mode using Python script ===
      const pythonScriptPath = path.join(__dirname, "..", "service", "transcribe.py");
      const child = spawn("python", [pythonScriptPath, filePath]);

      let output = "";
      let errorOutput = "";

      child.stdout.on("data", (data) => (output += data.toString()));
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error("Python script error:", data.toString());
      });

      child.on("close", async (code) => {
        fs.unlinkSync(filePath);

        if (code !== 0) {
          console.error("Whisper script failed:", errorOutput);
          res.status(500).json({ error: "Transcription failed" });
          return;
        }

        try {
          const result = JSON.parse(output);
          const text = result.text;

          const transcript = new Transcript({
            userId: user._id,
            audioFile: req.file.originalname,
            transcript: text,
          });

          await transcript.save();
          await addTranscriptToUser(user._id, transcript._id);
          generateAndSaveSummary(transcript).catch(console.error);

          res.json({ transcript: text });
        } catch (err) {
          console.error("Parsing/storing error:", err);
          res.status(500).json({ error: "Failed to handle transcription" });
        }
      });

    } else {
      // === Queued mode using job system ===
      const jobId = await transcriptionQueue.addJob(
        filePath,
        username,
        async (error) => {
          if (error) {
            console.error("Job transcription error:", error);
            fs.unlink(filePath, () => {});
            return;
          }

          try {
            const transcriptionText = fs.readFileSync(`${filePath}.txt`, "utf8");

            const newTranscript = new Transcript({
              userId: user._id,
              audioFile: req.file.originalname,
              transcript: transcriptionText,
            });

            await newTranscript.save();
            await addTranscriptToUser(user._id, newTranscript._id);

            fs.unlink(filePath, () => {});
            fs.unlink(`${filePath}.txt`, () => {});

            generateAndSaveSummary(newTranscript).catch(console.error);
          } catch (error) {
            console.error("Queue processing failed:", error);
          }
        }
      );

      res.status(202).json({
        message: "Transcription job queued",
        jobId,
        status: "queued",
      });
    }
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Transcription process failed" });
  }
};


// Function to generate summary using Gemini
export const generateSummary = async (
  transcript: string
): Promise<{ summary: string; oneLiner: string }> => {
  try {
    console.log("Generating summary using Gemini API...");
    const prompt = `Please analyze the following transcript and provide both a detailed summary and a one-line summary. Format your response as a valid JSON object with this structure:
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

    if (!response.text) throw new Error("Empty response from Gemini");

    let jsonText = response.text.trim()
      .replace(/^```json\s*|\s*```$/g, "")
      .replace(/^```\s*|\s*```$/g, "");

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.summary || !parsed.oneLiner)
        throw new Error("Missing required fields");
      return parsed;
    } catch (parseErr) {
      console.warn("Fallback summary parsing:", parseErr);
      return {
        summary: response.text.trim(),
        oneLiner: "Summary of transcript",
      };
    }
  } catch (error: any) {
    console.error("Summary generation failed:", error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
};

// Helper function to generate and save summary
const generateAndSaveSummary = async (transcriptDoc: any): Promise<void> => {
  try {
    const { summary, oneLiner } = await generateSummary(transcriptDoc.transcript);
    transcriptDoc.summary = summary;
    transcriptDoc.oneLiner = oneLiner;
    transcriptDoc.isSummarized = true;
    transcriptDoc.summaryTimestamp = new Date();
    await transcriptDoc.save();
  } catch (error: any) {
    transcriptDoc.isSummarized = true;
    transcriptDoc.summaryError = error.message;
    transcriptDoc.summaryTimestamp = new Date();
    await transcriptDoc.save();
  }
};

export const storeTranscribedData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, audioFileName, username } = req.body;

    if (!transcript || !username) {
      res.status(400).json({ error: "Transcript and username are required" });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const newTranscript = new Transcript({
      userId: user._id,
      audioFile: audioFileName,
      transcript,
    });

    await newTranscript.save();
    await addTranscriptToUser(user._id, newTranscript._id);

    generateAndSaveSummary(newTranscript).catch(console.error);

    res.json({ message: "Transcribed data stored successfully", transcript: newTranscript });
  } catch (error) {
    console.error("Store transcription error:", error);
    res.status(500).json({ error: "Failed to store transcription" });
  }
};

export const getTranscriptsByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const transcripts = await Transcript.find({ userId: user._id });
    res.json(transcripts);
  } catch (error) {
    console.error("Get transcripts error:", error);
    res.status(500).json({ error: "Failed to get transcripts" });
  }
};

export const deleteTranscript = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const transcript = await Transcript.findByIdAndDelete(id);

    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete transcript error:", error);
    res.status(500).json({ error: "Failed to delete transcript" });
  }
};

export const getAllTranscripts = async (req: Request, res: Response): Promise<void> => {
  try {
    const transcripts = await Transcript.find();
    res.json(transcripts);
  } catch (error) {
    console.error("Get all transcripts error:", error);
    res.status(500).json({ error: "Failed to get all transcripts" });
  }
};

export const processPendingTranscripts = async (): Promise<void> => {
  try {
    console.log("Processing pending transcripts...");
    const pending = await Transcript.find({ isSummarized: false });
    for (const t of pending) {
      await generateAndSaveSummary(t);
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
