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
};

export default function SongList({ songs, refresh }: SongListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleEdit = async (filePath: string) => {
    await supabase
      .from("songs_meta")
      .update({ display_name: newName })
      .eq("file_path", filePath);
    setEditing(null);
    refresh();
  };

  const handleDelete = async (filePath: string) => {
    await supabase.storage.from("songs").remove([filePath]);
    await supabase.from("songs_meta").delete().eq("file_path", filePath);
    refresh();
  };

  return (
    <ul>
      {songs.map((song) => (
        <li key={song.filePath}>
          {editing === song.filePath ? (
            <>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="New name"
              />
              <button onClick={() => handleEdit(song.filePath)}>Save</button>
              <button onClick={() => setEditing(null)}>Cancel</button>
            </>
          ) : (
            <>
              {song.name}
              <button onClick={() => { setEditing(song.filePath); setNewName(song.name); }}>Edit</button>
              <button onClick={() => handleDelete(song.filePath)}>Delete</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}