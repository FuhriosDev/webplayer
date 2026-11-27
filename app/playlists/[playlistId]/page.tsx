"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import HeaderBar from "@/app/components/HeaderBar";
import SongList from "@/app/components/SongList";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchPlaylist,
  fetchPlaylistSaveStatus,
  fetchPlaylistSongs,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  savePlaylist,
  unsavePlaylist,
  type Playlist,
} from "@/lib/playlists";
import type { Song } from "@/lib/song";
import {
  fetchSavedSongTokens,
  saveSong,
  unsaveSong,
} from "@/lib/songActions";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { getErrorMessage } from "@/lib/errorMessage";
import { useLibraryState } from "@/app/providers/LibraryStateProvider";
import { usePlayback } from "@/app/providers/PlaybackProvider";

export default function PlaylistPage() {
  const params = useParams<{ playlistId: string }>();
  const shareToken = params.playlistId;
  const router = useRouter();
  const playback = usePlayback();
  const {
    setLibraryView,
    setPlaylists,
    setSongs: setLibrarySongs,
    songsLoaded,
  } = useLibraryState();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    key: string;
    isOwner: boolean;
    isSaved: boolean;
  } | null>(null);
  const [saveStatusError, setSaveStatusError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [savedSongStatus, setSavedSongStatus] = useState<{
    key: string;
    tokens: Set<string>;
  } | null>(null);
  const [songSaveStatusError, setSongSaveStatusError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [loadedPlaylistKey, setLoadedPlaylistKey] = useState<string | null>(
    null
  );
  const sessionUserIdRef = useRef<string | null>(null);
  const handleSessionChange = useCallback((nextSession: Session | null) => {
    const nextUserId = nextSession?.user.id ?? null;
    const previousUserId = sessionUserIdRef.current;
    sessionUserIdRef.current = nextUserId;

    if (previousUserId === null || previousUserId === nextUserId) return;

    setPlaylist(null);
    setSongs([]);
    setError(null);
    setSaveStatus(null);
    setSaveStatusError(null);
    setSavingPlaylist(false);
    setSavedSongStatus(null);
    setSongSaveStatusError(null);
  }, []);
  const session = useAuthSession(handleSessionChange);
  const user = session?.user ?? null;
  const userId = user?.id;
  const playlistLoadKey = JSON.stringify([shareToken, userId ?? null]);
  const loading = loadedPlaylistKey !== playlistLoadKey;
  const saveStatusKey = JSON.stringify([
    userId ?? null,
    playlist?.id ?? shareToken,
  ]);
  const currentSaveStatus =
    saveStatus?.key === saveStatusKey ? saveStatus : null;
  const isOwner = currentSaveStatus?.isOwner ?? false;
  const isSaved = currentSaveStatus?.isSaved ?? false;
  const checkingSaveStatus =
    Boolean(userId) &&
    !currentSaveStatus &&
    saveStatusError?.key !== saveStatusKey;
  const currentSaveStatusError =
    saveStatusError?.key === saveStatusKey ? saveStatusError.message : null;
  const songTokens = useMemo(
    () => songs.map((song) => song.shareToken),
    [songs]
  );
  const songStatusKey = JSON.stringify([
    userId ?? null,
    playlist?.id ?? null,
    songTokens,
  ]);
  const currentSavedSongTokens =
    savedSongStatus?.key === songStatusKey ? savedSongStatus.tokens : null;
  const currentSongSaveStatusError =
    songSaveStatusError?.key === songStatusKey
      ? songSaveStatusError.message
      : null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const loadedPlaylist = await fetchPlaylist(shareToken);
        if (cancelled) return;

        if (!loadedPlaylist) {
          setPlaylist(null);
          setSongs([]);
          setError("Playlist not found.");
          return;
        }

        const loadedItems = await fetchPlaylistSongs(loadedPlaylist.id);
        if (cancelled) return;
        setError(null);
        setPlaylist(loadedPlaylist);
        setSongs(
          loadedItems.map((song) => ({
            ...song,
            isOwner: false,
          }))
        );
      } catch (loadError) {
        if (cancelled) return;
        setPlaylist(null);
        setSongs([]);
        console.error("Error loading playlist:", loadError);
        setError(getErrorMessage(loadError, "Could not load this playlist."));
      } finally {
        if (!cancelled) setLoadedPlaylistKey(playlistLoadKey);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [playlistLoadKey, shareToken, userId]);

  useEffect(() => {
    if (!userId || !playlist) return;

    let cancelled = false;
    const key = JSON.stringify([userId, playlist.id]);

    const loadSaveStatus = async () => {
      try {
        const status = await fetchPlaylistSaveStatus(playlist.id, userId);
        if (cancelled) return;
        setSaveStatus({ key, ...status });
        setSaveStatusError(null);
      } catch (statusError) {
        if (cancelled) return;
        setSaveStatusError({
          key,
          message: getErrorMessage(
            statusError,
            "Could not check playlist save status."
          ),
        });
      }
    };

    void loadSaveStatus();
    return () => {
      cancelled = true;
    };
  }, [playlist, userId]);

  useEffect(() => {
    if (!userId || !playlist || !currentSaveStatus || currentSaveStatus.isOwner)
      return;

    let cancelled = false;
    const key = songStatusKey;

    const loadSavedSongTokens = async () => {
      try {
        const tokens = await fetchSavedSongTokens(userId, songTokens);
        if (!cancelled) setSavedSongStatus({ key, tokens });
      } catch (statusError) {
        if (cancelled) return;
        setSongSaveStatusError(
          {
            key,
            message: getErrorMessage(
              statusError,
              "Could not check saved songs."
            ),
          }
        );
        setSavedSongStatus({ key, tokens: new Set() });
      }
    };

    void loadSavedSongTokens();
    return () => {
      cancelled = true;
    };
  }, [currentSaveStatus, playlist, songStatusKey, songTokens, userId]);

  const handleSelectSong = (song: Song, queue: Song[]) =>
    playback.playSong(song, queue);

  const handleRemove = async (shareToken: string) => {
    if (!playlist) return;
    await removeSongFromPlaylist(playlist.id, shareToken);
    if (sessionUserIdRef.current !== userId) return;
    setSongs((current) =>
      current.filter((song) => song.shareToken !== shareToken)
    );
  };

  const handleToggleSavedPlaylist = async () => {
    if (!userId || !playlist || savingPlaylist) return;

    setSavingPlaylist(true);
    setSaveStatusError(null);
    try {
      if (isSaved) {
        await unsavePlaylist(playlist.id, userId);
        if (sessionUserIdRef.current !== userId) return;
        setSaveStatus({ key: saveStatusKey, isOwner, isSaved: false });
        setPlaylists((current) =>
          current.filter(
            (savedPlaylist) =>
              !(savedPlaylist.id === playlist.id && savedPlaylist.isSaved)
          )
        );
      } else {
        await savePlaylist(playlist.id, userId);
        if (sessionUserIdRef.current !== userId) return;
        setSaveStatus({ key: saveStatusKey, isOwner, isSaved: true });
        setPlaylists((current) =>
          current.some((savedPlaylist) => savedPlaylist.id === playlist.id)
            ? current
            : [...current, { ...playlist, isSaved: true }]
        );
      }
    } catch (error) {
      setSaveStatusError({
        key: saveStatusKey,
        message: getErrorMessage(error, "Could not update saved playlist."),
      });
    } finally {
      setSavingPlaylist(false);
    }
  };

  const handleToggleSongSaved = async (
    shareToken: string,
    isSongSaved: boolean
  ) => {
    if (!userId) return;

    if (isSongSaved) {
      await unsaveSong(userId, shareToken);
    } else {
      await saveSong(userId, shareToken);
    }

    if (sessionUserIdRef.current !== userId) return;

    setSavedSongStatus((current) =>
      current?.key === songStatusKey
        ? {
            key: current.key,
            tokens: new Set(
              isSongSaved
                ? [...current.tokens].filter((token) => token !== shareToken)
                : [...current.tokens, shareToken]
            ),
          }
        : current
    );
    setSongSaveStatusError((current) =>
      current?.key === songStatusKey ? null : current
    );

    const songToSave = songs.find((song) => song.shareToken === shareToken);
    if (songsLoaded && songToSave) {
      setLibrarySongs((current) => {
        if (isSongSaved) {
          return current.filter(
            (song) => song.shareToken !== shareToken || song.isOwner
          );
        }
        return current.some((song) => song.shareToken === shareToken)
          ? current
          : [...current, { ...songToSave, isOwner: false }];
      });
    }
  };

  const handleReorder = async (orderedTokens: string[]) => {
    if (!playlist) return;
    const previousSongs = songs;
    const byToken = new Map(
      songs.map((song) => [song.shareToken, song])
    );
    const reordered = orderedTokens
      .map((token) => byToken.get(token))
      .filter((song): song is Song => song !== undefined);

    setSongs(reordered);

    try {
      await reorderPlaylistSongs(playlist.id, orderedTokens);
    } catch (error) {
      if (sessionUserIdRef.current !== userId) return;
      console.error("Could not reorder playlist:", error);
      setSongs(previousSongs);
      setError("Could not save the new song order.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <HeaderBar
        user={user}
        onProfile={() => {
          setLibraryView("playlists");
          router.push("/");
        }}
        onSignOut={async () => {
          await supabase.auth.signOut();
        }}
      />

      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <div
            aria-label="Loading playlist content"
            aria-busy="true"
            className="w-full max-w-4xl"
          >
            <div className="mb-6 space-y-3">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-9 w-2/3 max-w-sm animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-4 last:border-b-0 dark:border-zinc-800 sm:px-6"
                >
                  <div className="h-4 w-1/2 max-w-xs animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </section>
          </div>
        ) : error || !playlist ? (
          <p role="alert" className="w-full max-w-4xl text-sm text-red-600 dark:text-red-400">
            {error ?? "Playlist not found."}
          </p>
        ) : (
          <div className="w-full max-w-4xl">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
              PLAYLIST
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                {playlist.name}
              </h1>
              {userId && !checkingSaveStatus && !isOwner && (
                <button
                  type="button"
                  onClick={() => void handleToggleSavedPlaylist()}
                  disabled={Boolean(currentSaveStatusError) || savingPlaylist}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-3 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 sm:px-4 sm:text-sm"
                >
                  {savingPlaylist
                    ? isSaved
                      ? "Removing..."
                      : "Saving..."
                    : isSaved
                      ? "Saved · Remove"
                      : "Save playlist"}
                </button>
              )}
            </div>
            {currentSaveStatusError && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {currentSaveStatusError}
              </p>
            )}

            <SongList
              mode="playlist"
              songs={songs}
              userId={user?.id ?? ""}
              canSaveSongs={Boolean(
                userId &&
                  currentSaveStatus &&
                  !isOwner &&
                  currentSavedSongTokens
              )}
              savedSongTokens={currentSavedSongTokens ?? undefined}
              onToggleSongSaved={handleToggleSongSaved}
              refresh={async () => {
                if (!playlist) return;
                setSongs(
                  (await fetchPlaylistSongs(playlist.id)).map((song) => ({
                    ...song,
                    isOwner: false,
                  }))
                );
              }}
              onRemove={isOwner ? handleRemove : undefined}
              onSelect={handleSelectSong}
              onReorder={isOwner ? handleReorder : undefined}
            />
            {currentSongSaveStatusError && (
              <p role="alert" className="mt-3 w-full text-sm text-red-600 dark:text-red-400">
                {currentSongSaveStatusError}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}