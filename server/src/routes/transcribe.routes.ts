import express from "express";
import multer from "multer";
import {
  transcribeAudio,
  storeTranscribedData,
  getTranscriptsByUsername,
  deleteTranscript,
  getAllTranscripts,
  getTranscriptionStatus,
  getCurrentTask,
} from "../controllers/transcribe.controllers";
// import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Apply auth middleware to specific routes

// Get all transcripts
router.get("/transcripts", getAllTranscripts);

// To send raw audio we use the below route
// audio file to be passed in the body aswell as the username
router.post("/transcribe", upload.single("audio"), transcribeAudio);

// Incase real time transcription is working, we use the below route
// transcript, audioFileName, username to be passed in the body
router.post("/store-transcript", storeTranscribedData);

// Get transcripts by username
router.get("/transcripts/:username", getTranscriptsByUsername);

// Delete a transcript
router.delete("/transcripts/:id", deleteTranscript);

// Get transcription status
router.get("/transcription-status/:jobId", getTranscriptionStatus);

// Get current task
router.get("/current-task/:username", getCurrentTask);

export default router;
