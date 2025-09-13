import express, { Router } from "express";
import {
  createUser,
  getUserByUsername,
  getUserTranscripts,
  getAllUsers,
} from "../controllers/user.controller";

const router: Router = express.Router();

// Get all users
router.get("/user", getAllUsers);

// Create a new user
router.post("/user", createUser);

// Get user by username
router.get("/user/:username", getUserByUsername);

// Get user transcripts with optional date filtering
router.get("/user/:username/transcripts", getUserTranscripts);

export default router;
