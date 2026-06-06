"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "./components/UploadModal";
import MusicPlayer from "./components/MusicPlayer";
import SongList from "./components/SongList";
import AuthPanel from "./components/AuthPanel";
import { fetchSongs } from "@/lib/fetchSongs";
import SignInButton from "./components/SignInButton";
import HeaderBar from "./components/HeaderBar";

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
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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
      setAudioUrl(null);
      setAudioTitle(null);
      setCurrentFilePath(null);
      setProfileOpen(false);
      return;
    }

    refreshSongs();
  }, [user]);

  // close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!profileOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (
        avatarRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setProfileOpen(false);
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!showModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showModal]);

  const handleSelectSong = (url: string, name: string, filePath?: string) => {
    setAudioUrl(url);
    setAudioTitle(name);
    setCurrentFilePath(filePath ?? null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfileOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-zinc-50 dark:bg-black ${audioUrl ? "pb-24" : ""}`}>
      {user && (
        <HeaderBar
          user={user}
          onUpload={() => setShowModal(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Main content: flex-1 so it only fills remaining space and doesn't force extra scroll */}
      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-3xl">
          {!user && <SignInButton />}
        </div>

        {user && (
          <>
            {showModal && (
              <UploadModal
                onClose={() => setShowModal(false)}
                onUploadSuccess={() => {
                  setShowModal(false);
                  refreshSongs();
                }}
              />
            )}

            <div className="w-full max-w-3xl mt-6">
              <SongList
                songs={songs}
                refresh={refreshSongs}
                onSelect={(url, name, filePath) => handleSelectSong(url, name, filePath)}
                onDelete={(deletedFilePath) => {
                  if (deletedFilePath && deletedFilePath === currentFilePath) {
                    setAudioUrl(null);
                    setAudioTitle(null);
                    setCurrentFilePath(null);
                  }
                  refreshSongs();
                }}
              />
            </div>
          </>
        )}
      </main>

      {audioUrl && (
        <MusicPlayer src={audioUrl} title={audioTitle ?? undefined} />
      )}
    </div>
  );
}