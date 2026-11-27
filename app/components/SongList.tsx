"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Song } from "@/lib/song";
import { getErrorMessage } from "@/lib/errorMessage";
import { deleteSong, renameSong, unsaveSong } from "@/lib/songActions";
import ConfirmationDialog from "./ConfirmationDialog";
import SongListRow from "./SongListRow";

type SongListProps = {
  songs: Song[];
  userId: string;
  refresh: () => Promise<void> | void;
  onSelect: (song: Song, queue: Song[]) => void;
  onDelete?: (filePath: string) => void;
  onUpload?: () => void;
  mode?: "library" | "playlist";
  onRemove?: (shareToken: string) => Promise<void> | void;
  onReorder?: (orderedShareTokens: string[]) => void;
  canSaveSongs?: boolean;
  savedSongTokens?: ReadonlySet<string>;
  onToggleSongSaved?: (
    shareToken: string,
    isSaved: boolean
  ) => Promise<void>;
};

type SongFilter = "all" | "uploads" | "saved";
type PendingSongAction =
  | { type: "delete"; filePath: string }
  | { type: "unsave"; shareToken: string };

const filters: { id: SongFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "uploads", label: "Uploads" },
  { id: "saved", label: "Saved" },
];

export default function SongList({
  songs,
  userId,
  refresh,
  onUpload,
  onSelect,
  onDelete,
  mode = "library",
  onRemove,
  onReorder,
  canSaveSongs = false,
  savedSongTokens,
  onToggleSongSaved,
}: SongListProps) {
  const [pendingAction, setPendingAction] = useState<PendingSongAction | null>(
    null
  );
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState<SongFilter>("all");

  const visibleSongs =
    mode === "playlist"
      ? songs
      : songs.filter((song) => {
          if (filter === "uploads") return song.isOwner;
          if (filter === "saved") return !song.isOwner;
          return true;
        });

  const handleEdit = async (filePath: string, newName: string) => {
    await renameSong(filePath, newName);
    await refresh();
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setConfirming(true);
    setConfirmationError(null);
    try {
      if (pendingAction.type === "delete") {
        await deleteSong(pendingAction.filePath);
        setPendingAction(null);
        if (onDelete) onDelete(pendingAction.filePath);
        else await refresh();
      } else {
        await unsaveSong(userId, pendingAction.shareToken);
        setPendingAction(null);
        await refresh();
      }
    } catch (error) {
      setConfirmationError(
        getErrorMessage(
          error,
          pendingAction.type === "delete"
            ? "Could not delete this song."
            : "Could not remove this saved song."
        )
      );
    } finally {
      setConfirming(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (mode !== "playlist" || !onReorder || !event.over) return;
    if (event.active.id === event.over.id) return;

    const oldIndex = visibleSongs.findIndex(
      (song) => song.shareToken === event.active.id
    );
    const newIndex = visibleSongs.findIndex(
      (song) => song.shareToken === event.over?.id
    );

    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(visibleSongs, oldIndex, newIndex);
    onReorder(reordered.map((song) => song.shareToken));
  };

  return (
    <section
      aria-label={mode === "library" ? "Songs" : "Playlist songs"}
      className="mt-6 w-full overflow-visible rounded-3xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      {mode === "library" && (
        <div className="border-b border-zinc-100 px-4 pb-4 pt-4 dark:border-zinc-800 sm:px-6 sm:pt-5">
          <div className="flex items-center gap-2">
            <div
              className="flex flex-1 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
              role="group"
              aria-label="Filter songs"
            >
              {filters.map((filterOption) => (
                <button
                  key={filterOption.id}
                  type="button"
                  onClick={() => setFilter(filterOption.id)}
                  aria-pressed={filter === filterOption.id}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    filter === filterOption.id
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
            {onUpload && (
              <button
                type="button"
                onClick={onUpload}
                aria-label="Upload audio"
                title="Upload audio"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleSongs.map((song) => song.shareToken)}
          strategy={verticalListSortingStrategy}
        >
          <ul>
            {visibleSongs.map((song) => (
              <SongListRow
                key={song.shareToken}
                song={song}
                queue={visibleSongs}
                mode={mode}
                reorderable={Boolean(onReorder)}
                onSelect={onSelect}
                onEdit={handleEdit}
                onDelete={(filePath) => {
                  setConfirmationError(null);
                  setPendingAction({ type: "delete", filePath });
                }}
                onUnsave={(shareToken) => {
                  setConfirmationError(null);
                  setPendingAction({ type: "unsave", shareToken });
                }}
                onRemove={onRemove}
                canSaveSong={canSaveSongs && Boolean(onToggleSongSaved)}
                isSaved={savedSongTokens?.has(song.shareToken) ?? false}
                onToggleSongSaved={onToggleSongSaved}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {visibleSongs.length === 0 && mode === "playlist" && (
        <p className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          This playlist is empty.
        </p>
      )}
      {visibleSongs.length === 0 && mode === "library" && (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p className="mt-4 font-medium text-zinc-900 dark:text-zinc-100">
            {filter === "all" ? "Your library is ready" : `No ${filter} yet`}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filter === "all"
              ? "Upload a song to start building your collection."
              : "Try another filter or add more songs to your library."}
          </p>
          {filter === "all" && onUpload && (
            <button
              type="button"
              onClick={onUpload}
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Upload a song
            </button>
          )}
        </div>
      )}
      {pendingAction && (
        <ConfirmationDialog
          message={
            pendingAction.type === "delete"
              ? "Are you sure you want to delete this song?"
              : "Are you sure you want to remove this song from your saved songs?"
          }
          confirmLabel={pendingAction.type === "delete" ? "Yes, Delete" : "Yes, Remove"}
          pendingLabel={pendingAction.type === "delete" ? "Deleting..." : "Removing..."}
          error={confirmationError}
          pending={confirming}
          onConfirm={() => void handleConfirmAction()}
          onCancel={() => {
            setPendingAction(null);
            setConfirmationError(null);
          }}
        />
      )}
    </section>
  );
}
