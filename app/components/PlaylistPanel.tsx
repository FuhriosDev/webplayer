"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPlaylist as createPlaylistRecord,
  deletePlaylist,
  renamePlaylist,
  type Playlist,
} from "@/lib/playlists";

type PlaylistPanelProps = {
  userId: string;
  playlists: Playlist[];
  onPlaylistsChange: (playlists: Playlist[]) => void;
};

export default function PlaylistPanel({
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
  const [pendingDeletePlaylistId, setPendingDeletePlaylistId] =
    useState<string | null>(null);

  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setPlaylistError(
        error instanceof Error
          ? error.message
          : "Could not create playlist."
      );
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
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not rename playlist."
      );
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    setActionError(null);

    try {
      await deletePlaylist(playlistId);

      onPlaylistsChange(
        playlists.filter((playlist) => playlist.id !== playlistId)
      );

      setPendingDeletePlaylistId(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete playlist."
      );
    }
  };

  const handleSharePlaylist = async (playlist: Playlist) => {
    const shareUrl = `${window.location.origin}/playlists/${playlist.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Playlist link copied to clipboard!");
    } catch {
      alert(`Playlist link: ${shareUrl}`);
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
      <div className="mt-8 w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex justify-end px-6 pt-4 pb-4">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            aria-label="Create playlist"
            title="Create playlist"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-xl text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            +
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
          {playlists.map((playlist) =>
            editingPlaylistId === playlist.id ? (
              <li
                key={playlist.id}
                className="flex items-center border-b border-zinc-100 px-6 py-3 last:border-b-0 dark:border-zinc-800"
              >
                <input
                  value={editedPlaylistName}
                  onChange={(event) =>
                    setEditedPlaylistName(event.target.value)
                  }
                  className="mr-4 h-9 flex-1 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  autoFocus
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void handleRenamePlaylist(playlist.id)
                    }
                    className="inline-flex h-9 items-center justify-center rounded bg-green-600 px-3 text-sm text-white hover:bg-green-700"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPlaylistId(null)}
                    className="inline-flex h-9 items-center justify-center rounded bg-zinc-300 px-3 text-sm text-zinc-800 hover:bg-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={playlist.id}
                className="flex items-center justify-between border-b border-zinc-100 px-6 py-3 last:border-b-0 dark:border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/playlists/${playlist.id}`)
                  }
                  className="flex-1 cursor-pointer text-left text-zinc-800 hover:underline dark:text-zinc-100"
                >
                  {playlist.name}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Edit ${playlist.name}`}
                    onClick={() => {
                      setEditingPlaylistId(playlist.id);
                      setEditedPlaylistName(playlist.name);
                    }}
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

                  <button
                    type="button"
                    aria-label={`Share ${playlist.name}`}
                    onClick={() => void handleSharePlaylist(playlist)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded bg-green-600 text-white hover:bg-green-700"
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
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.59 13.51l6.83 3.99" />
                      <path d="M8.59 10.49l6.83-3.99" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${playlist.name}`}
                    onClick={() =>
                      setPendingDeletePlaylistId(playlist.id)
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        {playlists.length === 0 && (
          <p className="px-6 py-4 text-sm text-zinc-500">
            No playlists yet.
          </p>
        )}
      </div>

      {pendingDeletePlaylistId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-900">
            <p className="mb-6 text-lg text-zinc-900 dark:text-zinc-100">
              Are you sure you want to delete this playlist?
            </p>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  void handleDeletePlaylist(pendingDeletePlaylistId)
                }
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
              >
                Yes, Delete
              </button>

              <button
                type="button"
                onClick={() => setPendingDeletePlaylistId(null)}
                className="rounded bg-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              Create playlist
            </h1>

            <form
              onSubmit={submitCreate}
              className="mt-8 flex flex-col gap-4"
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
                className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />

              <div className="flex justify-between">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create playlist"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
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