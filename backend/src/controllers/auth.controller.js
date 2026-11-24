import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const userResponse = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  avatar: u.avatar,
  bio: u.bio || "",
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "This email is already registered" });

    const user = await User.create({ name, email, password });
    res.status(201).json({ user: userResponse(user), token: signToken(user._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Incorrect email or password" });

    res.json({ user: userResponse(user), token: signToken(user._id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMe = (req, res) => res.json({ user: userResponse(req.user) });
