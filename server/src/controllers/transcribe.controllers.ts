import { spawn } from "child_process";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Transcript } from "../modals/transcript.modals";
import User from "../modals/user.modals";
import { addTranscriptToUser } from "./user.controller";

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

    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const filePath = req.file.path;
    const pythonScriptPath = path.join(__dirname, "..", "service", "transcribe.py");

    const child = spawn("python", [pythonScriptPath, filePath]);

    console.log("Starting transcription with:", {
      pythonScriptPath,
      filePath
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("Python script error:", data.toString());
    });

    child.on("close", async (code) => {
      fs.unlinkSync(filePath); // Always clean up

      if (code !== 0) {
        console.error("Whisper Python script failed:", errorOutput);
        res.status(500).json({ error: "Transcription failed" });
        return;
      }

      try {
        const result = JSON.parse(output);
        const text = result.text;

        const transcript = new Transcript({
          userId: user._id,
          audioFile: req.file?.originalname,
          transcript: text,
        });

        await transcript.save();
        await addTranscriptToUser(user._id, transcript._id);

        res.json({ transcript: text });
      } catch (err) {
        console.error("Error parsing Whisper output or storing:", err);
        res.status(500).json({ error: "Failed to handle transcription" });
      }
    });
  } catch (error) {
    console.error("Transcription process error:", error);
    res.status(500).json({ error: "Transcription process failed" });
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
      transcript: transcript,
    });

    await newTranscript.save();
    await addTranscriptToUser(user._id, newTranscript._id);

    res.json({ success: true, transcript: newTranscript });
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
