"use client";
import { useState } from "react";
import UploadModal from "./UploadModal";
import MusicPlayer from "./MusicPlayer";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);

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
    </div>
  );
}