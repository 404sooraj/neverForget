import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import transcriptionRoutes from "./routes/transcribe.routes";
import userRoutes from "./routes/user.routes";
import chatbotRoutes from "./routes/chatbot.routes"; // Import chatbot routes
import { startScheduler } from "./config/scheduler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

// Start the scheduler
startScheduler();

app.get("/", (_req, res) => {
  res.send("Hello, TypeScript + Express!");
});

// Mount routes
app.use("/", transcriptionRoutes);
app.use("/", userRoutes);
app.use("/", chatbotRoutes); // Mount chatbot routes

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
