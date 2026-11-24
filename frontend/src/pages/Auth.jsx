import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import PalettePicker from "../components/PalettePicker";
import ThemeToggle from "../components/ThemeToggle";

// Component bahar define kiya hai taake typing ke waqt input focus na khoye
function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
      <input {...props} className="input pl-10" required />
    </div>
  );
}

function PreviewBubble({ mine, delay, children }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        style={{ animationDelay: `${delay}ms` }}
        className={`animate-pop max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] ${
          mine ? "rounded-br-sm bg-sun-500 text-sun-ink" : "rounded-bl-sm bg-ink-700 text-slate-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await (isLogin ? login(form) : register(form));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Could not reach the server. Is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <ThemeToggle />
        <PalettePicker />
      </div>
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-brand-800/60" />
        <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-brand-700/30" />

        <Logo className="relative" />

        <div className="relative max-w-sm space-y-3">
          <PreviewBubble delay={300}>Did the new build go out?</PreviewBubble>
          <PreviewBubble mine delay={900}>Yes, it just shipped. Check your inbox.</PreviewBubble>
          <PreviewBubble delay={1500}>Perfect, thank you!</PreviewBubble>
        </div>

        <div className="relative">
          <h1 className="max-w-md font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Talk it through, live.
          </h1>
          <p className="mt-4 max-w-sm text-brand-200">
            Private one-to-one messages with typing, online status and read receipts.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <Logo className="mb-6 text-brand-800 dark:text-white lg:hidden" />
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {isLogin ? "Log in to open your chats." : "It takes less than a minute."}
            </p>
          </div>

          {!isLogin && (
            <Field icon={User} name="name" placeholder="Full name" value={form.name} onChange={onChange} />
          )}
          <Field icon={Mail} type="email" name="email" placeholder="Email address" value={form.email} onChange={onChange} />
          <Field icon={Lock} type="password" name="password" placeholder="Password (min 6 characters)" value={form.password} onChange={onChange} />

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button className="btn-primary" disabled={busy}>
            {busy ? "Please wait..." : isLogin ? "Log in" : "Create account"}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              {isLogin ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
