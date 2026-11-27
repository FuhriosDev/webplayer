"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPlaylist as createPlaylistRecord,
  deletePlaylist,
  ensurePlaylistShareToken,
  renamePlaylist,
  unsavePlaylist,
  type Playlist,
} from "@/lib/playlists";
import { getErrorMessage } from "@/lib/errorMessage";
import ConfirmationDialog from "./ConfirmationDialog";
import { useTransientNotice } from "@/app/hooks/useTransientNotice";
import TransientNotice from "./TransientNotice";
import OverflowMenu from "./OverflowMenu";

type PlaylistFilter = "all" | "created" | "saved";
type PendingPlaylistAction =
  | { type: "delete"; playlistId: string }
  | { type: "unsave"; playlistId: string };

const filters: { id: PlaylistFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "saved", label: "Saved" },
];

type PlaylistPanelProps = {
  userId: string;
  playlists: Playlist[];
  onPlaylistsChange: (playlists: Playlist[]) => void;
};

export default function PlaylistPanel({
  userId,
  playlists,
  onPlaylistsChange,
}: PlaylistPanelProps) {
  const router = useRouter();

  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingPlaylistId, setEditingPlaylistId] =
    useState<string | null>(null);
  const [editedPlaylistName, setEditedPlaylistName] = useState("");
  const [pendingPlaylistAction, setPendingPlaylistAction] =
    useState<PendingPlaylistAction | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  );
  const [confirmingPlaylistAction, setConfirmingPlaylistAction] =
    useState(false);

  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlaylistFilter>("all");
  const { notice, showNotice } = useTransientNotice();
  const visiblePlaylists = playlists.filter((playlist) => {
    if (filter === "created") return !playlist.isSaved;
    if (filter === "saved") return playlist.isSaved;
    return true;
  });

  const handleCreatePlaylist = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<boolean> => {
    event.preventDefault();

    setCreating(true);
    setPlaylistError(null);

    try {
      const playlist = await createPlaylistRecord(newPlaylistName);

      onPlaylistsChange([playlist, ...playlists]);
      setNewPlaylistName("");
      return true;
    } catch (error) {
      setPlaylistError(getErrorMessage(error, "Could not create playlist."));
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleRenamePlaylist = async (playlistId: string) => {
    setActionError(null);

    try {
      await renamePlaylist(playlistId, editedPlaylistName);

      onPlaylistsChange(
        playlists.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, name: editedPlaylistName.trim() }
            : playlist
        )
      );

      setEditingPlaylistId(null);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not rename playlist."));
    }
  };

  const handleConfirmPlaylistAction = async () => {
    if (!pendingPlaylistAction) return;

    setConfirmingPlaylistAction(true);
    setConfirmationError(null);
    try {
      if (pendingPlaylistAction.type === "delete") {
        await deletePlaylist(pendingPlaylistAction.playlistId);
      } else {
        await unsavePlaylist(pendingPlaylistAction.playlistId, userId);
      }

      onPlaylistsChange(
        playlists.filter(
          (playlist) => playlist.id !== pendingPlaylistAction.playlistId
        )
      );
      setPendingPlaylistAction(null);
    } catch (error) {
      setConfirmationError(
        getErrorMessage(
          error,
          pendingPlaylistAction.type === "delete"
            ? "Could not delete playlist."
            : "Could not remove saved playlist."
        )
      );
    } finally {
      setConfirmingPlaylistAction(false);
    }
  };

  const handleSharePlaylist = async (playlist: Playlist) => {
    let shareToken = playlist.shareToken;
    if (!shareToken) {
      if (playlist.isSaved) {
        setActionError("This playlist no longer has an active share link.");
        return;
      }

      try {
        shareToken = await ensurePlaylistShareToken(playlist.id);
        onPlaylistsChange(
          playlists.map((item) =>
            item.id === playlist.id ? { ...item, shareToken } : item
          )
        );
      } catch (error) {
        setActionError(
          getErrorMessage(error, "Could not create a playlist share link.")
        );
        return;
      }
    }

    const shareUrl = `${window.location.origin}/playlists/${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showNotice("Playlist link copied to clipboard.");
    } catch {
      showNotice(`Copy this playlist link: ${shareUrl}`);
    }
  };

  const submitCreate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (await handleCreatePlaylist(event)) {
      setShowCreateModal(false);
    }
  };

  return (
    <>
      {notice && <TransientNotice message={notice} />}
      <section
        aria-label="Playlists"
        className="mt-6 w-full overflow-visible rounded-3xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 pb-4 pt-4 dark:border-zinc-800 sm:px-6 sm:pt-5">
          <div
            className="flex flex-1 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
            role="group"
            aria-label="Filter playlists"
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
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            aria-label="Create playlist"
            title="Create playlist"
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
            <span className="hidden sm:inline">New playlist</span>
          </button>
        </div>

        {actionError && (
          <p role="alert" className="px-6 pb-3 text-sm text-red-600">
            {actionError}
          </p>
        )}

        {playlistError && (
          <p role="alert" className="px-6 pb-3 text-sm text-red-600">
            {playlistError}
          </p>
        )}

        <ul>
          {visiblePlaylists.map((playlist) =>
            editingPlaylistId === playlist.id ? (
              <li
                key={playlist.id}
                className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800 sm:px-6"
              >
                <input
                  value={editedPlaylistName}
                  onChange={(event) =>
                    setEditedPlaylistName(event.target.value)
                  }
                  className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  autoFocus
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void handleRenamePlaylist(playlist.id)
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPlaylistId(null)}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={playlist.id}
                className="group flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-50/80 dark:border-zinc-800 dark:hover:bg-zinc-900/60 sm:px-6"
              >
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/playlists/${playlist.shareToken ?? playlist.id}`
                    )
                  }
                  className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium text-zinc-800 transition-colors group-hover:text-zinc-950 dark:text-zinc-100 dark:group-hover:text-white"
                >
                  {playlist.name}
                </button>
                <OverflowMenu
                  label={`More options for ${playlist.name}`}
                  items={[
                    ...(!playlist.isSaved
                      ? [
                          {
                            label: "Rename playlist",
                            onSelect: () => {
                              setEditingPlaylistId(playlist.id);
                              setEditedPlaylistName(playlist.name);
                            },
                          },
                        ]
                      : []),
                    {
                      label: "Share playlist",
                      onSelect: () => void handleSharePlaylist(playlist),
                    },
                    {
                      label: playlist.isSaved
                        ? "Remove saved playlist"
                        : "Delete playlist",
                      tone: "danger",
                      onSelect: () => {
                        setConfirmationError(null);
                        setPendingPlaylistAction({
                          type: playlist.isSaved ? "unsave" : "delete",
                          playlistId: playlist.id,
                        });
                      },
                    },
                  ]}
                />
              </li>
            )
          )}
        </ul>

        {visiblePlaylists.length === 0 && (
          <p className="px-6 py-4 text-sm text-zinc-500">
            {filter === "created"
              ? "No created playlists yet."
              : filter === "saved"
                ? "No saved playlists yet."
                : "No playlists yet. Create one to start organizing your music."}
          </p>
        )}
      </section>

      {pendingPlaylistAction && (
        <ConfirmationDialog
          message={
            pendingPlaylistAction.type === "delete"
              ? "Are you sure you want to delete this playlist?"
              : "Are you sure you want to remove this playlist from your saved playlists?"
          }
          confirmLabel={
            pendingPlaylistAction.type === "delete"
              ? "Yes, Delete"
              : "Yes, Remove"
          }
          pendingLabel={
            pendingPlaylistAction.type === "delete"
              ? "Deleting..."
              : "Removing..."
          }
          error={confirmationError}
          pending={confirmingPlaylistAction}
          onConfirm={() => void handleConfirmPlaylistAction()}
          onCancel={() => {
            setPendingPlaylistAction(null);
            setConfirmationError(null);
          }}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Create playlist
            </h1>

            <form
              onSubmit={submitCreate}
              className="mt-6 flex flex-col gap-4"
            >
              <input
                value={newPlaylistName}
                onChange={(event) =>
                  setNewPlaylistName(event.target.value)
                }
                placeholder="Playlist name"
                aria-label="Playlist name"
                required
                maxLength={100}
                autoFocus
                className="rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {creating ? "Creating..." : "Create playlist"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}