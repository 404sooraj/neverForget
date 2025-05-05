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
      unique: false,
      sparse: true,
      trim: true,
      lowercase: true,
      default: "",
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

// Drop any existing email index before creating the model
// mongoose.connection.once("connected", async () => {
//   try {
//     if (mongoose.connection.db) {
//       const collections = await mongoose.connection.db.collections();
//       const userCollection = collections.find(
//         (c) => c.collectionName === "users"
//       );
//       if (userCollection) {
//         try {
//           await userCollection.dropIndex("email_1");
//           console.log("Successfully dropped email index");
//         } catch (indexError) {
//           // Index might not exist, which is fine
//           console.log("No email index found to drop");
//         }
//       }
//     }
//   } catch (error) {
//     console.log("Error handling indexes:", error);
//   }
// });

export default mongoose.model<IUser>("User", UserSchema);
