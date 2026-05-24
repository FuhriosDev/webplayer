"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "./components/UploadModal";
import MusicPlayer from "./components/MusicPlayer";
import SongList from "./components/SongList";
import AuthPanel from "./components/AuthPanel";
import { fetchSongs } from "@/lib/fetchSongs";

type Song = {
  name: string;
  url: string;
  filePath: string;
};

export default function Home() {
  const [user, setUser] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);

  const refreshSongs = async () => {
    const songs = await fetchSongs();
    setSongs(songs);
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSongs([]);
      return;
    }

    refreshSongs();
  }, [user]);

  const handleSelectSong = (url: string, name: string) => {
    setAudioUrl(url);
    setAudioTitle(name);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-zinc-50 dark:bg-black p-6">
      <div className="w-full max-w-3xl">
        <AuthPanel />
      </div>

      {user ? (
        <>
          <div className="mt-6 flex w-full max-w-3xl justify-start">
            {!showModal && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-9 items-center justify-center rounded bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Upload Audio
              </button>
            )}
          </div>

          {showModal && (
            <UploadModal
              onClose={() => setShowModal(false)}
              onUploadSuccess={(url: string, title: string) => {
                setAudioUrl(url);
                setAudioTitle(title);
                setShowModal(false);
                refreshSongs();
              }}
            />
          )}

          {audioUrl && (
            <div className="w-full max-w-3xl mt-6">
              <MusicPlayer src={audioUrl} title={audioTitle ?? undefined} />
            </div>
          )}

          <div className="w-full max-w-3xl mt-6">
            <SongList
              songs={songs}
              refresh={refreshSongs}
              onSelect={handleSelectSong}
            />
          </div>
        </>
      ) : (
        <div className="w-full max-w-3xl mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-700 dark:text-zinc-300">
            Please sign in to upload songs and manage your library.
          </p>
        </div>
      )}
    </div>
  );
}