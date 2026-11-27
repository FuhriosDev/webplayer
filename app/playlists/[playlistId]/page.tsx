"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HeaderBar from "@/app/components/HeaderBar";
import MusicPlayer from "@/app/components/MusicPlayer";
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

export default function PlaylistPage() {
  const params = useParams<{ playlistId: string }>();
  const shareToken = params.playlistId;
  const router = useRouter();
  const {
    setLibraryView,
    setPlaylists,
    setSongs: setLibrarySongs,
    songsLoaded,
  } = useLibraryState();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const session = useAuthSession();
  const user = session?.user ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [playRequest, setPlayRequest] = useState(0);
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
  const userId = user?.id;
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
    const load = async () => {
      try {
        const loadedPlaylist = await fetchPlaylist(shareToken);

        if (!loadedPlaylist) {
          setError("Playlist not found.");
          return;
        }

        const loadedItems = await fetchPlaylistSongs(loadedPlaylist.id);
        setPlaylist(loadedPlaylist);
        setSongs(
          loadedItems.map((song) => ({
            ...song,
            isOwner: false,
          }))
        );
      } catch (loadError) {
        console.error("Error loading playlist:", loadError);
        setError(getErrorMessage(loadError, "Could not load this playlist."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [shareToken]);

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

  const handleRemove = async (shareToken: string) => {
    if (!playlist) return;
    await removeSongFromPlaylist(playlist.id, shareToken);
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
        setSaveStatus({ key: saveStatusKey, isOwner, isSaved: false });
        setPlaylists((current) =>
          current.filter(
            (savedPlaylist) =>
              !(savedPlaylist.id === playlist.id && savedPlaylist.isSaved)
          )
        );
      } else {
        await savePlaylist(playlist.id, userId);
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
      console.error("Could not reorder playlist:", error);
      setSongs(previousSongs);
      setError("Could not save the new song order.");
    }
  };

  if (loading) {
    return <p className="p-6">Loading playlist...</p>;
  }

  if (error || !playlist) {
    return (
      <p className="p-6 text-red-600">
        {error ?? "Playlist not found."}
      </p>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-zinc-50 dark:bg-black ${
        audioUrl ? "pb-24" : ""
      }`}
    >
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

      <main className="flex-1 flex flex-col items-center p-6">
        <h1 className="w-full max-w-xl text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {playlist.name}
        </h1>

        {userId && !checkingSaveStatus && !isOwner && (
          <div className="w-full max-w-xl">
            <button
              type="button"
              onClick={() => void handleToggleSavedPlaylist()}
              disabled={
                Boolean(currentSaveStatusError) ||
                savingPlaylist
              }
              className="mt-3 rounded bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950"
            >
              {savingPlaylist
                ? isSaved
                  ? "Removing..."
                  : "Saving..."
                : isSaved
                  ? "Saved · Remove"
                  : "Save playlist"}
            </button>
            {currentSaveStatusError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {currentSaveStatusError}
              </p>
            )}
          </div>
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
          <p role="alert" className="mt-3 w-full max-w-xl text-sm text-red-600">
            {currentSongSaveStatusError}
          </p>
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