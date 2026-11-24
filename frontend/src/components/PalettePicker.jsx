import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { PALETTES, applyPalette } from "../lib/palettes";

// Color theme chunne ka chhota menu
export default function PalettePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(document.documentElement.dataset.palette || "lagoon");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = (id) => {
    applyPalette(id);
    setCurrent(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="icon-btn"
        aria-label="Change color theme"
        aria-expanded={open}
        title="Color theme"
      >
        <Palette size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-ink-600 dark:bg-ink-700">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Color theme
          </p>
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              aria-pressed={current === p.id}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition hover:bg-mist dark:hover:bg-ink-600"
            >
              <span className="flex">
                <i className="h-5 w-5 rounded-full border-2 border-white dark:border-ink-700" style={{ background: p.colors[0] }} />
                <i className="-ml-2 h-5 w-5 rounded-full border-2 border-white dark:border-ink-700" style={{ background: p.colors[1] }} />
              </span>
              <span className="flex-1 text-left">{p.name}</span>
              {current === p.id && <Check size={16} className="text-brand-600 dark:text-brand-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
