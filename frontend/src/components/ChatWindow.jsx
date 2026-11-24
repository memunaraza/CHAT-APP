import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Ban, Check, CheckCheck, ChevronDown, ImagePlus, Info, Loader2, Mic, Pause,
  Pencil, Play, Reply, SendHorizonal, Trash2, X,
} from "lucide-react";
import Avatar from "./Avatar";
import useVoiceRecorder from "../hooks/useVoiceRecorder";
import {
  dayLabel, formatDuration, lastSeenText, optimizeImage, previewOf, timeOf,
} from "../lib/format";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MAX_IMAGE_MB = 5;
const MAX_VOICE_SECONDS = 300;

// Reactions ko emoji ke hisaab se group karo: [{emoji, count, mine}]
const groupReactions = (list = [], myId) => {
  const map = new Map();
  list.forEach((r) => {
    const g = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
    g.count += 1;
    if (r.user === myId) g.mine = true;
    map.set(r.emoji, g);
  });
  return [...map.values()];
};

// Group mein har member ke naam ka alag rang
const NAME_COLORS = [
  "text-brand-600 dark:text-brand-300",
  "text-sky-700 dark:text-sky-300",
  "text-violet-700 dark:text-violet-300",
  "text-rose-700 dark:text-rose-300",
  "text-amber-700 dark:text-amber-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-fuchsia-700 dark:text-fuchsia-300",
  "text-orange-700 dark:text-orange-300",
];
const nameColor = (id = "") =>
  NAME_COLORS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % NAME_COLORS.length];

const jumpTo = (id) =>
  document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

function Ticks({ status }) {
  if (status === "sent") return <Check size={14} className="text-sun-ink/50" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-sun-ink/50" />;
  return <CheckCheck size={14} className="text-brand-700" />;
}

function Lightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={20} />
      </button>
      <img
        src={optimizeImage(url)}
        alt="Shared photo"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

