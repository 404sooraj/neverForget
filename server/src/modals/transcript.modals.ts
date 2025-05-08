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
  language: {
    type: String,
    enum: ["hindi", "en-in", "english"],
    default: "hindi",
  },
  summary: {
    type: String,
    default: "",
  },
  oneLiner: {
    type: String,
    default: "",
  },
  isSummarized: {
    type: Boolean,
    default: false,
  },
  summaryError: {
    type: String,
    default: null,
  },
  summaryTimestamp: {
    type: Date,
    default: null,
  },
});

export const Transcript = mongoose.model("Transcript", transcriptSchema);
