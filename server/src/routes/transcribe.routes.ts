import express from "express";
import multer from "multer";
import { transcribeAudio, storeTranscribedData } from "../controllers/transcribe.controllers";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/transcribe", upload.single("audio"), transcribeAudio);
router.post("/store-transcript", storeTranscribedData);

export default router;
