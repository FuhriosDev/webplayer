"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Song = {
  name: string;
  url: string;
  filePath: string;
};

type SongListProps = {
  songs: Song[];
  refresh: () => void;
  onSelect: (url: string, name: string, filePath: string) => void;
  onDelete?: (filePath: string) => void;
};

export default function SongList({ songs, refresh, onSelect, onDelete }: SongListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

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

  const handleShare = (filePath: string, songName: string) => {
    try {
      const shareUrl = `${window.location.origin}/share/${encodeURIComponent(filePath)}`;
      navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard!");
    } catch (err) {
      // fallback if clipboard is not available
      alert(`Share link: ${window.location.origin}/share/${encodeURIComponent(filePath)}`);
    }
  };

  return (
    <div className="w-full max-w-xl mt-8 rounded-2xl border border-zinc-200 bg-white shadow dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-xl font-semibold px-6 pt-6 pb-2 text-zinc-900 dark:text-zinc-50">Songs</h2>
      <ul>
        {songs.map((song) => (
          <li
            key={song.filePath}
            className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
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
                  onClick={() => onSelect(song.url, song.name, song.filePath)}
                >
                  {song.name}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(song.filePath); setNewName(song.name); }}
                    aria-label="Edit song"
                    className="inline-flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleShare(song.filePath, song.name)}
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
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
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