import { useMemo, useState } from "react";
import { LogOut, MessageSquare, Plus, Search } from "lucide-react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import PalettePicker from "./PalettePicker";
import ThemeToggle from "./ThemeToggle";
import { previewOf, timeOf } from "../lib/format";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];

function ChatRow({ avatar, title, time, preview, highlight, unread, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 px-5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
        active ? "bg-brand-50 dark:bg-ink-700" : "hover:bg-mist dark:hover:bg-ink-700/60"
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" />}
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-[15px] font-semibold">{title}</p>
          {time && (
            <span className={`shrink-0 text-xs ${unread > 0 ? "font-semibold text-brand-600 dark:text-brand-300" : "text-slate-400"}`}>
              {time}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              highlight ? "font-semibold text-brand-600 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {preview}
          </p>
          {unread > 0 && (
            <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

const lastTime = (x) => (x.lastMessage ? new Date(x.lastMessage.createdAt).getTime() : 0);
const byRecent = (a, b) => lastTime(b) - lastTime(a) || (a.name || "").localeCompare(b.name || "");

export default function Sidebar({ me, users, groups, activeId, typing, onSelect, onLogout, onNewGroup }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // People aur groups ek hi list mein, latest message upar
  const chats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [
      ...users.map((u) => ({ ...u, kind: "user" })),
      ...groups.map((g) => ({ ...g, kind: "group" })),
    ]
      .filter((c) => (filter === "groups" ? c.kind === "group" : filter === "unread" ? c.unread > 0 : true))
      .filter((c) => !q || (c.name || "").toLowerCase().includes(q))
      .sort(byRecent);
  }, [users, groups, query, filter]);

  const unreadTotal = [...users, ...groups].reduce((n, x) => n + (x.unread || 0), 0);
  const total = users.length + groups.length;

  const emptyText = query.trim()
    ? "No conversations match your search."
    : filter === "unread"
    ? "You are all caught up."
    : filter === "groups"
    ? "You are not in any group yet."
    : "No one else has joined yet. Create a second account in another browser to start a chat.";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Logo className="text-brand-800 dark:text-white" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <PalettePicker />
          <button
            onClick={onNewGroup}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
            aria-label="New group"
            title="New group"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="input rounded-2xl bg-mist py-2.5 pl-10 dark:bg-ink-900"
          />
        </div>
      </div>

      <div className="flex gap-2 px-5 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              filter === f.id
                ? "bg-brand-600 text-white"
                : "bg-mist text-slate-600 hover:bg-slate-200 dark:bg-ink-900 dark:text-slate-300 dark:hover:bg-ink-700"
            }`}
          >
            {f.label}
            {f.id === "unread" && unreadTotal > 0 && <span className="ml-1.5 opacity-80">{unreadTotal}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto border-t border-slate-100 pb-2 dark:border-ink-700">
        {chats.length === 0 && (
          <div className="mx-6 mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-50" />
            {emptyText}
            {filter === "groups" && !query.trim() && (
              <button
                onClick={onNewGroup}
                className="mt-3 block w-full rounded-xl border border-slate-200 py-2 font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-ink-600 dark:text-brand-300 dark:hover:bg-ink-700"
              >
                Create a group
              </button>
            )}
          </div>
        )}

        {chats.map((c) => {
          const last = c.lastMessage;
          const active = c._id === activeId;

          if (c.kind === "group") {
            const who = last
              ? last.sender === me._id
                ? "You"
                : c.members.find((m) => m._id === last.sender)?.name?.split(" ")[0] || "Someone"
              : "";
            return (
              <ChatRow
                key={c._id}
                avatar={<Avatar name={c.name} group />}
                title={c.name}
                time={last && timeOf(last.createdAt)}
                preview={last ? `${who}: ${previewOf(last)}` : `${c.members.length} members`}
                unread={c.unread}
                active={active}
                onClick={() => onSelect(c._id)}
              />
            );
          }

          const isTyping = typing[c._id];
          return (
            <ChatRow
              key={c._id}
              avatar={<Avatar name={c.name} online={c.isOnline} />}
              title={c.name}
              time={last && timeOf(last.createdAt)}
              highlight={isTyping}
              preview={
                isTyping
                  ? "typing..."
                  : last
                  ? `${last.sender === me._id && !last.deleted ? "You: " : ""}${previewOf(last)}`
                  : "Say hello"
              }
              unread={c.unread}
              active={active}
              onClick={() => onSelect(c._id)}
            />
          );
        })}
        {total > 0 && <div className="h-2" />}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-ink-600">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={me.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{me.email}</p>
          </div>
        </div>
        <button onClick={onLogout} className="icon-btn" aria-label="Log out" title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
