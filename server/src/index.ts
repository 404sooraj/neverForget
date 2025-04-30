import express, { Request, Response } from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import cors from "cors";
import path from "path";
import { connectDB } from "./config/database";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Allow mobile devices to send requests
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Setup Multer to store in /uploads
const upload = multer({ dest: "uploads/" });

// API route for transcription
app.post(
  "/transcribe",
  upload.single("audio"),
  (req: Request, res: Response): void => {
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
          console.log("Transcription successful", data);
          res.json({ transcript: data });
        });
      }
    );
  }
);

app.get("/", (_req, res) => {
  res.send("Hello, TypeScript + Express!");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
