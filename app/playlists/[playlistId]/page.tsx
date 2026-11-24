"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import HeaderBar from "@/app/components/HeaderBar";
import MusicPlayer from "@/app/components/MusicPlayer";
import SongList from "@/app/components/SongList";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchPlaylist,
  fetchPlaylistSongs,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  type Playlist,
} from "@/lib/playlists";
import type { Song } from "@/lib/song";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { getErrorMessage } from "@/lib/errorMessage";

export default function PlaylistPage() {
  const params = useParams();
  const playlistId = params.playlistId as string;

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

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedPlaylist, loadedItems] = await Promise.all([
          fetchPlaylist(playlistId),
          fetchPlaylistSongs(playlistId),
        ]);

        if (!loadedPlaylist) {
          setError("Playlist not found.");
          return;
        }

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
  }, [playlistId]);

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
    await removeSongFromPlaylist(playlistId, shareToken);
    setSongs((current) =>
      current.filter((song) => song.shareToken !== shareToken)
    );
  };

  const handleReorder = async (orderedTokens: string[]) => {
    const previousSongs = songs;
    const byToken = new Map(
      songs.map((song) => [song.shareToken, song])
    );
    const reordered = orderedTokens
      .map((token) => byToken.get(token))
      .filter((song): song is Song => song !== undefined);

    setSongs(reordered);

    try {
      await reorderPlaylistSongs(playlistId, orderedTokens);
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
        onSignOut={async () => {
          await supabase.auth.signOut();
        }}
      />

      <main className="flex-1 flex flex-col items-center p-6">
        <h1 className="w-full max-w-xl text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {playlist.name}
        </h1>

        <SongList
          mode="playlist"
          songs={songs}
          userId={user?.id ?? ""}
          refresh={async () => {
            setSongs(
              (await fetchPlaylistSongs(playlistId)).map((song) => ({
                ...song,
                isOwner: false,
              }))
            );
          }}
          onRemove={handleRemove}
          onSelect={handleSelectSong}
          onReorder={handleReorder}
        />
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