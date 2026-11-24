import { useEffect, useState } from "react";
import { LogOut, X } from "lucide-react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import UserPicker from "./UserPicker";

export default function GroupInfoModal({ group, me, users, onClose, onRename, onAdd, onRemove }) {
  const isAdmin = group.admin === me._id;
  const [name, setName] = useState(group.name);
  const [adding, setAdding] = useState(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(group.name), [group.name]);

  const memberIds = new Set(group.members.map((m) => m._id));
  const candidates = users.filter((u) => !memberIds.has(u._id));

  const toggle = (id) =>
    setAdding((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Har action ke liye common busy/error handling
  const run = async (fn) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Group info" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar name={group.name} group size="lg" />
          {isAdmin ? (
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim() && name.trim() !== group.name) run(() => onRename(group._id, name.trim()));
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                aria-label="Group name"
                className="input py-2"
              />
              <button
                className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                disabled={busy || !name.trim() || name.trim() === group.name}
              >
                Save
              </button>
            </form>
          ) : (
            <p className="font-display text-lg font-bold">{group.name}</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">
            {group.members.length} member{group.members.length === 1 ? "" : "s"}
          </p>
          <ul>
            {group.members.map((m) => (
              <li key={m._id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <Avatar name={m.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m._id === me._id ? "You" : m.name}
                </span>
                {m._id === group.admin && (
                  <span className="rounded-full bg-sun-500/25 px-2 py-0.5 text-xs font-semibold text-sun-ink dark:bg-sun-500/20 dark:text-sun-300">
                    Admin
                  </span>
                )}
                {isAdmin && m._id !== me._id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${m.name} from this group?`)) run(() => onRemove(group._id, m._id));
                    }}
                    className="icon-btn h-8 w-8"
                    aria-label={`Remove ${m.name}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && candidates.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold">Add people</p>
            <UserPicker users={candidates} selected={adding} onToggle={toggle} />
            <button
              type="button"
              disabled={busy || adding.size === 0}
              onClick={() =>
                run(async () => {
                  await onAdd(group._id, [...adding]);
                  setAdding(new Set());
                })
              }
              className="btn-primary mt-3"
            >
              Add {adding.size > 0 ? `${adding.size} ` : ""}to group
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Leave this group?")) run(() => onRemove(group._id, me._id));
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <LogOut size={16} /> Leave group
        </button>
      </div>
    </Modal>
  );
}
