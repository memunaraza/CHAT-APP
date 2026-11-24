// Message ko client ke liye saaf karta hai (delete hua to text chhupa do)
export const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Reply wale message ki chhoti info saath bhejte hain
export const POPULATE_REPLY = { path: "replyTo", select: "text sender deleted image audio" };

export const toClient = (m) => {
  const o = JSON.parse(JSON.stringify(m)); // ObjectId -> string, plain JSON
  if (o.deleted) {
    o.text = "";
    o.reactions = [];
    delete o.image;
    delete o.audio;
  }
  if (o.replyTo && typeof o.replyTo === "object" && o.replyTo.deleted) o.replyTo.text = "";
  return o;
};

// Client se aaya image sirf tab maano jab wo hamare Cloudinary account ka ho
export const cleanImage = (img) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || typeof img?.url !== "string") return null;
  if (!img.url.startsWith(`https://res.cloudinary.com/${cloud}/`)) return null;
  return {
    url: img.url,
    width: Number(img.width) || undefined,
    height: Number(img.height) || undefined,
  };
};

// Voice message ka URL bhi sirf hamare Cloudinary account ka hona chahiye
export const cleanAudio = (aud) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || typeof aud?.url !== "string") return null;
  if (!aud.url.startsWith(`https://res.cloudinary.com/${cloud}/`)) return null;
  const duration = Math.min(Math.max(Math.round(Number(aud.duration)) || 0, 0), 600);
  return { url: aud.url, duration };
};
