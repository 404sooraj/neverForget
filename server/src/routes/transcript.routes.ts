import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  transcribeAudio, 
  generateSummary, 
  processPendingTranscripts,
  storeTranscribedData,
  getTranscripts,
  deleteTranscript,
  upload
} from '../controllers/transcribe.controllers';

const router = express.Router();

// Protected routes
router.use(authMiddleware);

// Get all transcripts for the user
router.get('/', getTranscripts);

// Transcribe audio file
router.post('/transcribe', upload.single('audio'), transcribeAudio);

// Store already transcribed data
router.post('/store', storeTranscribedData);

// Delete a transcript
router.delete('/:id', deleteTranscript);

export default router; 