"use client";

import { useEffect, useRef, useState } from "react";
import {
  addSongToPlaylist,
  fetchPlaylistsForSong,
  removeSongFromPlaylist,
  type PlaylistSongStatus,
} from "@/lib/playlists";
import type { Song } from "@/lib/song";
import { getErrorMessage } from "@/lib/errorMessage";
import { SortableSongRow } from "./SortableSongRow";
import { useTransientNotice } from "@/app/hooks/useTransientNotice";
import TransientNotice from "./TransientNotice";

type SongListRowProps = {
  song: Song;
  queue: Song[];
  mode: "library" | "playlist";
  reorderable: boolean;
  onSelect: (song: Song, queue: Song[]) => void;
  onEdit: (filePath: string, newName: string) => Promise<void>;
  onDelete: (filePath: string) => void;
  onUnsave: (shareToken: string) => void;
  onRemove?: (shareToken: string) => Promise<void> | void;
  canSaveSong?: boolean;
  isSaved?: boolean;
  onToggleSongSaved?: (
    shareToken: string,
    isSaved: boolean
  ) => Promise<void>;
};

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.99" />
      <path d="M8.59 10.49l6.83-3.99" />
    </svg>
  );
}

export default function SongListRow({
  song,
  queue,
  mode,
  reorderable,
  onSelect,
  onEdit,
  onDelete,
  onUnsave,
  onRemove,
  canSaveSong = false,
  isSaved = false,
  onToggleSongSaved,
}: SongListRowProps) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(song.name);
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const [playlistOptions, setPlaylistOptions] =
    useState<PlaylistSongStatus[]>([]);
  const [loadingPlaylistOptions, setLoadingPlaylistOptions] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);
  const [savingSong, setSavingSong] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { notice, showNotice } = useTransientNotice();
  const playlistPickerRef = useRef<HTMLDivElement | null>(null);
  const playlistTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!playlistMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !(event.target instanceof Node) ||
        !playlistPickerRef.current?.contains(event.target)
      ) {
        setPlaylistMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPlaylistMenuOpen(false);
      playlistTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [playlistMenuOpen]);

  const handleEdit = async () => {
    setActionError(null);
    try {
      await onEdit(song.filePath, newName);
      setEditing(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update this song."));
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/share/${encodeURIComponent(song.shareToken)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showNotice("Song link copied to clipboard.");
    } catch {
      showNotice(`Copy this song link: ${shareUrl}`);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setActionError(null);
    try {
      await onRemove(song.shareToken);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not remove this song."));
    }
  };

  const handleSaveSong = async () => {
    if (!onToggleSongSaved || savingSong) return;

    setSavingSong(true);
    setActionError(null);
    try {
      await onToggleSongSaved(song.shareToken, isSaved);
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          isSaved ? "Could not remove this saved song." : "Could not save this song."
        )
      );
    } finally {
      setSavingSong(false);
    }
  };

  const handleOpenPlaylistMenu = async () => {
    if (playlistMenuOpen) {
      setPlaylistMenuOpen(false);
      return;
    }

    setPlaylistMenuOpen(true);
    setActionError(null);
    setLoadingPlaylistOptions(true);
    try {
      setPlaylistOptions(await fetchPlaylistsForSong(song.shareToken));
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not load playlists."));
    } finally {
      setLoadingPlaylistOptions(false);
    }
  };

  const handleTogglePlaylist = async (
    playlistId: string,
    containsSong: boolean
  ) => {
    setAddingToPlaylist(true);
    setActionError(null);
    try {
      if (containsSong) {
        await removeSongFromPlaylist(playlistId, song.shareToken);
      } else {
        await addSongToPlaylist(playlistId, song.shareToken);
      }

      setPlaylistOptions((current) =>
        current.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, containsSong: !containsSong }
            : playlist
        )
      );
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Could not update this playlist.")
      );
    } finally {
      setAddingToPlaylist(false);
    }
  };

  return (
    <SortableSongRow
      id={song.shareToken}
      disabled={mode !== "playlist" || !reorderable}
    >
      {notice && <TransientNotice message={notice} />}
      {editing ? (
        <>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New name"
            className="mr-4 h-9 flex-1 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleEdit()}
              className="inline-flex h-9 items-center justify-center rounded bg-green-600 px-3 text-sm text-white hover:bg-green-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center justify-center rounded bg-zinc-300 px-3 text-sm text-zinc-800 hover:bg-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="flex-1 cursor-pointer text-left text-zinc-800 hover:underline dark:text-zinc-100"
            onClick={() => onSelect(song, queue)}
          >
            {song.name}
          </button>
          <div className="flex gap-2">
            {mode === "library" && song.isOwner && (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setNewName(song.name);
                }}
                aria-label="Edit song"
                className="inline-flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleShare()}
              aria-label="Share song"
              className="inline-flex h-9 w-9 items-center justify-center rounded bg-green-600 text-white hover:bg-green-700"
            >
              <ShareIcon />
            </button>
            {mode === "playlist" ? (
              onRemove ? (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  aria-label={`Remove ${song.name} from playlist`}
                  className="inline-flex h-9 items-center justify-center rounded bg-red-600 px-3 text-sm text-white hover:bg-red-700"
                >
                  Remove
                </button>
              ) : (
                canSaveSong && (
                  <button
                    type="button"
                    onClick={() => void handleSaveSong()}
                    disabled={savingSong}
                    aria-label={
                      isSaved
                        ? `Unsave ${song.name}`
                        : `Save ${song.name}`
                    }
                    className="inline-flex h-9 w-20 shrink-0 items-center justify-center rounded bg-zinc-800 px-0 text-sm text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingSong
                      ? isSaved
                        ? "Removing..."
                        : "Saving..."
                      : isSaved
                        ? "Unsave"
                        : "Save"}
                  </button>
                )
              )
            ) : song.isOwner ? (
              <button
                type="button"
                onClick={() => onDelete(song.filePath)}
                aria-label="Delete song"
                className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
              >
                <DeleteIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUnsave(song.shareToken)}
                aria-label={`Remove ${song.name} from saved songs`}
                className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
              >
                <DeleteIcon />
              </button>
            )}
            {mode === "library" && (
              <div ref={playlistPickerRef} className="relative">
                <button
                  ref={playlistTriggerRef}
                  type="button"
                  title="Add to playlist"
                  aria-label={`Add ${song.name} to a playlist`}
                  aria-expanded={playlistMenuOpen}
                  onClick={() => void handleOpenPlaylistMenu()}
                  className="inline-flex h-9 items-center justify-center rounded bg-zinc-800 px-3 text-sm text-white"
                >
                  Add to playlist
                </button>

                {playlistMenuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    {loadingPlaylistOptions ? (
                      <p className="text-sm">Loading playlists...</p>
                    ) : (
                      <ul
                        aria-label={`Playlists for ${song.name}`}
                        className="max-h-60 overflow-y-auto"
                      >
                        {playlistOptions.map((playlist) => (
                          <li key={playlist.id}>
                            <div className="flex items-center justify-between gap-3 py-1">
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {playlist.name}
                              </span>
                              <button
                                type="button"
                                disabled={addingToPlaylist}
                                onClick={() =>
                                  void handleTogglePlaylist(
                                    playlist.id,
                                    playlist.containsSong
                                  )
                                }
                                aria-label={
                                  playlist.containsSong
                                    ? `Remove ${song.name} from ${playlist.name}`
                                    : `Add ${song.name} to ${playlist.name}`
                                }
                                className="shrink-0 rounded px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                              >
                                {playlist.containsSong
                                  ? "In playlist · Remove"
                                  : "Not in playlist · Add"}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!loadingPlaylistOptions && playlistOptions.length === 0 && (
                      <p className="mt-2 text-sm text-zinc-500">
                        Create a playlist first.
                      </p>
                    )}
                    {addingToPlaylist && (
                      <p className="mt-2 text-sm">Adding song...</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {actionError && (
        <div className="mt-2 flex w-full items-start justify-between gap-3">
          <p role="alert" className="text-sm text-red-600">
            {actionError}
          </p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="shrink-0 text-sm text-red-700 underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}
    </SortableSongRow>
  );
}
