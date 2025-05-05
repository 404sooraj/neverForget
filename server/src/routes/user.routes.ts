import express from "express";
import {
  createUser,
  getUserByUsername,
  getUserTranscripts,
} from "../controllers/user.controller";

const router = express.Router();

// Create a new user
router.post("/users", createUser);

// Get user by username
router.get("/users/:username", getUserByUsername);

// Get user transcripts with optional date filtering
router.get("/users/:username/transcripts", getUserTranscripts);

export default router;
