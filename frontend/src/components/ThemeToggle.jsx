import { useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "icon-btn" }) {
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };

  return (
    <button onClick={toggle} className={className} aria-label="Switch theme" title="Switch theme">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
