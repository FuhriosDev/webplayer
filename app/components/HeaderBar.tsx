"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SignInButton from "./SignInButton";
import type { User } from "@supabase/supabase-js";

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
  const [open, setOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  return (
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
          {user ? (
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
                  {user?.email?.[0]?.toUpperCase() || "?"}
                </button>

                {open && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex flex-col">
                      <p className="break-all px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {user?.email}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="inline-flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
}