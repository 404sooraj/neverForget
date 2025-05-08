import { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import { Transcript } from "../modals/transcript.modals";
import { generateLocalSummary } from "../config/local-nlp";
import User from "../modals/user.modals";
import multer from "multer";
import path from "path";
import { addTranscriptToUser } from "./user.controller";
import { transcriptionQueue } from "../config/queue";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
      };
    }
  }
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use current timestamp and include the original filename to maintain file extension and improve traceability
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_"); // Sanitize filename
    const filename = `${timestamp}_${originalName}`;
    cb(null, filename);
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to validate transcription text
const isValidTranscription = (text: string): boolean => {
  if (!text) return false;
  const cleaned = text.trim();
  return cleaned.length > 0 && !/^[\s\n\r]*$/.test(cleaned);
};

// Helper function to check if file exists
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const transcribeAudio = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { username, language } = req.body;
    if (!username) {
      // Clean up the file if username is missing
      fs.unlink(req.file.path, () => {});
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      // Clean up the file if user not found
      fs.unlink(req.file.path, () => {});
      res.status(404).json({ error: "User not found" });
      return;
    }

    const filePath = req.file.path;

    // Verify file exists before processing
    const exists = await fileExists(filePath);
    if (!exists) {
      res.status(400).json({ error: "File not found or inaccessible" });
      return;
    }

    // Set language to English-Indian if specified, otherwise use default
    const transcriptionLanguage = language === "en-in" ? "en-in" : "hindi";

    // Add job to queue and get job ID
    const jobId = await transcriptionQueue.addJob(
      filePath,
      username,
      async (error) => {
        if (error) {
          console.error("Transcription failed:", error);
          // Clean up the file if transcription failed
          fs.unlink(filePath, (unlinkError) => {
            if (unlinkError) {
              console.error(
                "Error deleting failed transcription file:",
                unlinkError
              );
            }
          });
          return;
        }

        try {
          // Verify transcription file exists
          const transcriptionPath = `${filePath}.txt`;
          const transcriptionExists = await fileExists(transcriptionPath);
          if (!transcriptionExists) {
            console.error("Transcription file not found:", transcriptionPath);
            return;
          }

          // Read and validate the transcription result
          const transcriptionText = await fs.promises.readFile(
            transcriptionPath,
            "utf8"
          );

          if (!isValidTranscription(transcriptionText)) {
            console.log("Invalid or empty transcription result");
            // Clean up files for invalid transcription
            fs.unlink(filePath, () => {});
            fs.unlink(transcriptionPath, () => {});
            return;
          }

          // Store transcript in MongoDB
          const newTranscript = new Transcript({
            userId: user._id,
            audioFile: req.file?.originalname,
            transcript: transcriptionText,
            language: transcriptionLanguage // Save the language used
          });

          await newTranscript.save();
          await addTranscriptToUser(user._id, newTranscript._id);

          // Clean up files
          fs.unlink(filePath, () => {});
          fs.unlink(transcriptionPath, () => {});

          // Only generate summary if transcription is valid
          if (isValidTranscription(transcriptionText)) {
            generateAndSaveSummary(newTranscript).catch((summaryError) => {
              console.error(
                "Background summary generation failed:",
                summaryError
              );
            });
          } else {
            // Mark as summarized with error if transcription is invalid
            newTranscript.isSummarized = true;
            newTranscript.summaryError = "Invalid or empty transcription";
            await newTranscript.save();
          }
        } catch (error) {
          console.error("Error processing transcription result:", error);
          // Clean up files in case of error
          fs.unlink(filePath, () => {});
          fs.unlink(`${filePath}.txt`, () => {});
        }
      },
      3, // max retries
      transcriptionLanguage // pass the language to the job
    );

    // Return immediately with job ID and language info
    res.status(202).json({
      message: "Transcription job queued",
      jobId,
      status: "queued",
      language: transcriptionLanguage
    });
  } catch (error) {
    console.error("Failed to queue transcription:", error);
    // Clean up the file in case of error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: "Failed to queue transcription" });
  }
};

