import { useState } from "react";
import { Search } from "lucide-react";
import Avatar from "./Avatar";

// Users ki checkbox list (group banane / members add karne ke liye)
export default function UserPicker({ users, selected, onToggle, emptyText = "No one to show." }) {
  const [q, setQ] = useState("");
  const list = users.filter((u) => (u.name || "").toLowerCase().includes(q.trim().toLowerCase()));

  if (users.length === 0)
    return <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>;

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people"
          className="input py-2.5 pl-10"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {list.map((u) => (
          <label
            key={u._id}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-mist dark:hover:bg-ink-700"
          >
            <input
              type="checkbox"
              checked={selected.has(u._id)}
              onChange={() => onToggle(u._id)}
              className="h-4 w-4 accent-brand-600"
            />
            <Avatar name={u.name} size="sm" />
            <span className="truncate text-sm font-medium">{u.name}</span>
          </label>
        ))}
        {list.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">No one matches.</p>
        )}
      </div>
    </div>
  );
}
