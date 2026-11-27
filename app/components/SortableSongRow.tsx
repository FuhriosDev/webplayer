"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableSongRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="group flex flex-wrap items-center gap-y-2 border-b border-zinc-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-50/80 dark:border-zinc-800 dark:hover:bg-zinc-900/60 sm:px-6"
    >
      {disabled ? null : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder song"
          title="Drag to reorder"
          className="mr-1 cursor-grab touch-none text-zinc-400 transition-colors hover:text-zinc-700 active:cursor-grabbing dark:hover:text-zinc-200"
        >
          ⠿
        </button>
      )}

      {children}
    </li>
  );
}