// Function to generate summary using local NLP model
export const generateSummary = async (
  transcript: string
): Promise<{ summary: string; oneLiner: string }> => {
  try {
    console.log("Generating summary using local NLP model...");
    
    // Call our local model instead of Gemini
    const result = await generateLocalSummary(transcript);
    
    return {
      summary: result.summary,
      oneLiner: result.oneLiner
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
}

// Helper function to generate and save summary
const generateAndSaveSummary = async (transcriptDoc: any): Promise<void> => {
  try {
    console.log(
      `Checking transcript ${transcriptDoc._id} for summarization...`
    );

    // Check if transcript is valid
    if (
      !transcriptDoc.transcript ||
      !isValidTranscription(transcriptDoc.transcript)
    ) {
      console.log(
        `Transcript ${transcriptDoc._id} is empty or invalid, skipping summarization`
      );
      transcriptDoc.isSummarized = true;
      transcriptDoc.summaryError = "Empty or invalid transcript";
      transcriptDoc.summaryTimestamp = new Date();
      await transcriptDoc.save();
      return;
    }

    console.log(`Generating summary for transcript ${transcriptDoc._id}...`);
    const { summary, oneLiner } = await generateSummary(
      transcriptDoc.transcript
    );

    transcriptDoc.summary = summary;
    transcriptDoc.oneLiner = oneLiner;
    transcriptDoc.isSummarized = true;
    transcriptDoc.summaryTimestamp = new Date();
    await transcriptDoc.save();

    console.log(`Summary saved for transcript ${transcriptDoc._id}`);
  } catch (error) {
    console.error(
      `Failed to generate/save summary for transcript ${transcriptDoc._id}:`,
      error
    );
    transcriptDoc.isSummarized = true;
    transcriptDoc.summaryError = (error as unknown as any).message;
    transcriptDoc.summaryTimestamp = new Date();
    await transcriptDoc.save();
  }
};

// New controller for storing already transcribed data
export const storeTranscribedData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { transcript, audioFileName, username } = req.body;

    if (!transcript || !audioFileName || !username) {
      res.status(400).json({
        error: "Transcript, audio file name, and username are required",
      });
      return;
    }

    // Validate transcript content
    if (!isValidTranscription(transcript)) {
      res.status(400).json({
        error: "Transcript is empty or invalid",
      });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Store transcript in MongoDB
    const newTranscript = new Transcript({
      userId: user._id,
      audioFile: audioFileName,
      transcript: transcript,
    });

    await newTranscript.save();
    console.log(`New transcript created with ID: ${newTranscript._id}`);

    // Add transcript to user's transcripts array
    await addTranscriptToUser(user._id, newTranscript._id);

    // Generate summary asynchronously only if transcript is valid
    generateAndSaveSummary(newTranscript).catch((error) => {
      console.error("Background summary generation failed:", error);
    });

    console.log("Transcribed data stored successfully");
    res.json({
      message: "Transcribed data stored successfully",
      transcript: newTranscript,
    });
  } catch (error) {
    console.error("Failed to store transcribed data:", error);
    res.status(500).json({ error: "Failed to store transcribed data" });
  }
};

// Get all transcripts for the user by username
export const getTranscriptsByUsername = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const transcripts = await Transcript.find({ userId: user._id }).sort({
      timestamp: -1,
    });
    res.json(transcripts);
  } catch (error) {
    console.error("Failed to fetch transcripts:", error);
    res.status(500).json({ error: "Failed to fetch transcripts" });
  }
};

// Delete a transcript
export const deleteTranscript = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const transcript = await Transcript.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!transcript) {
      res.status(404).json({ error: "Transcript not found" });
      return;
    }

    // Remove transcript from user's transcripts array
    await User.findByIdAndUpdate(user._id, { $pull: { transcripts: id } });

    res.json({ message: "Transcript deleted successfully" });
  } catch (error) {
    console.error("Failed to delete transcript:", error);
    res.status(500).json({ error: "Failed to delete transcript" });
  }
};

// Get all transcripts
export const getAllTranscripts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const transcripts = await Transcript.find().sort({ timestamp: -1 });
    res.json(transcripts);
  } catch (error) {
    console.error("Failed to fetch all transcripts:", error);
    res.status(500).json({ error: "Failed to fetch all transcripts" });
  }
};

