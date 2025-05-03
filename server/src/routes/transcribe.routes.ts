import express from "express";
import multer from "multer";
import { transcribeAudio, storeTranscribedData } from "../controllers/transcribe.controllers";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Apply auth middleware to specific routes
router.post("/transcribe", authMiddleware, upload.single("audio"), transcribeAudio);
router.post("/store-transcript", authMiddleware, storeTranscribedData);

export default router;
