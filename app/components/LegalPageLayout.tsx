"use client";

import type { ReactNode } from "react";
import HeaderBar from "./HeaderBar";
import { useAuthSession } from "@/app/hooks/useAuthSession";

export default function LegalPageLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const session = useAuthSession();

  return (
    <div lang="de" className="min-h-screen bg-zinc-50 dark:bg-black">
      <HeaderBar user={session?.user ?? null} />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none sm:p-10">
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            {title}
          </h1>
          <div className="legal-content mt-8 space-y-8 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            {children}
          </div>
        </article>
      </main>
    </div>
  );
}
