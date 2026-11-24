import { v2 as cloudinary } from "cloudinary";

const isConfigured = () =>
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const configure = () =>
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (err, result) => (err ? reject(err) : resolve(result)))
      .end(buffer);
  });

// Image Cloudinary par upload karke uska URL wapas deta hai
export const uploadImage = async (req, res) => {
  try {
    if (!isConfigured())
      return res.status(500).json({ message: "Image upload is not configured on the server" });
    if (!req.file) return res.status(400).json({ message: "No image provided" });
    configure();

    const result = await streamUpload(req.file.buffer, {
      folder: "chatly",
      resource_type: "image",
      // Bohot bari photo ho to 1600px tak chhoti kar do
      transformation: [{ width: 1600, height: 1600, crop: "limit" }],
    });

    res.status(201).json({
      image: { url: result.secure_url, width: result.width, height: result.height },
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err.message);
    res.status(500).json({ message: "Upload failed. Check Cloudinary settings." });
  }
};

// Voice message: Cloudinary audio ko "video" resource type mein rakhta hai
export const uploadAudio = async (req, res) => {
  try {
    if (!isConfigured())
      return res.status(500).json({ message: "Upload is not configured on the server" });
    if (!req.file) return res.status(400).json({ message: "No audio provided" });
    configure();

    const result = await streamUpload(req.file.buffer, {
      folder: "chatly/voice",
      resource_type: "video",
    });

    res.status(201).json({
      audio: { url: result.secure_url, duration: Math.round(result.duration || 0) },
    });
  } catch (err) {
    console.error("Cloudinary audio upload error:", err.message);
    res.status(500).json({ message: "Voice upload failed. Check Cloudinary settings." });
  }
};
