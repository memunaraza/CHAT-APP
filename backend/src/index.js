import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import groupRoutes from "./routes/group.routes.js";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/", (req, res) => res.send("Chat API running"));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/groups", groupRoutes);

const io = initSocket(server);
app.set("io", io); // controllers se realtime event bhejne ke liye

connectDB().then(() => {
  server.listen(process.env.PORT, () =>
    console.log(`Server running on http://localhost:${process.env.PORT}`)
  );
});
