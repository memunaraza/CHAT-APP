import { Users } from "lucide-react";

const COLORS = [
  "bg-brand-700", "bg-sky-700", "bg-emerald-700", "bg-amber-700",
  "bg-rose-700", "bg-violet-700", "bg-teal-700", "bg-orange-700",
];

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const colorFor = (name = "") =>
  COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];

export default function Avatar({ name, online, size = "md", group = false }) {
  const dims = size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-8 w-8 text-xs" : "h-12 w-12 text-sm";
  return (
    <div className="relative shrink-0">
      <div
        className={`${dims} ${colorFor(name)} flex items-center justify-center rounded-[14px] font-display font-bold text-white`}
      >
        {group ? <Users size={size === "sm" ? 15 : 20} /> : initials(name)}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-white dark:border-ink-800 ${
            online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          title={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
