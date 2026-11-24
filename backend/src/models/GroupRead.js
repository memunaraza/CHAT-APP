import mongoose from "mongoose";

// Har user ne har group ko kab tak padha (unread count ke liye)
const groupReadSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  at: { type: Date, default: Date.now },
});

groupReadSchema.index({ group: 1, user: 1 }, { unique: true });

export default mongoose.model("GroupRead", groupReadSchema);
