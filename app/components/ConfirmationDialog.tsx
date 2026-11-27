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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
    >
      <div className="flex flex-col items-center rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-900">
        <p
          id="confirmation-dialog-title"
          className="mb-6 text-lg text-zinc-900 dark:text-zinc-100"
        >
          {message}
        </p>
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-4">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded bg-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-400 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
