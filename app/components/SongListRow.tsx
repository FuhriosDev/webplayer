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
import OverflowMenu, { type OverflowMenuItem } from "./OverflowMenu";

type SongListRowProps = {
  song: Song;
  queue: Song[];
  mode: "library" | "playlist";
  position?: number;
  isFirst?: boolean;
  isLast?: boolean;
  isCurrentSong?: boolean;
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

export default function SongListRow({
  song,
  queue,
  mode,
  position,
  isFirst,
  isLast,
  isCurrentSong,
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
  const [playlistOptionsError, setPlaylistOptionsError] = useState<
    string | null
  >(null);
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
    setPlaylistOptionsError(null);
    setLoadingPlaylistOptions(true);
    try {
      setPlaylistOptions(await fetchPlaylistsForSong(song.shareToken));
    } catch (error) {
      setPlaylistOptionsError(
        getErrorMessage(error, "Could not load playlists.")
      );
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

  const songMenuItems: OverflowMenuItem[] = [];
  if (mode === "library") {
    songMenuItems.push({
      label: "Add to playlist",
      onSelect: () => void handleOpenPlaylistMenu(),
    });
  }
  songMenuItems.push({
    label: "Share song",
    onSelect: () => void handleShare(),
  });
  if (mode === "library" && song.isOwner) {
    songMenuItems.push({
      label: "Rename song",
      onSelect: () => {
        setEditing(true);
        setNewName(song.name);
      },
    });
  }
  if (mode === "library" && song.isOwner) {
    songMenuItems.push({
      label: "Delete song",
      tone: "danger",
      onSelect: () => onDelete(song.filePath),
    });
  } else if (mode === "library") {
    songMenuItems.push({
      label: "Remove from saved songs",
      tone: "danger",
      onSelect: () => onUnsave(song.shareToken),
    });
  } else if (mode === "playlist" && canSaveSong) {
    songMenuItems.push({
      label: savingSong
        ? isSaved
          ? "Removing from saved songs..."
          : "Saving song..."
        : isSaved
          ? "Remove from saved songs"
          : "Save song",
      tone: isSaved ? "danger" : "default",
      disabled: savingSong,
      onSelect: () => void handleSaveSong(),
    });
  } else if (onRemove) {
    songMenuItems.push({
      label: "Remove from playlist",
      tone: "danger",
      onSelect: () => void handleRemove(),
    });
  }

  return (
    <SortableSongRow
      id={song.shareToken}
      disabled={mode !== "playlist" || !reorderable}
      isFirst={isFirst}
      isLast={isLast}
      isCurrentSong={isCurrentSong}
    >
      {notice && <TransientNotice message={notice} />}
      {editing ? (
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            aria-label={`Rename ${song.name}`}
            autoFocus
            className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void handleEdit()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {position !== undefined && (
            <span
              aria-hidden="true"
              className="min-w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-blue-600 dark:text-blue-400"
            >
              {position}
            </span>
          )}
          <button
            type="button"
            className={`flex min-w-0 flex-1 flex-col cursor-pointer py-1 text-left text-sm font-medium transition-colors ${
              isCurrentSong
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-800 group-hover:text-zinc-950 dark:text-zinc-100 dark:group-hover:text-white"
            }`}
            onClick={() => onSelect(song, queue)}
          >
            <span className="w-full truncate">{song.name}</span>
            <span className="w-full truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
              by {song.artist ?? "Unknown user"}
            </span>
          </button>
          <div className="flex items-center gap-1">
            <div ref={playlistPickerRef} className="relative">
              <OverflowMenu
                label={`More options for ${song.name}`}
                items={songMenuItems}
                triggerRef={playlistTriggerRef}
              />
              {playlistMenuOpen && (
                <div
                  role="dialog"
                  aria-label={`Add ${song.name} to a playlist`}
                  aria-busy={addingToPlaylist}
                  className="absolute right-0 top-full z-[60] mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Add to playlist
                    </p>
                    <button
                      type="button"
                      onClick={() => setPlaylistMenuOpen(false)}
                      aria-label="Close playlist menu"
                      className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
                        <path d="m6 6 12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                  {loadingPlaylistOptions ? (
                    <div className="flex items-center gap-2 px-3 py-5 text-sm text-zinc-500 dark:text-zinc-400">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500 dark:border-zinc-700 dark:border-t-blue-400"
                      />
                      Loading playlists…
                    </div>
                  ) : playlistOptionsError ? (
                    <p
                      role="alert"
                      className="px-3 py-5 text-sm text-red-600 dark:text-red-400"
                    >
                      {playlistOptionsError}
                    </p>
                  ) : playlistOptions.length > 0 ? (
                    <ul
                      aria-label={`Playlists for ${song.name}`}
                      className="max-h-60 overflow-y-auto"
                    >
                      {playlistOptions.map((playlist) => (
                        <li key={playlist.id}>
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
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium text-zinc-700 dark:text-zinc-200">
                              {playlist.name}
                            </span>
                            <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {playlist.containsSong ? "Added · Remove" : "Add"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-5 text-sm text-zinc-500 dark:text-zinc-400">
                      Create a playlist first to organize this song.
                    </p>
                  )}
                </div>
              )}
            </div>
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
