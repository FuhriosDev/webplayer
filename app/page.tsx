"use client";
import { useEffect, useState } from "react";
import UploadModal from "./UploadModal";
import MusicPlayer from "./MusicPlayer";
import { fetchSongs } from "@/lib/fetchSongs"; // adjust path if needed

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [songs, setSongs] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    fetchSongs().then((songs) => {
      console.log("Fetched songs:", songs);
      setSongs(songs);
    });
  }, []);

  // Pass these setters to UploadModal so it can update them after upload
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-6">
      <button
        onClick={() => setShowModal(true)}
        className="rounded-xl bg-zinc-950 px-6 py-3 text-white font-semibold"
      >
        Upload Audio
      </button>
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUploadSuccess={(url: string, title: string) => {
            setAudioUrl(url);
            setAudioTitle(title);
            setShowModal(false);
          }}
        />
      )}
      {audioUrl && (
        <MusicPlayer src={audioUrl} title={audioTitle ?? undefined} />
      )}
      <ul>
        {songs.map((song) => (
          <li
            key={song.name}
            onClick={() => {
              setAudioUrl(song.url);
              setAudioTitle(song.name);
            }}
            style={{ cursor: "pointer", margin: "8px 0" }}
          >
            {song.name}
          </li>
        ))}
      </ul>
    </div>
  );
}