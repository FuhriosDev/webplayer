"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "./components/UploadModal";
import MusicPlayer from "./components/MusicPlayer";
import SongList from "./components/SongList";
import { fetchSongs } from "@/lib/fetchSongs";
import HeaderBar from "./components/HeaderBar";
import PlaylistPanel from "./components/PlaylistPanel";
import { fetchPlaylists } from "@/lib/playlists";
import type { Song } from "@/lib/song";
import type { Session } from "@supabase/supabase-js";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { getErrorMessage } from "@/lib/errorMessage";
import { useLibraryState } from "@/app/providers/LibraryStateProvider";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [playRequest, setPlayRequest] = useState(0);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const library = useLibraryState();
  const {
    songsLoaded,
    setSongs,
    setSongsLoaded,
    playlistsLoaded,
    setPlaylists,
    setPlaylistsLoaded,
    syncUser,
  } = library;

  const handleSessionChange = useCallback((session: Session | null) => {
    const nextUserId = session?.user.id ?? null;
    if (!syncUser(nextUserId)) return;

    setSongsError(null);
    setPlaylistsError(null);
    setAudioUrl(null);
    setAudioTitle(null);
    setCurrentFilePath(null);
  }, [syncUser]);
  const session = useAuthSession(handleSessionChange);
  const user = session?.user ?? null;

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    if (!songsLoaded) {
      const loadSongs = async () => {
        try {
          const loadedSongs = await fetchSongs();
          if (cancelled) return;
          setSongs(loadedSongs);
          setSongsLoaded(true);
          setSongsError(null);
        } catch (error) {
          if (!cancelled) {
            setSongsError(getErrorMessage(error, "Could not load songs."));
          }
        }
      };
      void loadSongs();
    }

    if (!playlistsLoaded) {
      const loadPlaylists = async () => {
        try {
          const loadedPlaylists = await fetchPlaylists();
          if (cancelled) return;
          setPlaylists(loadedPlaylists);
          setPlaylistsLoaded(true);
          setPlaylistsError(null);
        } catch (error) {
          if (!cancelled) {
            setPlaylistsError(
              getErrorMessage(error, "Could not load playlists.")
            );
          }
        }
      };
      void loadPlaylists();
    }

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    songsLoaded,
    setSongs,
    setSongsLoaded,
    playlistsLoaded,
    setPlaylists,
    setPlaylistsLoaded,
  ]);

  const refreshSongs = async () => {
    try {
      setSongs(await fetchSongs());
      setSongsLoaded(true);
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
                  aria-selected={library.libraryView === "songs"}
                  onClick={() => library.setLibraryView("songs")}
                  className={`border-b-2 px-5 py-3 text-sm font-semibold ${
                    library.libraryView === "songs"
                      ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Songs
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={library.libraryView === "playlists"}
                  onClick={() => library.setLibraryView("playlists")}
                  className={`border-b-2 px-5 py-3 text-sm font-semibold ${
                    library.libraryView === "playlists"
                      ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Playlists
                </button>
              </div>

              <div hidden={library.libraryView !== "songs"}>
                {songsError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {songsError}
                  </p>
                )}
                <SongList
                  songs={library.songs}
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

              <div hidden={library.libraryView !== "playlists"}>
                {playlistsError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {playlistsError}
                  </p>
                )}
                <PlaylistPanel
                  userId={user.id}
                  playlists={library.playlists}
                  onPlaylistsChange={library.setPlaylists}
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