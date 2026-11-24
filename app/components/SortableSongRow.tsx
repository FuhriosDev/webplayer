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
      className="flex flex-wrap items-center border-b border-zinc-100 px-6 py-3 last:border-b-0 dark:border-zinc-800"
    >
      {disabled ? null : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder song"
          title="Drag to reorder"
          className="mr-3 cursor-grab touch-none text-zinc-500 active:cursor-grabbing"
        >
          ⠿
        </button>
      )}

      {children}
    </li>
  );
}
