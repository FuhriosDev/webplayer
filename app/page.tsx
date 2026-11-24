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
import PlaylistPanel from "./components/PlaylistPanel";
import {
  fetchPlaylists,
  type Playlist,
} from "@/lib/playlists";

type Song = {
  name: string;
  url: string;
  filePath: string;
  shareToken: string;
  isOwner?: boolean;
};

type LibraryView = "songs" | "playlists";

export default function Home() {
  const [user, setUser] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [playRequest, setPlayRequest] = useState(0);
  const [playlistRefreshKey, setPlaylistRefreshKey] = useState(0);
  const [libraryView, setLibraryView] = useState<LibraryView>("songs");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const avatarRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const refreshSongs = async () => {
    const songs = await fetchSongs();
    setSongs(songs);
  };

  const refreshPlaylists = async () => {
    const result = await fetchPlaylists();
    setPlaylists(result);
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
      setPlaylists([]);
      setAudioUrl(null);
      setAudioTitle(null);
      setCurrentFilePath(null);
      setProfileOpen(false);
      return;
    }

    void refreshSongs();
    void refreshPlaylists();
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

  const handleSelectSong = (
    url: string,
    name: string,
    filePath: string,
    queue: Song[]
  ) => {
    setAudioUrl(url);
    setAudioTitle(name);
    setCurrentFilePath(filePath);
    setPlayQueue(queue);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfileOpen(false);
  };

  const handleSongEnded = () => {
    const currentIndex = playQueue.findIndex(
      (song) => song.filePath === currentFilePath
    );
    const nextSong = playQueue[currentIndex + 1];

    if (!nextSong) return;

    setAudioUrl(nextSong.url);
    setAudioTitle(nextSong.name);
    setCurrentFilePath(nextSong.filePath);
    setPlayRequest((request) => request + 1);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-zinc-50 dark:bg-black ${audioUrl ? "pb-24" : ""}`}>
        <HeaderBar
          user={user}
          onSignOut={handleSignOut}
        />

      {/* Main content: flex-1 so it only fills remaining space and doesn't force extra scroll */}
      <main className="flex-1 flex flex-col items-center p-6">
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
              <div
                className="flex border-b border-zinc-200 dark:border-zinc-800"
                role="tablist"
                aria-label="Library"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryView === "songs"}
                  onClick={() => setLibraryView("songs")}
                  className={`border-b-2 px-5 py-3 text-sm font-semibold ${
                    libraryView === "songs"
                      ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Songs
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryView === "playlists"}
                  onClick={() => setLibraryView("playlists")}
                  className={`border-b-2 px-5 py-3 text-sm font-semibold ${
                    libraryView === "playlists"
                      ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Playlists
                </button>
              </div>

              <div hidden={libraryView !== "songs"}>
                <SongList
                  songs={songs}
                  userId={user.id}
                  refresh={refreshSongs}
                  onUpload={() => setShowModal(true)}
                  onPlaylistChange={() =>
                    setPlaylistRefreshKey((key) => key + 1)
                  }
                  onSelect={(url, name, filePath, queue) =>
                    handleSelectSong(url, name, filePath, queue)
                  }
                  onDelete={(deletedFilePath) => {
                    if (
                      deletedFilePath &&
                      deletedFilePath === currentFilePath
                    ) {
                      setAudioUrl(null);
                      setAudioTitle(null);
                      setCurrentFilePath(null);
                    }
                    refreshSongs();
                  }}
                />
              </div>

              <div hidden={libraryView !== "playlists"}>
                <PlaylistPanel
                  userId={user.id}
                  playlists={playlists}
                  onPlaylistsChange={setPlaylists}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {audioUrl && (
        <MusicPlayer
          src={audioUrl}
          title={audioTitle ?? undefined}
          onEnded={handleSongEnded}
          playRequest={playRequest}
          autoPlay
        />
      )}
    </div>
  );
}