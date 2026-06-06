"use client";
import { useState } from "react";
import AuthPanel from "./AuthPanel";

export default function SignInButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition"
      >
        Sign in
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-950">
            <AuthPanel />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}