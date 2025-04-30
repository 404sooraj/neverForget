import { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";

export const transcribeAudio = (req: Request, res: Response): void => {
  console.log("Received transcription request...");

  if (!req.file) {
    console.log("No file received");
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const filePath = req.file.path;
  const outputTxt = `${filePath}.txt`;

  exec(
    `whisper ${filePath} --model base --output_format txt --output_dir uploads`,
    (err) => {
      if (err) {
        console.error("Whisper failed:", err);
        res.status(500).json({ error: "Transcription failed" });
        return;
      }

      fs.readFile(outputTxt, "utf8", (err, data) => {
        if (err) {
          console.error("Reading transcript failed:", err);
          res.status(500).json({ error: "Failed to read transcript" });
          return;
        }

        fs.unlinkSync(filePath);
        fs.unlinkSync(outputTxt);
        console.log("Transcription successful");
        res.json({ transcript: data });
      });
    }
  );
};
