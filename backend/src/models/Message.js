import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // group message mein nahi hota
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    text: { type: String, trim: true, maxlength: 4000, default: "" },
    status: { type: String, enum: ["sent", "delivered", "seen"], default: "sent" },
    image: { url: String, width: Number, height: Number },
    audio: { url: String, duration: Number },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reactions: { type: [reactionSchema], default: [] },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, status: 1 });
messageSchema.index({ group: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
