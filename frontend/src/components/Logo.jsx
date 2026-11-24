import { MessageCircle } from "lucide-react";

export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 font-display text-xl font-bold tracking-tight ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-sun-500 text-sun-ink">
        <MessageCircle size={19} strokeWidth={2.4} />
      </span>
      Chatly
    </div>
  );
}