// Function to determine current task using local processing
export const getCurrentTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get the user's most recent transcripts
    const recentTranscripts = await Transcript.find({
      userId: user._id,
      isSummarized: true, // Only use successfully summarized transcripts
      summaryError: null, // And without errors
    })
      .sort({ timestamp: -1 }) // Most recent first
      .limit(5) // Only look at the 5 most recent
      .select("oneLiner summary timestamp") // Only select what we need
      .lean();

    // If no transcripts, return default response
    if (recentTranscripts.length === 0) {
      res.json({ currentTask: "No transcripts available to determine task" });
      return;
    }

    // Simple algorithm to determine current task based on most recent transcript
    let currentTask = "Could not determine current task at this time.";
    
    if (recentTranscripts.length > 0) {
      // Use the one-liner from the most recent transcript as the current task
      const mostRecent = recentTranscripts[0];
      currentTask = mostRecent.oneLiner || "Conversation recorded recently";
      
      // Check timestamp to add recency information
      const now = new Date();
      const transcriptTime = new Date(mostRecent.timestamp);
      const hoursDiff = Math.round((now.getTime() - transcriptTime.getTime()) / (1000 * 60 * 60));
      
      if (hoursDiff < 1) {
        currentTask = `Just now: ${currentTask}`;
      } else if (hoursDiff < 24) {
        currentTask = `${hoursDiff} hours ago: ${currentTask}`;
      }
    }

    // Send the response
    res.json({ currentTask });
  } catch (error: any) {
    console.error(
      `Error in getCurrentTask for user ${req.params.username}:`,
      error
    );
    res.status(500).json({
      error: "Failed to determine current task due to a server error",
    });
  }
};

// Process pending transcripts that need summaries
export const processPendingTranscripts = async (): Promise<void> => {
  try {
    console.log("Processing pending transcripts...");

    // Find transcripts that haven't been summarized yet
    const pendingTranscripts = await Transcript.find({
      isSummarized: false,
    });

    console.log(`Found ${pendingTranscripts.length} pending transcripts`);

    for (const transcript of pendingTranscripts) {
      try {
        await generateAndSaveSummary(transcript);
        console.log(`Processed transcript ${transcript._id}`);
      } catch (error) {
        console.error(`Error processing transcript ${transcript._id}:`, error);
      }
    }

    console.log("Finished processing pending transcripts");
  } catch (error) {
    console.error("Error in processPendingTranscripts:", error);
  }
};

// Add new endpoint to check transcription status
export const getTranscriptionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ error: "Job ID is required" });
      return;
    }

    // Get position in queue and queue status
    const position = transcriptionQueue.getJobPosition(jobId);
    const { queueLength, activeJobs } = transcriptionQueue.getQueueStatus();

    if (position === -1) {
      // Check if job is no longer in queue
      res.json({
        jobId,
        position: -1,
        queueLength,
        status: "completed_or_unknown",
      });
    } else {
      res.json({
        jobId,
        position,
        queueLength,
        status: position === 0 && activeJobs > 0 ? "processing" : "queued",
      });
    }
  } catch (error) {
    console.error("Error retrieving job status:", error);
    res.status(500).json({ error: "Failed to get job status" });
  }
};

// Add new endpoint to get overall queue status
export const getQueueStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const queueStatus = transcriptionQueue.getQueueStatus();

    // Return the queue status
    res.json({
      ...queueStatus,
      usesGPU: transcriptionQueue.getGpuFailures() === 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error retrieving queue status:", error);
    res.status(500).json({ error: "Failed to get queue status" });
  }
};

// Add new endpoint to get Vosk status
export const checkVoskStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const queueStatus = transcriptionQueue.getQueueStatus();
    
    // Return Vosk readiness status
    res.json({
      voskReady: queueStatus.voskReady,
      timestamp: new Date().toISOString(),
      message: queueStatus.voskReady 
        ? "Vosk is properly initialized and ready for English-Indian transcription" 
        : "Vosk is not ready. Please check Python dependencies and make sure vosk and wave modules are installed."
    });
  } catch (error) {
    console.error("Error retrieving Vosk status:", error);
    res.status(500).json({ error: "Failed to get Vosk status" });
  }
};
