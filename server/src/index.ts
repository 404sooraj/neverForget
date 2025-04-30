import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import transcriptionRoutes from "./routes/transcribe.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

app.get("/", (_req, res) => {
  res.send("Hello, TypeScript + Express!");
});

// Mount routes
app.use("/", transcriptionRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
