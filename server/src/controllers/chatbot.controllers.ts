import { Request, Response } from "express";
import User from "../modals/user.modals"; // Fix: Import as default export
import { Transcript } from "../modals/transcript.modals";
import { processLocalMemoryQuery, isTimeQuery } from "../config/local-nlp";

// Memory Chatbot - handles user questions about past conversations and memories
export const chatbotMemoryQuery = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, query } = req.body;

    if (!username || !query) {
      res.status(400).json({ error: "Username and query are required" });
      return;
    }

    console.log(`Memory chatbot query from ${username}: "${query}"`);

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Retrieve all transcripts for this user
    const transcripts = await Transcript.find({
      userId: user._id,
      isSummarized: true, // Only use summarized transcripts
      summaryError: null, // Exclude failed summaries
    })
      .sort({ timestamp: -1 }) // Most recent first
      .select("transcript summary oneLiner timestamp summaryTimestamp") // Select only needed fields
      .lean();

    if (transcripts.length === 0) {
      res.json({
        response: "I don't have any recorded memories to help answer that question yet."
      });
      return;
    }

    console.log(`Found ${transcripts.length} memories to search through for user ${username}`);

    // Process the query locally using our keyword-based approach
    const response = processLocalMemoryQuery(query, transcripts);

    // Add special handling for time-based queries
    if (isTimeQuery(query) && transcripts.length > 0) {
      // For time queries, add information about the most recent memory
      const mostRecent = transcripts[0];
      const date = new Date(mostRecent.timestamp);
      const timeInfo = `Your most recent memory was recorded on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}.`;
      
      res.json({
        response: response + "\n\n" + timeInfo
      });
      return;
    }

    // Send the response back to the user
    res.json({
      response: response
    });

  } catch (error: any) {
    console.error(`Error in chatbot memory query:`, error);
    res.status(500).json({
      error: "Failed to process memory query",
      message: error.message || "Unknown error",
    });
  }
};