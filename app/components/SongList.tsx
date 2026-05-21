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
  onSelect: (url: string, name: string) => void;
};

export default function SongList({ songs, refresh, onSelect }: SongListProps) {
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
    await supabase.storage.from("songs").remove([pendingDelete!]);
    await supabase.from("songs_meta").delete().eq("file_path", pendingDelete!);
    setPendingDelete(null);
    refresh();
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
                  className="flex-1 mr-4 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(song.filePath)}
                    className="rounded bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded bg-zinc-300 px-3 py-1 text-zinc-800 text-sm hover:bg-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <span
                  className="flex-1 text-zinc-800 dark:text-zinc-100 cursor-pointer hover:underline"
                  onClick={() => onSelect(song.url, song.name)}
                >
                  {song.name}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(song.filePath); setNewName(song.name); }}
                    className="rounded bg-blue-600 px-3 py-1 text-white text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPendingDelete(song.filePath)}
                    className="rounded bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700"
                  >
                    Delete
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