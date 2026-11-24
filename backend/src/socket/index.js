import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Group from "../models/Group.js";
import GroupRead from "../models/GroupRead.js";
import { setIO } from "../utils/io.js";
import { EMOJIS, POPULATE_REPLY, cleanAudio, cleanImage, toClient } from "../utils/message.js";

// userId -> kitne sockets (tabs) khule hain
const online = new Map();

const groupRoom = (id) => `g:${id}`;

// Message ko reply info ke saath client format mein badlo
const publish = async (m) => {
  await m.populate(POPULATE_REPLY);
  return toClient(m);
};

// Message ke sab related users ko event bhejo (group ho to poore group ko)
const notify = (io, m, event, payload) =>
  m.group
    ? io.to(groupRoom(m.group)).emit(event, payload)
    : io.to(String(m.sender)).to(String(m.receiver)).emit(event, payload);

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL },
  });
  setIO(io);

  // Har connection se pehle token verify hota hai
  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(id);
      if (!user) return next(new Error("Unauthorized"));
      socket.userId = String(user._id);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const uid = socket.userId;
    socket.join(uid); // har user ka apna room (multi-tab support)

    // Apne saare groups ke rooms join karo
    const myGroups = await Group.find({ "members.user": uid }).select("_id");
    myGroups.forEach((g) => socket.join(groupRoom(g._id)));

    online.set(uid, (online.get(uid) || 0) + 1);

    if (online.get(uid) === 1) {
      await User.findByIdAndUpdate(uid, { isOnline: true });
      socket.broadcast.emit("user:status", { userId: uid, isOnline: true });

      // Jo messages "sent" the, ab "delivered" ho gaye
      const senders = await Message.distinct("sender", { receiver: uid, status: "sent" });
      if (senders.length) {
        await Message.updateMany({ receiver: uid, status: "sent" }, { status: "delivered" });
        senders.forEach((s) =>
          io.to(String(s)).emit("messages:status", { by: uid, status: "delivered" })
        );
      }
    }

    socket.emit("users:online", [...online.keys()]);

    // ---- Message bhejna: direct (to) ya group (groupId); text / image / voice ----
    socket.on("message:send", async ({ to, groupId, text, replyTo, image, audio } = {}, ack) => {
      try {
        const clean = text?.trim();
        const img = cleanImage(image);
        const aud = cleanAudio(audio);
        if (!clean && !img && !aud) return ack?.({ error: "Invalid message" });
        if ((!to && !groupId) || (to && String(to) === uid)) return ack?.({ error: "Invalid message" });

        // Group ho to member hona zaroori
        let group = null;
        if (groupId) {
          group = await Group.findOne({ _id: groupId, "members.user": uid }).select("_id");
          if (!group) return ack?.({ error: "You are not a member of this group" });
        }

        // Reply sirf isi conversation ke message ka ho sakta hai
        let replyId = null;
        if (replyTo) {
          const original = await Message.findById(replyTo).select("sender receiver group");
          if (original) {
            const pair = [String(original.sender), String(original.receiver)];
            const sameChat = group
              ? String(original.group) === String(group._id)
              : !original.group && pair.includes(uid) && pair.includes(String(to));
            if (sameChat) replyId = original._id;
          }
        }

        const data = {
          sender: uid,
          text: clean || "",
          image: img || undefined,
          audio: aud || undefined,
          replyTo: replyId,
        };
        if (group) data.group = group._id;
        else {
          data.receiver = to;
          data.status = online.has(String(to)) ? "delivered" : "sent";
        }

        const message = await Message.create(data);
        const payload = await publish(message);

        if (group) {
          io.to(groupRoom(group._id)).emit("message:new", payload); // sender ke tabs ko bhi
        } else {
          io.to(String(to)).emit("message:new", payload);
          socket.to(uid).emit("message:new", payload); // sender ke dusre tabs
        }
        ack?.({ message: payload });
      } catch (err) {
        console.error(err);
        ack?.({ error: "Message failed" });
      }
    });

    // ---- Message edit (sirf apna) ----
    socket.on("message:edit", async ({ id, text } = {}, ack) => {
      try {
        const clean = text?.trim();
        if (!id || !clean) return ack?.({ error: "Invalid edit" });

        const m = await Message.findOne({ _id: id, sender: uid, deleted: { $ne: true } });
        if (!m) return ack?.({ error: "Not allowed" });

        if (m.text !== clean) {
          m.text = clean;
          m.edited = true;
          await m.save();
        }
        const payload = await publish(m);
        notify(io, m, "message:updated", payload);
        ack?.({ message: payload });
      } catch (err) {
        console.error(err);
        ack?.({ error: "Edit failed" });
      }
    });

    // ---- Message delete for everyone (sirf apna) ----
    socket.on("message:delete", async ({ id } = {}, ack) => {
      try {
        const m = await Message.findOne({ _id: id, sender: uid, deleted: { $ne: true } });
        if (!m) return ack?.({ error: "Not allowed" });

        m.deleted = true;
        m.text = "";
        m.reactions = [];
        m.set("image", undefined);
        m.set("audio", undefined);
        await m.save();

        const payload = await publish(m);
        notify(io, m, "message:updated", payload);
        ack?.({ message: payload });
      } catch (err) {
        console.error(err);
        ack?.({ error: "Delete failed" });
      }
    });

    // ---- Reaction toggle (har user ki ek reaction per message) ----
    socket.on("message:react", async ({ id, emoji } = {}, ack) => {
      try {
        if (!EMOJIS.includes(emoji)) return ack?.({ error: "Invalid emoji" });

        const m = await Message.findOne({ _id: id, deleted: { $ne: true } });
        if (!m) return ack?.({ error: "Not allowed" });

        // Direct chat ka hissa ho ya group ka member
        const allowed = m.group
          ? await Group.exists({ _id: m.group, "members.user": uid })
          : [String(m.sender), String(m.receiver)].includes(uid);
        if (!allowed) return ack?.({ error: "Not allowed" });

        const idx = m.reactions.findIndex((r) => String(r.user) === uid);
        if (idx > -1 && m.reactions[idx].emoji === emoji) m.reactions.splice(idx, 1); // same emoji = hata do
        else if (idx > -1) m.reactions[idx].emoji = emoji; // emoji badlo
        else m.reactions.push({ user: uid, emoji });
        await m.save();

        const payload = await publish(m);
        notify(io, m, "message:updated", payload);
        ack?.({ message: payload });
      } catch (err) {
        console.error(err);
        ack?.({ error: "Reaction failed" });
      }
    });

    // ---- Typing indicator (sirf direct chat) ----
    socket.on("typing", ({ to, isTyping } = {}) => {
      if (to) io.to(String(to)).emit("typing", { from: uid, isTyping: !!isTyping });
    });

    // ---- Chat khuli to messages "seen" mark karo (direct) ----
    socket.on("message:seen", async ({ from } = {}) => {
      if (!from) return;
      const res = await Message.updateMany(
        { sender: from, receiver: uid, status: { $ne: "seen" } },
        { status: "seen" }
      );
      if (res.modifiedCount)
        io.to(String(from)).emit("messages:status", { by: uid, status: "seen" });
    });

    // ---- Group khola: yahan tak padh liya (unread count ke liye) ----
    socket.on("group:read", async ({ groupId } = {}) => {
      try {
        if (!groupId || !(await Group.exists({ _id: groupId, "members.user": uid }))) return;
        await GroupRead.updateOne({ group: groupId, user: uid }, { at: new Date() }, { upsert: true });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", async () => {
      const left = (online.get(uid) || 1) - 1;
      if (left > 0) return online.set(uid, left);

      online.delete(uid);
      const lastSeen = new Date();
      await User.findByIdAndUpdate(uid, { isOnline: false, lastSeen });
      socket.broadcast.emit("user:status", { userId: uid, isOnline: false, lastSeen });
    });
  });

  return io;
};
