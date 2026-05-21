"use client";
import { useEffect, useState } from "react";
import UploadModal from "./components/UploadModal";
import MusicPlayer from "./components/MusicPlayer";
import { fetchSongs } from "@/lib/fetchSongs"; // adjust path if needed
import SongList from "./components/SongList";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);

  type Song = {
    name: string;
    url: string;
    filePath: string;
  };

  useEffect(() => {
    fetchSongs().then((songs) => {
      console.log("Fetched songs:", songs);
      setSongs(songs);
    });
  }, []);

  const refreshSongs = () => fetchSongs().then(setSongs);

  const handleSelectSong = (url: string, name: string) => {
    setAudioUrl(url);
    setAudioTitle(name);
  };

  // Pass these setters to UploadModal so it can update them after upload
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-6">
      {!showModal && (
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-zinc-950 px-6 py-3 text-white font-semibold"
        >
          Upload Audio
        </button>
      )}
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUploadSuccess={(url: string, title: string) => {
            setAudioUrl(url);
            setAudioTitle(title);
            setShowModal(false);
            refreshSongs(); // <-- Add this line to refresh the list!
          }}
        />
      )}
      {audioUrl && (
        <MusicPlayer src={audioUrl} title={audioTitle ?? undefined} />
      )}
      <SongList songs={songs} refresh={refreshSongs} onSelect={handleSelectSong} />
    </div>
  );
}