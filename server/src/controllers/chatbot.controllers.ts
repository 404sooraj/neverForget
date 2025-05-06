import { Request, Response } from "express";
import User from "../modals/user.modals"; // Fix: Import as default export
import { Transcript } from "../modals/transcript.modals";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Format transcript data for the prompt
    const formattedMemories = transcripts.map((t, index) => {
      // Format the date in a human-readable format
      const date = new Date(t.timestamp);
      const formattedDate = date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });

      return `Memory #${index + 1} - ${formattedDate}:
One-liner: ${t.oneLiner || "No summary available"}
Summary: ${t.summary || "No detailed summary available"}
Full transcript: ${t.transcript}
---`;
    }).join('\n\n');

    // Construct the prompt for Gemini
    const prompt = `You are a helpful memory assistant for someone with memory difficulties. You have access to their recorded memories and conversations. Answer their question as accurately as possible based ONLY on the information in the provided memories. If the information isn't available in the memories, say you don't have that information but suggest how they might find it. Don't make up information.

User question: "${query}"

Memories (ordered from most recent to oldest):
${formattedMemories}

Keep your answer concise, accurate, and based only on the information provided above. If the answer involves a date or time, clearly state it. If multiple memories are relevant, synthesize the information for a complete answer.`;

    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured for chatbot feature");
      res.status(500).json({ error: "Memory chatbot service is not available at the moment" });
      return;
    }

    // Call Gemini API
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash", // Using the same model as for summaries
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    if (!response?.text) {
      throw new Error("Empty response from Gemini API");
    }

    // Send the response back to the user
    res.json({
      response: response.text.trim(),
    });

  } catch (error: any) {
    console.error(`Error in chatbot memory query:`, error);
    res.status(500).json({
      error: "Failed to process memory query",
      message: error.message || "Unknown error",
    });
  }
};