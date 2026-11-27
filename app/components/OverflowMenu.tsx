"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type OverflowMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export default function OverflowMenu({
  label,
  items,
  triggerRef: forwardedTriggerRef,
}: {
  label: string;
  items: OverflowMenuItem[];
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const internalTriggerRef = useRef<HTMLButtonElement>(null);
  const triggerRef = forwardedTriggerRef ?? internalTriggerRef;
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const handleMenuKeyDown = (event: KeyboardEvent) => {
      const currentIndex = itemRefs.current.indexOf(
        document.activeElement as HTMLButtonElement
      );
      if (event.key === "ArrowDown") {
        event.preventDefault();
        itemRefs.current[(currentIndex + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        itemRefs.current[
          (currentIndex - 1 + items.length) % items.length
        ]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        itemRefs.current[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        itemRefs.current[items.length - 1]?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleMenuKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [items.length, open, triggerRef]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-[60] mt-2 min-w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.tone === "danger"
                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
