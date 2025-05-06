import { Request, Response } from "express";
import User from "../modals/user.modals";
import { Transcript } from "../modals/transcript.modals";
import mongoose from "mongoose";

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .select("-__v") // Exclude version field
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    res.status(200).json({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email } = req.body;

    if (!username) {
      res.status(400).json({ message: "Username is required" });
      return
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ message: "Username already exists" });
      return;
    }

    const user = new User({
      username,
      email: email || "",
    });

    await user.save();
    res.status(201).json({ user });
    return;
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

// Get user by username
export const getUserByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user });
    return;
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

// Get user transcripts with optional date filtering
export const getUserTranscripts = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { startDate, endDate } = req.query;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Build query for transcripts
    let query: any = { userId: user._id };

    // Add date filtering if provided
    // Apply date filtering if provided
    // Expected format: YYYY-MM-DD or ISO string (e.g., 2023-01-01 or 2023-01-01T00:00:00.000Z)
    if (startDate || endDate) {
      query.timestamp = {};

      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }

      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
      }
    }

    // Fetch transcripts
    const transcripts = await Transcript.find(query)
      .sort({ timestamp: -1 }) // Latest first
      .lean();

    res.status(200).json({ transcripts });
  } catch (error) {
    console.error("Error fetching user transcripts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a transcript to a user
export const addTranscriptToUser = async (
  userId: string,
  transcriptId: mongoose.Types.ObjectId
) => {
  try {
    await User.findByIdAndUpdate(
      userId,
      { $push: { transcripts: transcriptId } },
      { new: true }
    );
    return true;
  } catch (error) {
    console.error("Error adding transcript to user:", error);
    return false;
  }
};
