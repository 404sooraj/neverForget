import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  audioFile: {
    type: String,
    required: true,
  },
  transcript: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  summary: {
    type: String,
    default: "",
  },
  isSummarized: {
    type: Boolean,
    default: false,
  },
});

export const Transcript = mongoose.model("Transcript", transcriptSchema); 