"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "./components/UploadModal";
import MusicPlayer from "./components/MusicPlayer";
import SongList from "./components/SongList";
import { fetchSongs } from "@/lib/fetchSongs";
import HeaderBar from "./components/HeaderBar";
import PlaylistPanel from "./components/PlaylistPanel";
import {
  fetchPlaylists,
  type Playlist,
} from "@/lib/playlists";
import type { Song } from "@/lib/song";
import type { Session } from "@supabase/supabase-js";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { getErrorMessage } from "@/lib/errorMessage";

type LibraryView = "songs" | "playlists";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [playRequest, setPlayRequest] = useState(0);
  const [libraryView, setLibraryView] = useState<LibraryView>("songs");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const previousUserId = useRef<string | null>(null);

  const handleSessionChange = useCallback((session: Session | null) => {
    const nextUserId = session?.user.id ?? null;
    if (previousUserId.current === nextUserId) return;

    previousUserId.current = nextUserId;
    setSongs([]);
    setSongsError(null);
    setPlaylists([]);
    setPlaylistsError(null);
    setAudioUrl(null);
    setAudioTitle(null);
    setCurrentFilePath(null);
  }, []);
  const session = useAuthSession(handleSessionChange);
  const user = session?.user ?? null;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const loadSongs = async () => {
      try {
        const loadedSongs = await fetchSongs();
        if (cancelled) return;
        setSongs(loadedSongs);
        setSongsError(null);
      } catch (error) {
        if (!cancelled) {
          setSongsError(getErrorMessage(error, "Could not load songs."));
        }
      }
    };
    const loadPlaylists = async () => {
      try {
        const loadedPlaylists = await fetchPlaylists();
        if (cancelled) return;
        setPlaylists(loadedPlaylists);
        setPlaylistsError(null);
      } catch (error) {
        if (!cancelled) {
          setPlaylistsError(
            getErrorMessage(error, "Could not load playlists.")
          );
        }
      }
    };

    void loadSongs();
    void loadPlaylists();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshSongs = async () => {
    try {
      setSongs(await fetchSongs());
      setSongsError(null);
    } catch (error) {
      setSongsError(getErrorMessage(error, "Could not load songs."));
    }
  };

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
                {songsError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {songsError}
                  </p>
                )}
                <SongList
                  songs={songs}
                  userId={user.id}
                  refresh={refreshSongs}
                  onUpload={() => setShowModal(true)}
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
                {playlistsError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {playlistsError}
                  </p>
                )}
                <PlaylistPanel
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