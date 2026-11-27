"use client";

type ConfirmationDialogProps = {
  message: string;
  confirmLabel: string;
  pendingLabel: string;
  error: string | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationDialog({
  message,
  confirmLabel,
  pendingLabel,
  error,
  pending,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      aria-busy={pending}
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <h2
          id="confirmation-dialog-title"
          className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {message}
        </h2>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-7 flex flex-col-reverse items-center justify-center gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex h-11 min-w-32 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex h-11 min-w-32 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
