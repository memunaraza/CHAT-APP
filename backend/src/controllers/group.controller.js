import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupRead from "../models/GroupRead.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getIO } from "../utils/io.js";
import { toClient } from "../utils/message.js";

const MEMBER_FIELDS = "name email avatar";
const room = (groupId) => `g:${groupId}`;

const loadGroup = (id) => Group.findById(id).populate("members.user", MEMBER_FIELDS);

const memberId = (m) => String(m.user?._id || m.user);
const isMember = (g, uid) => g.members.some((m) => memberId(m) === String(uid));

// Client ko jo format bhejna hai
const serialize = (g) => ({
  _id: String(g._id),
  name: g.name,
  admin: String(g.admin),
  members: g.members
    .filter((m) => m.user && m.user._id)
    .map((m) => ({
      _id: String(m.user._id),
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
    })),
});

// Sab members ke tabs ko batao ke group badla
const emitUpdated = (g) => {
  const io = getIO();
  const payload = serialize(g);
  g.members.forEach((m) => io.to(memberId(m)).emit("group:updated", payload));
};

const joinRoom = (userId, groupId) => getIO().in(String(userId)).socketsJoin(room(groupId));

const validName = (name) => {
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean) return { error: "Group name is required" };
  if (clean.length > 60) return { error: "Group name is too long (max 60 characters)" };
  return { clean };
};

const validIds = (ids, exclude = []) =>
  [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(
    (id) => mongoose.isValidObjectId(id) && !exclude.includes(id)
  );

// ---- Mere saare groups (last message + unread ke saath) ----
export const getMyGroups = async (req, res) => {
  try {
    const me = String(req.user._id);
    const groups = await Group.find({ "members.user": req.user._id }).populate("members.user", MEMBER_FIELDS);

    const result = await Promise.all(
      groups.map(async (g) => {
        const mine = g.members.find((m) => memberId(m) === me);
        const joinedAt = mine?.joinedAt || g.createdAt;
        const read = await GroupRead.findOne({ group: g._id, user: me }).lean();
        const baseline = read && read.at > joinedAt ? read.at : joinedAt;

        const [last, unread] = await Promise.all([
          Message.findOne({ group: g._id, createdAt: { $gte: joinedAt } }).sort({ createdAt: -1 }).lean(),
          Message.countDocuments({ group: g._id, sender: { $ne: req.user._id }, createdAt: { $gt: baseline } }),
        ]);
        return { ...serialize(g), lastMessage: last ? toClient(last) : null, unread };
      })
    );
    res.json({ groups: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---- Naya group ----
export const createGroup = async (req, res) => {
  try {
    const { clean, error } = validName(req.body.name);
    if (error) return res.status(400).json({ message: error });

    const ids = validIds(req.body.memberIds, [String(req.user._id)]);
    const found = await User.find({ _id: { $in: ids } }).select("_id");
    if (!found.length) return res.status(400).json({ message: "Select at least one member" });

    const group = await Group.create({
      name: clean,
      admin: req.user._id,
      members: [req.user._id, ...found.map((u) => u._id)].map((user) => ({ user })),
    });

    const full = await loadGroup(group._id);
    full.members.forEach((m) => joinRoom(memberId(m), group._id));
    emitUpdated(full);

    res.status(201).json({ group: { ...serialize(full), lastMessage: null, unread: 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---- Group ka naam badalna (sirf admin) ----
export const renameGroup = async (req, res) => {
  try {
    const group = await loadGroup(req.params.id);
    if (!group || !isMember(group, req.user._id)) return res.status(404).json({ message: "Group not found" });
    if (String(group.admin) !== String(req.user._id))
      return res.status(403).json({ message: "Only the admin can rename the group" });

    const { clean, error } = validName(req.body.name);
    if (error) return res.status(400).json({ message: error });

    group.name = clean;
    await group.save();
    emitUpdated(group);
    res.json({ group: serialize(group) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---- Members add karna (sirf admin) ----
export const addMembers = async (req, res) => {
  try {
    const group = await loadGroup(req.params.id);
    if (!group || !isMember(group, req.user._id)) return res.status(404).json({ message: "Group not found" });
    if (String(group.admin) !== String(req.user._id))
      return res.status(403).json({ message: "Only the admin can add members" });

    const existing = group.members.map(memberId);
    const ids = validIds(req.body.userIds, existing);
    const found = await User.find({ _id: { $in: ids } }).select("_id");
    if (!found.length) return res.status(400).json({ message: "No new members to add" });

    await Group.updateOne(
      { _id: group._id },
      { $push: { members: { $each: found.map((u) => ({ user: u._id })) } } }
    );

    const full = await loadGroup(group._id);
    found.forEach((u) => joinRoom(u._id, group._id));
    emitUpdated(full);
    res.json({ group: serialize(full) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---- Member hatana (admin) ya khud group chhodna (koi bhi member) ----
export const removeMember = async (req, res) => {
  try {
    const me = String(req.user._id);
    const target = String(req.params.userId);
    const group = await loadGroup(req.params.id);

    if (!group || !isMember(group, me)) return res.status(404).json({ message: "Group not found" });
    if (target !== me && String(group.admin) !== me)
      return res.status(403).json({ message: "Only the admin can remove members" });
    if (!isMember(group, target)) return res.status(404).json({ message: "Member not found" });

    const io = getIO();
    const remaining = group.members.filter((m) => memberId(m) !== target);

    // Aakhri member nikla to group aur uske messages khatam
    if (remaining.length === 0) {
      await Promise.all([
        Group.deleteOne({ _id: group._id }),
        Message.deleteMany({ group: group._id }),
        GroupRead.deleteMany({ group: group._id }),
      ]);
      io.in(target).socketsLeave(room(group._id));
      io.to(target).emit("group:removed", { groupId: String(group._id) });
      return res.json({ ok: true });
    }

    const update = { $pull: { members: { user: target } } };
    // Admin chala gaya to sab se purane member ko admin bana do
    if (String(group.admin) === target) {
      const oldest = [...remaining].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))[0];
      update.$set = { admin: memberId(oldest) };
    }
    await Group.updateOne({ _id: group._id }, update);
    await GroupRead.deleteOne({ group: group._id, user: target });

    io.in(target).socketsLeave(room(group._id));
    io.to(target).emit("group:removed", { groupId: String(group._id) });

    const full = await loadGroup(group._id);
    emitUpdated(full);
    res.json(target === me ? { ok: true } : { group: serialize(full) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
