"use client";

type TransientNoticeProps = {
  message: string;
};

export default function TransientNotice({ message }: TransientNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-20 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 break-all rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
    >
      {message}
    </div>
  );
}
