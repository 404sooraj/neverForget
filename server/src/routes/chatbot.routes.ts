import express from "express";
import { chatbotMemoryQuery } from "../controllers/chatbot.controllers";

const router = express.Router();

// Endpoint for memory chatbot queries
router.post("/chatbot/memory", chatbotMemoryQuery);

export default router;