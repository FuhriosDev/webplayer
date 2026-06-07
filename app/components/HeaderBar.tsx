"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SignInButton from "./SignInButton";

type HeaderBarProps = {
  user: any | null;
  onUpload?: () => void;
  onSignOut?: () => Promise<void> | void;
  onProfile?: () => Promise<void> | void;
};

export default function HeaderBar({ user, onUpload, onSignOut, onProfile }: HeaderBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (avatarRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/90 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="relative h-10">
        <div className="mx-auto max-w-3xl h-full" />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {/* Upload button only when signed in and onUpload provided */}
          {user && onUpload && (
            <button
              onClick={onUpload}
              className="inline-flex h-8 items-center justify-center rounded bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800 transition mr-2"
            >
              Upload
            </button>
          )}

          {/* If signed in: avatar + dropdown, else SignInButton */}
          {user ? (
            <div className="relative">
              <button
                ref={avatarRef}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={open}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white hover:bg-zinc-800 transition"
              >
                {user?.email?.[0]?.toUpperCase() || "?"}
              </button>

              {open && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-64 rounded-3xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-col items-center">
                    <p className="text-center text-sm text-zinc-900 dark:text-zinc-100 break-all">
                      {user?.email}
                    </p>
                    <button
                      onClick={handleProfile}
                      className="mt-4 inline-flex w-full justify-center rounded-2xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="mt-3 inline-flex w-full justify-center rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
}