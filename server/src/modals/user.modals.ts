import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  transcripts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    transcripts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transcript",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);
