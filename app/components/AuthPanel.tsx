"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import {
  getUsernameValidationError,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/username";

export default function AuthPanel() {
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
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
    const usernameError = getUsernameValidationError(username);
    if (usernameError) {
      setMessage(usernameError);
      return;
    }

    if (!acceptedTerms) {
      setTermsError(true);
      setMessage(null);
      return;
    }

    setLoading(true);
    setMessage(null);
    setTermsError(false);

    try {
      const { data: isAvailable, error: availabilityError } =
        await supabase.rpc("is_username_available", {
          p_username: username.trim(),
        });
      if (availabilityError) {
        setMessage("Could not check username availability. Please try again.");
        return;
      }
      if (!isAvailable) {
        setMessage("That username is already taken. Choose another one.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } },
      });

      if (error) {
        const usernameTaken =
          error.code === "23505" ||
          /username.*(duplicate|unique|taken)/i.test(error.message);
        setMessage(
          usernameTaken
            ? "That username is already taken. Choose another one."
            : error.message
        );
      } else {
        setMessage(
          "Check your email for confirmation or magic link instructions."
        );
        setEmail("");
        setPassword("");
        setUsername("");
        setAcceptedTerms(false);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "signin") {
      void signIn();
      return;
    }

    if (!acceptedTerms) {
      setTermsError(true);
      setMessage(null);
      return;
    }

    const usernameError = getUsernameValidationError(username);
    if (usernameError) {
      setMessage(usernameError);
      return;
    }

    void signUp();
  };

  const changeMode = (nextMode: "signin" | "signup") => {
    setMode(nextMode);
    setAcceptedTerms(false);
    setTermsError(false);
    setMessage(null);
    setUsername("");
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
          onClick={() => changeMode("signin")}
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
          onClick={() => changeMode("signup")}
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

        {mode === "signup" && (
          <>
            <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              Username
              <input
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={USERNAME_MAX_LENGTH}
                pattern={USERNAME_PATTERN.source}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setMessage(
                    event.target.value
                      ? getUsernameValidationError(event.target.value)
                      : null
                  );
                }}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="your_username"
                aria-describedby="username-hint"
              />
              <span id="username-hint" className="text-xs text-zinc-500 dark:text-zinc-400">
                3–24 characters: letters, numbers, dots, underscores, or hyphens.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                aria-describedby={termsError ? "terms-acceptance-error" : undefined}
                onInvalid={() => setTermsError(true)}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setTermsError(false);
                }}
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span>
                Ich akzeptiere die{" "}
                <Link
                  href="/nutzungsbedingungen"
                  className="underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  Nutzungsbedingungen
                </Link>{" "}
                und habe die{" "}
                <Link
                  href="/datenschutz"
                  className="underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  Datenschutzerklärung
                </Link>{" "}
                zur Kenntnis genommen.
              </span>
            </label>
            {termsError && (
              <p
                id="terms-acceptance-error"
                role="alert"
                className="mt-2 text-sm text-red-700 dark:text-red-300"
              >
                Bitte akzeptiere die Nutzungsbedingungen und bestätige, dass du
                die Datenschutzerklärung zur Kenntnis genommen hast.
              </p>
            )}
          </>
        )}

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