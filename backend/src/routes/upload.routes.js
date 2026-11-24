import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/auth.js";
import { uploadAudio, uploadImage } from "../controllers/upload.controller.js";

// File memory mein rakhte hain (disk par nahi)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // "audio/webm;codecs=opus" jaisi types bhi chalti hain
    if (/^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported audio format"));
  },
});

// multer ke errors ko saaf JSON message mein badalta hai
const handle = (middleware, tooBigMessage) => (req, res, next) =>
  middleware(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? tooBigMessage : err.message });
  });

const router = Router();
router.post("/", protect, handle(imageUpload.single("image"), "Image must be under 5 MB"), uploadImage);
router.post("/audio", protect, handle(audioUpload.single("audio"), "Voice message is too large"), uploadAudio);

export default router;
