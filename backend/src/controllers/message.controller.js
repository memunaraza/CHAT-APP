import mongoose from "mongoose";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import { POPULATE_REPLY, toClient } from "../utils/message.js";

// Do users ke beech ki chat history (latest 200)
export const getMessages = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const messages = await Message.find({
      group: null,
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate(POPULATE_REPLY)
      .lean();

    res.json({ messages: messages.reverse().map(toClient) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Group ki history: sirf members, aur sirf jab se wo join hue
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid group" });

    const group = await Group.findOne({ _id: groupId, "members.user": req.user._id }).select("members");
    if (!group) return res.status(403).json({ message: "You are not a member of this group" });

    const joinedAt = group.members.find((m) => String(m.user) === String(req.user._id)).joinedAt;
    const messages = await Message.find({ group: group._id, createdAt: { $gte: joinedAt } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate(POPULATE_REPLY)
      .lean();

    res.json({ messages: messages.reverse().map(toClient) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
