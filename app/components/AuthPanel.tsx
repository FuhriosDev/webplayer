"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPanel() {
  const [session, setSession] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session ?? null)
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

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
    setSession(null);
  };

  if (session?.user) {
    return (
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Signed in as <span className="font-semibold">{session.user.email}</span>
          </p>
          <button
            onClick={signOut}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold ${
            mode === "signin"
              ? "bg-zinc-950 text-white"
              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-2xl px-4 py-2 text-sm font-semibold ${
            mode === "signup"
              ? "bg-zinc-950 text-white"
              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          Sign up
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="Choose a password"
          />
        </label>

        <button
          onClick={mode === "signin" ? signIn : signUp}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        {message && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
        )}
      </div>
    </div>
  );
}