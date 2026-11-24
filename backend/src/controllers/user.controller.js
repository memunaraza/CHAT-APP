import mongoose from "mongoose";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { cleanImage, toClient } from "../utils/message.js";

// Sab users + har user ke saath last message aur unread count
export const getUsers = async (req, res) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user._id);

    const [users, lastMessages, unread] = await Promise.all([
      User.find({ _id: { $ne: me } }).select("name email avatar bio isOnline lastSeen").lean(),
      Message.aggregate([
        { $match: { group: null, $or: [{ sender: me }, { receiver: me }] } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { $cond: [{ $eq: ["$sender", me] }, "$receiver", "$sender"] },
            last: { $first: "$$ROOT" },
          },
        },
      ]),
      Message.aggregate([
        { $match: { receiver: me, status: { $ne: "seen" } } },
        { $group: { _id: "$sender", count: { $sum: 1 } } },
      ]),
    ]);

    const lastMap = new Map(lastMessages.map((m) => [String(m._id), m.last]));
    const unreadMap = new Map(unread.map((u) => [String(u._id), u.count]));

    res.json({
      users: users.map((u) => ({
        ...u,
        name: u.name || u.email?.split("@")[0] || "Unknown user",
        lastMessage: lastMap.get(String(u._id)) ? toClient(lastMap.get(String(u._id))) : null,
        unread: unreadMap.get(String(u._id)) || 0,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Apna profile update karo: naam, bio, photo (photo sirf apne Cloudinary ki)
export const updateMe = async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const update = {};

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n || n.length > 50)
        return res.status(400).json({ message: "Name must be 1 to 50 characters" });
      update.name = n;
    }
    if (bio !== undefined) {
      const b = String(bio).trim();
      if (b.length > 140)
        return res.status(400).json({ message: "Bio can be at most 140 characters" });
      update.bio = b;
    }
    if (avatar !== undefined) {
      if (avatar === "") update.avatar = "";
      else {
        const img = cleanImage({ url: avatar });
        if (!img) return res.status(400).json({ message: "Invalid photo" });
        update.avatar = img.url;
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    const pub = { _id: user._id, name: user.name, avatar: user.avatar, bio: user.bio || "" };

    // Sab connected users ko realtime batao
    req.app.get("io")?.emit("user:updated", pub);
    res.json({ user: { ...pub, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
