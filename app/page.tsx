"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "./components/UploadModal";
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
import { usePlayback } from "@/app/providers/PlaybackProvider";
import SignInButton from "./components/SignInButton";

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const playback = usePlayback();
  const library = useLibraryState();
  const {
    songsLoaded,
    setSongs,
    setSongsLoaded,
    playlistsLoaded,
    setPlaylists,
    setPlaylistsLoaded,
  } = library;

  const sessionUserIdRef = useRef<string | null>(null);
  const handleSessionChange = useCallback((session: Session | null) => {
    const nextUserId = session?.user.id ?? null;
    if (sessionUserIdRef.current === nextUserId) return;
    sessionUserIdRef.current = nextUserId;

    setSongsError(null);
    setPlaylistsError(null);
  }, []);
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

  const handleSelectSong = (song: Song, queue: Song[]) =>
    playback.playSong(song, queue);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-black">
        <HeaderBar
          user={user}
          onSignOut={handleSignOut}
        />

      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
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

            <div className="w-full max-w-5xl">
              <div className="mb-7">
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                  Your library
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Your songs and playlists, all in one place.
                </p>
              </div>
              <div
                className="inline-flex gap-1 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-900"
                role="tablist"
                aria-label="Library"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={library.libraryView === "songs"}
                  onClick={() => library.setLibraryView("songs")}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                    library.libraryView === "songs"
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Songs
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={library.libraryView === "playlists"}
                  onClick={() => library.setLibraryView("playlists")}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                    library.libraryView === "playlists"
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
                  onSelect={handleSelectSong}
                  currentSongToken={playback.currentSong?.shareToken}
                  onDelete={(deletedFilePath) => {
                    if (
                      deletedFilePath &&
                      deletedFilePath === playback.currentSong?.filePath
                    ) {
                      playback.stopPlayback();
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
        {!user && (
          <section className="relative mt-4 w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200/80 bg-white px-6 py-8 text-center shadow-sm shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none sm:mt-8 sm:px-12 sm:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/10 to-transparent"
            />
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <p className="relative mt-6 text-sm font-medium text-blue-600 dark:text-blue-400">
              YOUR PERSONAL MUSIC SPACE
            </p>
            <h1 className="relative mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
              Your music, in one place.
            </h1>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Sign in to organize your songs, create playlists, and keep your
              collection close.
            </p>
            <div className="relative mt-6 flex justify-center">
              <SignInButton />
            </div>
          </section>
        )}
      </main>

    </div>
  );
}