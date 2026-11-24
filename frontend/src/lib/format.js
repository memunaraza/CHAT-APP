export const timeOf = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const dayLabel = (d) => {
  const date = new Date(d);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

export const lastSeenText = (d) => {
  if (!d) return "Offline";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Last seen just now";
  if (mins < 60) return `Last seen ${mins} min ago`;
  const date = new Date(d);
  const label = dayLabel(d);
  return label === "Today"
    ? `Last seen today at ${timeOf(d)}`
    : `Last seen ${label.toLowerCase() === "yesterday" ? "yesterday" : date.toLocaleDateString()} at ${timeOf(d)}`;
};

// Cloudinary image ko chhota aur fast banane ke liye (f_auto,q_auto)
export const optimizeImage = (url = "") =>
  url.includes("/upload/") ? url.replace("/upload/", "/upload/f_auto,q_auto/") : url;

// Sidebar / reply quote mein dikhane wala chhota text
export const previewOf = (m) =>
  m.deleted
    ? "Message deleted"
    : m.text || (m.image?.url ? "📷 Photo" : m.audio?.url ? "🎤 Voice message" : "");

// Seconds ko m:ss mein badlo (voice message ke liye)
export const formatDuration = (sec = 0) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
