import { Request, Response, Router } from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const app = Router();
const upload = multer({ dest: "uploads/" });

app.post(
  "/transcribe",
  upload.single("audio"),
  (req: Request, res: Response) => {
    console.log("Transcribing...");
    console.log(req.file);
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const filePath = req.file.path;
    const outputTxt = `${filePath}.txt`;

    // Run whisper CLI to transcribe
    exec(
      `whisper ${filePath} --model base --output_format txt --output_dir uploads`,
      (err) => {
        if (err) {
          console.error(err);
          res.status(500).send("Transcription failed");
          return;
        }

        fs.readFile(outputTxt, "utf8", (err, data) => {
          if (err) {
            res.status(500).send("Failed to read transcription");
            return;
          }

          // Clean up
          fs.unlinkSync(filePath);
          fs.unlinkSync(outputTxt);
          console.log("Transcription successful", data);
          res.json({ transcript: data });
        });
      }
    );
  }
);
export default app;
