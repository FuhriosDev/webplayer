"use client";
import { type ReactNode, useState } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabaseClient";
import {
  addSongToPlaylist,
  fetchPlaylists,
  type Playlist,
} from "@/lib/playlists";

type Song = {
  name: string;
  url: string;
  filePath: string;
  shareToken: string;
  isOwner?: boolean;
};

type SongListProps = {
  songs: Song[];
  userId: string;
  refresh: () => void;
  onSelect: (
    url: string,
    name: string,
    filePath: string,
    queue: Song[]
  ) => void;
  onDelete?: (filePath: string) => void;
  onPlaylistChange?: () => void;
  onUpload?: () => void;
  mode?: "library" | "playlist";
  onRemove?: (shareToken: string) => Promise<void> | void;
  onReorder?: (orderedShareTokens: string[]) => void;
};

type SongFilter = "all" | "uploads" | "saved";

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
  onPlaylistChange,
  mode = "library",
  onRemove,
  onReorder,
}: SongListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<SongFilter>("all");
  const [playlistMenuSong, setPlaylistMenuSong] = useState<string | null>(null);
  const [playlistOptions, setPlaylistOptions] = useState<Playlist[]>([]);
  const [loadingPlaylistOptions, setLoadingPlaylistOptions] = useState(false);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
  const [playlistActionError, setPlaylistActionError] = useState<string | null>(null);

  const visibleSongs =
    mode === "playlist"
      ? songs
      : songs.filter((song) => {
          if (filter === "uploads") return song.isOwner;
          if (filter === "saved") return !song.isOwner;
          return true;
        });

  const handleEdit = async (filePath: string) => {
    await supabase
      .from("songs_meta")
      .update({ display_name: newName })
      .eq("file_path", filePath);
    setEditing(null);
    refresh();
  };

  const handleDelete = async (filePath: string) => {
    setPendingDelete(filePath);
  };

  const handleDeleteConfirm = async () => {
    const fileToDelete = pendingDelete!;
    // delete from storage first
    const { error: storageError } = await supabase.storage.from("songs").remove([fileToDelete]);

    if (storageError) {
      alert("Failed to delete file: " + storageError.message);
      setPendingDelete(null);
      return;
    }

    // then delete metadata
    const { error: metaError } = await supabase.from("songs_meta").delete().eq("file_path", fileToDelete);

    if (metaError) {
      alert("Failed to delete metadata: " + metaError.message);
    } else {
      setPendingDelete(null);
      refresh();
      if (onDelete) onDelete(fileToDelete);
    }
  };

  const handleShare = (shareToken: string) => {
    try {
      const shareUrl = `${window.location.origin}/share/${encodeURIComponent(shareToken)}`;
      navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard!");
    } catch (err) {
      // fallback if clipboard is not available
      alert(`Share link: ${window.location.origin}/share/${encodeURIComponent(shareToken)}`);
    }
  };

  const handleUnsave = async (shareToken: string) => {
    const { data: deletedRows, error } = await supabase
      .from("saved_songs")
      .delete()
      .eq("user_id", userId)
      .eq("share_token", shareToken)
      .select("share_token");

    if (error) {
      alert("Failed to remove saved song: " + error.message);
      return;
    }

    if (!deletedRows?.length) {
      alert("No saved row was deleted. Check the saved_songs DELETE policy.");
      return;
    }

    await refresh();
  };

  const handleOpenPlaylistMenu = async (shareToken: string) => {
    if (playlistMenuSong === shareToken) {
      setPlaylistMenuSong(null);
      return;
    }

    setPlaylistMenuSong(shareToken);
    setPlaylistActionError(null);
    setLoadingPlaylistOptions(true);

    try {
      setPlaylistOptions(await fetchPlaylists());
    } catch (error) {
      console.error("Could not load playlists:", error);
      setPlaylistActionError("Could not load playlists.");
    } finally {
      setLoadingPlaylistOptions(false);
    }
  };

  const handleAddToPlaylist = async (
    playlistId: string,
    shareToken: string
  ) => {
    setAddingToPlaylistId(playlistId);
    setPlaylistActionError(null);

    try {
      await addSongToPlaylist(playlistId, shareToken);
      setPlaylistMenuSong(null);
      onPlaylistChange?.();
    } catch (error) {
      console.error("Could not add song to playlist:", error);
      setPlaylistActionError(
        error instanceof Error ? error.message : "Could not add this song."
      );
    } finally {
      setAddingToPlaylistId(null);
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

  function SortableSongRow({
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
        className="flex items-center border-b border-zinc-100 px-6 py-3 last:border-b-0 dark:border-zinc-800"
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

  return (
    <div className="w-full max-w-xl mt-8 rounded-2xl border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-950">
      {mode === "library" && (
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-2">
              {filters.map((filterOption) => (
                <button
                  key={filterOption.id}
                  type="button"
                  onClick={() => setFilter(filterOption.id)}
                  aria-pressed={filter === filterOption.id}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    filter === filterOption.id
                      ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                      : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xl text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                +
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
              <SortableSongRow
                key={song.shareToken}
                id={song.shareToken}
                disabled={mode !== "playlist" || !onReorder}
              >
                {editing === song.filePath ? (
                  <>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="New name"
                      className="flex-1 mr-4 h-9 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(song.filePath)}
                        className="inline-flex h-9 items-center justify-center rounded bg-green-600 px-3 text-white text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="inline-flex h-9 items-center justify-center rounded bg-zinc-300 px-3 text-zinc-800 text-sm hover:bg-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      className="flex-1 text-zinc-800 dark:text-zinc-100 cursor-pointer hover:underline"
                      onClick={() => onSelect(song.url, song.name, song.filePath, visibleSongs)}
                    >
                      {song.name}
                    </span>
                    <div className="flex gap-2">
                      {mode === "library" && song.isOwner && (
                        <button
                          onClick={() => {
                            setEditing(song.filePath);
                            setNewName(song.name);
                          }}
                          aria-label="Edit song"
                          className="inline-flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleShare(song.shareToken)}
                        aria-label="Share song"
                        className="inline-flex h-9 w-9 items-center justify-center rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="M8.59 13.51l6.83 3.99" />
                          <path d="M8.59 10.49l6.83-3.99" />
                        </svg>
                      </button>
                      {mode === "playlist" ? (
                        <button
                          type="button"
                          onClick={() => void onRemove?.(song.shareToken)}
                          aria-label={`Remove ${song.name} from playlist`}
                          className="inline-flex h-9 items-center justify-center rounded bg-red-600 px-3 text-sm text-white hover:bg-red-700"
                        >
                          Remove
                        </button>
                      ) : (
                        <>
                          {song.isOwner ? (
                            <button
                              onClick={() => setPendingDelete(song.filePath)}
                              aria-label="Delete song"
                              className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnsave(song.shareToken)}
                              aria-label="Unsave song"
                              className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              title="Add to playlist"
                              aria-label={`Add ${song.name} to a playlist`}
                              onClick={() => void handleOpenPlaylistMenu(song.shareToken)}
                              className="inline-flex h-9 items-center justify-center rounded bg-zinc-800 px-3 text-sm text-white"
                            >
                              Add to playlist
                            </button>

                            {playlistMenuSong === song.shareToken && (
                              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                                {loadingPlaylistOptions ? (
                                  <p className="text-sm">Loading playlists...</p>
                                ) : (
                                  <select
                                    defaultValue=""
                                    aria-label={`Choose a playlist for ${song.name}`}
                                    disabled={playlistOptions.length === 0 || addingToPlaylistId !== null}
                                    onChange={(event) => {
                                      const playlistId = event.target.value;
                                      if (playlistId) {
                                        void handleAddToPlaylist(playlistId, song.shareToken);
                                      }
                                    }}
                                    className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                  >
                                    <option value="" disabled>
                                      Choose a playlist
                                    </option>
                                    {playlistOptions.map((playlist) => (
                                      <option key={playlist.id} value={playlist.id}>
                                        {playlist.name}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {!loadingPlaylistOptions && playlistOptions.length === 0 && (
                                  <p className="mt-2 text-sm text-zinc-500">Create a playlist first.</p>
                                )}

                                {addingToPlaylistId && (
                                  <p className="mt-2 text-sm">Adding song...</p>
                                )}

                                {playlistActionError && (
                                  <p role="alert" className="mt-2 text-sm text-red-600">
                                    {playlistActionError}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </SortableSongRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {visibleSongs.length === 0 && mode === "playlist" && (
        <p className="px-6 py-4 text-sm text-zinc-500">
          This playlist is empty.
        </p>
      )}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 shadow-lg flex flex-col items-center">
            <p className="mb-6 text-lg text-zinc-900 dark:text-zinc-100">Are you sure you want to delete this song?</p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteConfirm}
                className="rounded bg-green-600 px-4 py-2 text-white text-sm hover:bg-green-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded bg-zinc-300 px-4 py-2 text-zinc-800 text-sm hover:bg-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}