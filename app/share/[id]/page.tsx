"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MusicPlayer from "@/app/components/MusicPlayer";

export default function SharePage() {
  const params = useParams();
  const filePath = decodeURIComponent(params.id as string);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [songName, setSongName] = useState<string>("Song");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSong = async () => {
      try {
        // Get public URL for the song
        const { data } = supabase.storage
          .from("songs")
          .getPublicUrl(filePath);

        // Fetch metadata to get display name
        const { data: metas } = await supabase
          .from("songs_meta")
          .select("display_name")
          .eq("file_path", filePath)
          .single();

        setPublicUrl(data.publicUrl);
        setSongName(metas?.display_name || filePath.split("/").pop() || "Song");
      } catch (err) {
        console.error("Error loading song:", err);
        setError("Song not found or cannot be accessed.");
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [filePath]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-900 dark:text-zinc-50">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-6">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
          {songName}
        </h1>
        {publicUrl && <MusicPlayer src={publicUrl} title={songName} />}
      </div>
    </div>
  );
}