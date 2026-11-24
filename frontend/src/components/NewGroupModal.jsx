import { useState } from "react";
import Modal from "./Modal";
import UserPicker from "./UserPicker";

export default function NewGroupModal({ users, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give your group a name");
    if (selected.size === 0) return setError("Select at least one member");
    setBusy(true);
    setError("");
    try {
      await onCreate(name.trim(), [...selected]); // kamyab hone par parent modal band kar deta hai
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the group");
      setBusy(false);
    }
  };

  return (
    <Modal title="New group" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="group-name" className="mb-1.5 block text-sm font-semibold">
            Group name
          </label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Weekend plans"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold">
            Members <span className="font-normal text-slate-500">({selected.size} selected)</span>
          </p>
          <UserPicker
            users={users}
            selected={selected}
            onToggle={toggle}
            emptyText="No one else has joined yet, so there is nobody to add."
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button className="btn-primary" disabled={busy}>
          {busy ? "Creating..." : "Create group"}
        </button>
      </form>
    </Modal>
  );
}
