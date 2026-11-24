import { Component } from "react";

// Koi component crash ho to blank page ki jagah ye screen dikhegi
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ui] crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          The page hit an unexpected error. Reloading usually fixes it.
        </p>
        <button className="btn-primary max-w-[180px]" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}
