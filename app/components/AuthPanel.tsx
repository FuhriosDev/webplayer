"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthSession } from "@/app/hooks/useAuthSession";

export default function AuthPanel() {
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Signed in successfully.");
      setEmail("");
      setPassword("");
    }

    setLoading(false);
  };

  const signUp = async () => {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Check your email for confirmation or magic link instructions."
      );
      setEmail("");
      setPassword("");
    }

    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "signin") {
      void signIn();
    } else {
      void signUp();
    }
  };

  if (session?.user) {
    return (
      <div className="w-full rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Signed in as
          </p>
          <p className="break-all text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {session.user.email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
      <div className="mb-6">
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {mode === "signin" ? "Sign in to Webplayer" : "Create your account"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Keep your music library and playlists together.
        </p>
      </div>
      <div
        className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        role="tablist"
        aria-label="Account access"
      >
        <button
          type="button"
          onClick={() => setMode("signin")}
          role="tab"
          aria-selected={mode === "signin"}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            mode === "signin"
              ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          role="tab"
          aria-selected={mode === "signup"}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            mode === "signup"
              ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          Password
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder={
              mode === "signin" ? "Enter your password" : "Choose a password"
            }
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        {message && (
          <p
            role={
              message.startsWith("Check your email") ||
              message.startsWith("Signed in")
                ? "status"
                : "alert"
            }
            className={`rounded-xl px-4 py-3 text-sm ${
              message.startsWith("Check your email") ||
              message.startsWith("Signed in")
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}