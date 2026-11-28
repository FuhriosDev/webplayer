"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  getUsernameValidationError,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/username";
import SignInButton from "./SignInButton";
import ConfirmationDialog from "./ConfirmationDialog";
import OverflowMenu from "./OverflowMenu";
import type { User } from "@supabase/supabase-js";

let cachedAuthUser: User | null = null;
const cachedUsernames = new Map<string, string>();

type HeaderBarProps = {
  user: User | null;
  onSignOut?: () => Promise<void> | void;
  onProfile?: () => Promise<void> | void;
};

export default function HeaderBar({
  user,
  onSignOut,
  onProfile,
}: HeaderBarProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<{
    ready: boolean;
    user: User | null;
  }>(() => ({ ready: Boolean(cachedAuthUser), user: cachedAuthUser }));
  const [open, setOpen] = useState(false);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [showUsernameSettings, setShowUsernameSettings] = useState(false);
  const [profile, setProfile] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const activeUser = user ?? authState.user;
  const authReady = user !== null || authState.ready;
  const userId = activeUser?.id;
  const metadataUsername = activeUser?.user_metadata?.username;
  const username =
    (userId && profile?.userId === userId ? profile.username : undefined) ??
    (userId ? cachedUsernames.get(userId) : undefined) ??
    (typeof metadataUsername === "string" ? metadataUsername : "");
  const legalMenuItems = [
    {
      label: "Datenschutz",
      onSelect: () => router.push("/datenschutz"),
    },
    {
      label: "Nutzungsbedingungen",
      onSelect: () => router.push("/nutzungsbedingungen"),
    },
    {
      label: "Impressum",
      onSelect: () => router.push("/impressum"),
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      cachedAuthUser = session?.user ?? null;
      setAuthState({ ready: true, user: cachedAuthUser });
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Could not restore the account session:", error.message);
        }
        setAuthState((current) => {
          if (current.ready) return current;
          cachedAuthUser = data.session?.user ?? null;
          return { ready: true, user: cachedAuthUser };
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Could not restore the account session:", error);
        setAuthState({ ready: true, user: null });
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;

    const loadUsername = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Could not load profile username:", error.message);
        return;
      }
      if (data) {
        cachedUsernames.set(userId, data.username);
        setProfile({ userId, username: data.username });
      }
    };

    void loadUsername();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (avatarRef.current?.contains(target) || dropdownRef.current?.contains(target))
        return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleSignOut = async () => {
    if (onSignOut) await onSignOut();
    else await supabase.auth.signOut();
    setOpen(false);
  };

  const handleProfile = async () => {
    if (onProfile) await onProfile();
    else router.push("/");
    setOpen(false);
  };

  const handleOpenUsernameSettings = async () => {
    setOpen(false);
    setUsernameError(null);
    setLoadingUsername(true);
    setShowUsernameSettings(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId ?? "")
      .maybeSingle();

    if (error) {
      setUsernameError("Could not load your username. Please try again.");
    } else if (data) {
      if (userId) {
        cachedUsernames.set(userId, data.username);
        setProfile({ userId, username: data.username });
      }
      setUsernameDraft(data.username);
    } else {
      setUsernameError("Your profile is not available. Please contact support.");
    }
    setLoadingUsername(false);
  };

  const handleSaveUsername = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = getUsernameValidationError(usernameDraft);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    setSavingUsername(true);
    setUsernameError(null);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("Sign in again before changing your username.");

      const response = await fetch("/api/profile/username", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: usernameDraft }),
      });
      const result: { username?: string; error?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update your username.");
      }

      if (!result.username) {
        throw new Error("The updated username was not returned.");
      }
      if (userId) {
        cachedUsernames.set(userId, result.username);
        setProfile({ userId, username: result.username });
      }
      setUsernameDraft(result.username);
      setShowUsernameSettings(false);
    } catch (error) {
      setUsernameError(
        getErrorMessage(error, "Could not update your username.")
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeletionError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Sign in again before deleting your account.");

      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        let responseError: string | undefined;
        try {
          const result: { error?: string } = await response.json();
          responseError = result.error;
        } catch {
          responseError = undefined;
        }
        throw new Error(
          responseError ?? "Could not delete your account. Please try again."
        );
      }

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        setDeletionError(
          "Your account was deleted, but this browser could not clear the session. Please reload the page."
        );
        return;
      }

      setConfirmingDeletion(false);
      setOpen(false);
      router.replace("/");
    } catch (error) {
      setDeletionError(
        getErrorMessage(error, "Could not delete your account. Please try again.")
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </span>
            <span className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Webplayer
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeUser ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleProfile()}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <span>Library</span>
                </button>
                <div className="relative">
                  <button
                    ref={avatarRef}
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={open}
                    aria-label="Account menu"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    {username[0]?.toUpperCase() || "?"}
                  </button>

                  {open && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="flex flex-col">
                        <p className="break-all px-2 pt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {username || "Username not set"}
                        </p>
                        <p className="break-all px-2 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {activeUser.email}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleOpenUsernameSettings()}
                          className="inline-flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Change username
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSignOut()}
                          className="inline-flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Sign out
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletionError(null);
                            setConfirmingDeletion(true);
                            setOpen(false);
                          }}
                          className="inline-flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Delete account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <OverflowMenu
                  label="Legal information"
                  items={legalMenuItems}
                />
              </>
            ) : authReady ? (
              <>
                <SignInButton />
                <OverflowMenu
                  label="Legal information"
                  items={legalMenuItems}
                />
              </>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800"
                />
                <OverflowMenu
                  label="Legal information"
                  items={legalMenuItems}
                />
              </>
            )}
          </div>
        </div>
      </header>
      {showUsernameSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-settings-title"
            className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
          >
            <h2
              id="username-settings-title"
              className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Username settings
            </h2>
            <form onSubmit={handleSaveUsername} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                Username
                <input
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={USERNAME_MAX_LENGTH}
                  pattern={USERNAME_PATTERN.source}
                  value={usernameDraft}
                  disabled={loadingUsername || savingUsername}
                  onChange={(event) => {
                    setUsernameDraft(event.target.value);
                    setUsernameError(
                      getUsernameValidationError(event.target.value)
                    );
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  3–24 characters: letters, numbers, dots, underscores, or hyphens.
                </span>
              </label>
              {usernameError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {usernameError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={savingUsername}
                  onClick={() => setShowUsernameSettings(false)}
                  className="inline-flex h-10 items-center rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingUsername || savingUsername || Boolean(usernameError)}
                  className="inline-flex h-10 items-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {savingUsername ? "Saving..." : "Save username"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {confirmingDeletion && (
        <ConfirmationDialog
          message="Delete your account and all your uploaded songs, playlists, and saved items? This cannot be undone."
          confirmLabel="Delete account"
          pendingLabel="Deleting account..."
          error={deletionError}
          pending={deletingAccount}
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => {
            setConfirmingDeletion(false);
            setDeletionError(null);
          }}
        />
      )}
    </>
  );
}