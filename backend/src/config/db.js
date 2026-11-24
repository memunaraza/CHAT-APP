import mongoose from "mongoose";
import User from "../models/User.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // Server restart hone par purane "online" flags reset karo
    await User.updateMany({}, { isOnline: false });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  }
};
