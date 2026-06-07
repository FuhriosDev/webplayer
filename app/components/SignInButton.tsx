"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import AuthPanel from "./AuthPanel";

export default function SignInButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-950 max-h-[90vh] overflow-auto">
        <AuthPanel />
        <div className="mt-4 flex justify-end">
          <button onClick={() => setOpen(false)} className="rounded px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center justify-center rounded bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 transition">
        Sign in
      </button>

      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}