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
  getQueueStatus,
} from "../controllers/transcribe.controllers";
// import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Apply auth middleware to specific routes

// Get all transcripts
router.get("/transcripts", getAllTranscripts);

// To send raw audio we use the below route
// audio file to be passed in the body aswell as the username
router.post("/transcribe", (req, res, next) => {
  console.log(`\n=== MULTER MIDDLEWARE [${(req as any).requestId || 'unknown'}] ===`);
  console.log(`Content-Type:`, req.headers['content-type']);
  console.log(`Content-Length:`, req.headers['content-length']);
  console.log(`Request body before multer:`, req.body);
  console.log(`=== END MULTER MIDDLEWARE ===\n`);
  
  upload.single("audio")(req, res, (err) => {
    if (err) {
      console.error(`❌ MULTER ERROR [${(req as any).requestId || 'unknown'}]:`, err);
      console.error(`Multer error details:`, {
        message: err.message,
        code: err.code,
        field: err.field,
        requestId: (req as any).requestId || 'unknown'
      });
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: "File too large",
          details: "File size exceeds 10MB limit",
          requestId: (req as any).requestId || 'unknown'
        });
      }
      
      return res.status(400).json({
        error: "File upload error",
        details: err.message,
        requestId: (req as any).requestId || 'unknown'
      });
    }
    
    console.log(`✅ Multer processing completed [${(req as any).requestId || 'unknown'}]`);
    console.log(`File after multer:`, req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    console.log(`Body after multer:`, req.body);
    
    next();
  });
}, transcribeAudio);

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

// Get overall queue status
router.get("/queue-status", getQueueStatus);

export default router;