// Voice message ka player: play/pause, progress bar (click karke aage peeche)
function AudioPlayer({ audio, mine }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration || 0);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  };

  const seek = (e) => {
    const el = ref.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * duration;
  };

  const progress = duration ? Math.min(time / duration, 1) : 0;

  return (
    <div className="flex w-56 max-w-full items-center gap-2.5 md:w-64">
      <audio
        ref={ref}
        src={audio.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
          mine ? "bg-sun-ink text-sun-500" : "bg-brand-600 text-white hover:bg-brand-700"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          onClick={seek}
          className={`h-1.5 cursor-pointer overflow-hidden rounded-full ${
            mine ? "bg-sun-ink/20" : "bg-slate-200 dark:bg-ink-600"
          }`}
        >
          <div
            className={`h-full rounded-full ${mine ? "bg-sun-ink" : "bg-brand-600"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className={`mt-1 text-[11px] ${mine ? "text-sun-ink/70" : "text-slate-400"}`}>
          {formatDuration(playing || time > 0 ? time : duration)}
        </p>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition hover:bg-mist dark:hover:bg-ink-600 ${
        danger ? "text-red-600 dark:text-red-400" : ""
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}

function Bubble({
  message, mine, me, first, isGroup, nameOf, onReply, onEdit, onDelete, onReact, onOpenImage,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Menu ke bahar click karne par band ho jaye
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const deleted = !!message.deleted;
  const image = message.image?.url ? message.image : null;
  const audio = message.audio?.url ? message.audio : null;
  const reply = message.replyTo && typeof message.replyTo === "object" ? message.replyTo : null;
  const reactions = groupReactions(message.reactions, me._id);

  const pick = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div
      id={`msg-${message._id}`}
      className={`group flex ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2.5" : ""}`}
    >
      <div
        ref={wrapRef}
        className={`relative flex max-w-[85%] flex-col md:max-w-[70%] ${mine ? "items-end" : "items-start"}`}
      >
        <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
          <div
            className={`min-w-0 rounded-2xl px-3.5 py-2 text-[15px] ${
              mine
                ? "rounded-br-sm bg-sun-500 text-sun-ink"
                : "rounded-bl-sm border border-slate-200/80 bg-white shadow-sm dark:border-ink-600 dark:bg-ink-700"
            }`}
          >
            {isGroup && !mine && (
              <p className={`mb-0.5 text-xs font-bold ${nameColor(message.sender)}`}>
                {nameOf(message.sender)}
              </p>
            )}

            {reply && !deleted && (
              <button
                type="button"
                onClick={() => jumpTo(reply._id)}
                className={`mb-1.5 block w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs ${
                  mine
                    ? "border-sun-ink/50 bg-sun-ink/10"
                    : "border-brand-500 bg-brand-50 dark:bg-ink-800"
                }`}
              >
                <span className="block font-semibold">{nameOf(reply.sender)}</span>
                <span className="line-clamp-2 opacity-80">{previewOf(reply)}</span>
              </button>
            )}

            {image && !deleted && (
              <button
                type="button"
                onClick={() => onOpenImage(image.url)}
                aria-label="Open photo"
                className="mb-1.5 block w-60 max-w-full overflow-hidden rounded-xl bg-black/5 md:w-72"
              >
                <img
                  src={optimizeImage(image.url)}
                  alt="Shared photo"
                  loading="lazy"
                  style={{
                    aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : undefined,
                  }}
                  className="max-h-80 w-full object-cover"
                />
              </button>
            )}

            {audio && !deleted && <AudioPlayer audio={audio} mine={mine} />}

            {deleted ? (
              <p className="flex items-center gap-1.5 italic opacity-70">
                <Ban size={14} /> This message was deleted
              </p>
            ) : (
              message.text && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
              )
            )}

            <div
              className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${
                mine ? "text-sun-ink/60" : "text-slate-400"
              }`}
            >
              {message.edited && !deleted && <span>edited</span>}
              {timeOf(message.createdAt)}
              {mine && <Ticks status={isGroup ? "sent" : message.status} />}
            </div>
          </div>

          {!deleted && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Message options"
              className={`icon-btn h-7 w-7 shrink-0 transition focus-visible:opacity-100 md:group-hover:opacity-100 ${
                open ? "opacity-100" : "md:opacity-0"
              }`}
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>

        {reactions.length > 0 && (
          <div className="-mt-1.5 flex flex-wrap gap-1 px-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(message._id, r.emoji)}
                className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs shadow-sm transition ${
                  r.mine
                    ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900 dark:text-brand-100"
                    : "border-slate-200 bg-white dark:border-ink-600 dark:bg-ink-700"
                }`}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="font-semibold">{r.count}</span>}
              </button>
            ))}
          </div>
        )}

        {open && (
          <div
            className={`absolute top-full z-20 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-ink-600 dark:bg-ink-700 ${
              mine ? "right-0" : "left-0"
            }`}
          >
            <div className="flex justify-between px-1 pb-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={pick(() => onReact(message._id, e))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:scale-110 hover:bg-mist dark:hover:bg-ink-600"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-1 dark:border-ink-600">
              <MenuItem icon={Reply} label="Reply" onClick={pick(() => onReply(message))} />
              {mine && !image && !audio && (
                <MenuItem icon={Pencil} label="Edit" onClick={pick(() => onEdit(message))} />
              )}
              {mine && (
                <MenuItem
                  icon={Trash2}
                  label="Delete for everyone"
                  danger
                  onClick={pick(() => {
                    if (window.confirm("Delete this message for everyone?")) onDelete(message._id);
                  })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="chat-bg flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 h-24 w-36">
        <div className="absolute left-0 top-0 flex h-14 w-24 items-center justify-center rounded-2xl rounded-bl-sm border border-slate-200 bg-white shadow-sm dark:border-ink-600 dark:bg-ink-700">
          <span className="flex gap-1">
            <i className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <i className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <i className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          </span>
        </div>
        <div className="absolute bottom-0 right-0 h-14 w-24 rounded-2xl rounded-br-sm bg-sun-500" />
      </div>
      <h2 className="font-display text-2xl font-bold tracking-tight">Pick a conversation</h2>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        Choose someone from the list to read your messages or start a new chat.
      </p>
    </div>
  );
}

export default function ChatWindow({
  me, user, group, messages, typing, loading,
  onSend, onEdit, onDelete, onReact, onUploadImage, onUploadAudio, onTyping, onBack, onOpenInfo,
}) {
  const isGroup = !!group;
  const entity = group || user;

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // jis message ka jawab de rahe hain
  const [editing, setEditing] = useState(null); // jo message edit ho raha hai
  const [attachment, setAttachment] = useState(null); // {file, url} bhejne se pehle ki photo
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);

  // Record khatam hote hi voice message upload karke bhej do
  const sendVoice = async ({ blob, duration }) => {
    setUploading(true);
    setProgress(0);
    setUploadError("");
    try {
      const result = await onUploadAudio(blob, setProgress);
      onSend("", replyTo?._id, null, { url: result.url, duration: result.duration || duration });
      setReplyTo(null);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Voice message failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const recorder = useVoiceRecorder({ maxSeconds: MAX_VOICE_SECONDS, onDone: sendVoice });

  // Sirf naya message aane par neeche scroll karo (reaction/edit par nahi)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing, entity?._id]);

  // Chat badalne par composer reset
  useEffect(() => {
    setText("");
    setReplyTo(null);
    setEditing(null);
    setUploadError("");
    recorder.cancel();
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity?._id]);

  if (!entity) return <EmptyState />;

  // id se naam: apna = "You", group mein members ki list se
  const names = {};
  if (isGroup) group.members.forEach((m) => (names[m._id] = m.name));
  else names[user._id] = user.name;
  const nameOf = (id) => (id === me._id ? "You" : names[id] || "Former member");

  const startReply = (m) => {
    if (editing) setText("");
    setEditing(null);
    setReplyTo(m);
    inputRef.current?.focus();
  };

  const startEdit = (m) => {
    setReplyTo(null);
    clearAttachment();
    setEditing(m);
    setText(m.text);
    inputRef.current?.focus();
  };

  const cancelBar = () => {
    if (editing) setText("");
    setEditing(null);
    setReplyTo(null);
  };

  const clearAttachment = () => {
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setUploadError("");
  };

  // Photo select / paste: type aur size check
  const pickFile = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type))
      return setUploadError("Only JPG, PNG, WEBP or GIF images are allowed");
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return setUploadError(`Image must be under ${MAX_IMAGE_MB} MB`);

    setUploadError("");
    setEditing(null);
    setAttachment((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    setUploadError("");
    try {
      await recorder.start();
    } catch (err) {
      setUploadError(
        err.name === "NotAllowedError"
          ? "Microphone access is blocked. Allow it in your browser's site settings."
          : err.message || "Could not start recording"
      );
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (isGroup) return; // typing indicator sirf direct chat mein
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (uploading) return;
    const value = text.trim();

    if (editing) {
      if (value && value !== editing.text) onEdit(editing._id, value);
      setEditing(null);
      setText("");
      return;
    }
    if (!value && !attachment) return;

    // Photo ho to pehle Cloudinary par upload karo
    let image = null;
    if (attachment) {
      setUploading(true);
      setProgress(0);
      setUploadError("");
      try {
        image = await onUploadImage(attachment.file, setProgress);
      } catch (err) {
        setUploadError(err.response?.data?.message || "Upload failed. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
      clearAttachment();
    }

    onSend(value, replyTo?._id, image, null);
    setReplyTo(null);
    setText("");
    clearTimeout(typingTimer.current);
    if (!isGroup) onTyping(false);
  };

  // Messages ko din ke hisaab se group karo
  const dayGroups = [];
  messages.forEach((m) => {
    const label = dayLabel(m.createdAt);
    if (!dayGroups.length || dayGroups[dayGroups.length - 1].label !== label)
      dayGroups.push({ label, items: [] });
    dayGroups[dayGroups.length - 1].items.push(m);
  });

  const bar = editing || replyTo;
  const showSend = !!editing || !!text.trim() || !!attachment || uploading;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 dark:border-ink-600 dark:bg-ink-800 md:px-6">
        <button onClick={onBack} className="icon-btn md:hidden" aria-label="Back to chats">
          <ArrowLeft size={20} />
        </button>
        {isGroup ? (
          <button
            onClick={onOpenInfo}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Open group info"
          >
            <Avatar name={group.name} group size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">{group.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {group.members
                  .map((m) => (m._id === me._id ? "You" : (m.name || "").split(" ")[0]))
                  .join(", ")}
              </p>
            </div>
          </button>
        ) : (
          <>
            <Avatar name={user.name} online={user.isOnline} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">{user.name}</p>
              <p
                className={`truncate text-xs ${
                  typing || user.isOnline
                    ? "font-medium text-brand-600 dark:text-brand-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {typing ? "typing..." : user.isOnline ? "Online" : lastSeenText(user.lastSeen)}
              </p>
            </div>
          </>
        )}
        {isGroup && (
          <button onClick={onOpenInfo} className="icon-btn" aria-label="Group info" title="Group info">
            <Info size={20} />
          </button>
        )}
      </header>

      <div className="chat-bg flex-1 overflow-y-auto px-3 py-4 md:px-8">
        {loading && <p className="py-10 text-center text-sm text-slate-400">Loading messages...</p>}

        {!loading && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {isGroup
              ? "No messages yet. Say something to the group."
              : `No messages yet. Send the first one to ${user.name.split(" ")[0]}.`}
          </p>
        )}

        <div className="mx-auto flex max-w-3xl flex-col gap-0.5">
          {dayGroups.map((g) => (
            <div key={g.label} className="flex flex-col gap-0.5">
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:bg-ink-700 dark:text-slate-300">
                  {g.label}
                </span>
              </div>
              {g.items.map((m, i) => (
                <Bubble
                  key={m._id}
                  first={i === 0 || g.items[i - 1].sender !== m.sender}
                  message={m}
                  mine={m.sender === me._id}
                  me={me}
                  isGroup={isGroup}
                  nameOf={nameOf}
                  onReply={startReply}
                  onEdit={startEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onOpenImage={setLightbox}
                />
              ))}
            </div>
          ))}

          {typing && !isGroup && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-ink-600 dark:bg-ink-700">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={submit}
        className="border-t border-slate-200 bg-white p-3 dark:border-ink-600 dark:bg-ink-800 md:px-6"
      >
        {bar && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-xl border-l-4 border-brand-500 bg-brand-50 px-3 py-2 text-sm dark:bg-ink-900">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-700 dark:text-brand-300">
                {editing
                  ? "Editing message"
                  : `Replying to ${replyTo.sender === me._id ? "yourself" : nameOf(replyTo.sender)}`}
              </p>
              <p className="truncate text-slate-500 dark:text-slate-400">{previewOf(bar)}</p>
            </div>
            <button type="button" onClick={cancelBar} className="icon-btn" aria-label="Cancel">
              <X size={16} />
            </button>
          </div>
        )}

        {attachment && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-xl border border-slate-200 bg-mist p-2 dark:border-ink-600 dark:bg-ink-900">
            <img src={attachment.url} alt="Selected photo" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{attachment.file.name}</p>
              {uploading ? (
                <div className="mt-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-ink-600">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Uploading {progress}%</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(attachment.file.size / 1024 / 1024).toFixed(2)} MB. Add a caption if you like.
                </p>
              )}
            </div>
            {!uploading && (
              <button type="button" onClick={clearAttachment} className="icon-btn" aria-label="Remove photo">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {uploading && !attachment && (
          <p className="mx-auto mb-2 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
            Sending voice message... {progress}%
          </p>
        )}

        {uploadError && (
          <p role="alert" className="mx-auto mb-2 max-w-3xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {uploadError}
          </p>
        )}

        {recorder.recording ? (
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-1.5 dark:border-red-900/50 dark:bg-red-950/30">
            <button
              type="button"
              onClick={recorder.cancel}
              className="icon-btn h-10 w-10 shrink-0"
              aria-label="Cancel recording"
              title="Cancel"
            >
              <Trash2 size={20} />
            </button>
            <div className="flex flex-1 items-center gap-2.5 text-sm font-semibold text-red-700 dark:text-red-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {formatDuration(recorder.seconds)}
              <span className="font-normal opacity-70">Recording</span>
            </div>
            <button
              type="button"
              onClick={recorder.stop}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-500 text-sun-ink transition hover:bg-sun-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-500/40"
              aria-label="Send voice message"
              title="Send"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl items-center gap-1.5 rounded-2xl border border-slate-200 bg-mist p-1.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-ink-600 dark:bg-ink-900">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = ""; // wahi file dobara chunne ke liye
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!!editing || uploading}
              className="icon-btn h-10 w-10 shrink-0 disabled:opacity-40"
              aria-label="Attach photo"
              title="Attach photo"
            >
              <ImagePlus size={20} />
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={handleChange}
              onKeyDown={(e) => e.key === "Escape" && cancelBar()}
              onPaste={(e) => {
                const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
                if (file && !editing) {
                  e.preventDefault();
                  pickFile(file);
                }
              }}
              placeholder={editing ? "Edit your message" : attachment ? "Add a caption" : "Write a message"}
              className="w-full bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-slate-400"
              autoFocus
            />
            {showSend ? (
              <button
                type="submit"
                disabled={uploading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-500 text-sun-ink transition hover:bg-sun-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-500/40 disabled:opacity-60"
                aria-label={editing ? "Save edit" : "Send message"}
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : editing ? (
                  <Check size={18} />
                ) : (
                  <SendHorizonal size={18} />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
                aria-label="Record voice message"
                title="Record voice message"
              >
                <Mic size={18} />
              </button>
            )}
          </div>
        )}
      </form>

      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
