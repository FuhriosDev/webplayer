"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Song } from "@/lib/song";
import { supabase } from "@/lib/supabaseClient";
import MusicPlayer from "@/app/components/MusicPlayer";
import { useLibraryState } from "./LibraryStateProvider";

type RepeatMode = "off" | "all" | "one";

type PlaybackContextValue = {
  currentSong: Song | null;
  playSong: (song: Song, queue: Song[]) => void;
  playSongs: (songs: Song[], shouldShuffle?: boolean) => void;
  stopPlayback: () => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function shuffleSongs(songs: Song[]) {
  const shuffled = [...songs];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { syncUser } = useLibraryState();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [sourceQueue, setSourceQueue] = useState<Song[]>([]);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [playRequest, setPlayRequest] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const authUserIdRef = useRef<string | null>(null);

  const playSong = useCallback((song: Song, queue: Song[]) => {
    const completeQueue = queue.some(
      (queuedSong) => queuedSong.shareToken === song.shareToken
    )
      ? queue
      : [...queue, song];

    setSourceQueue(completeQueue);
    setPlayQueue(
      shuffle
        ? [
            song,
            ...shuffleSongs(
              completeQueue.filter(
                (queuedSong) => queuedSong.shareToken !== song.shareToken
              )
            ),
          ]
        : completeQueue
    );
    setCurrentSong(song);
    setPlayRequest((request) => request + 1);
  }, [shuffle]);

  const playSongs = useCallback((songs: Song[], shouldShuffle = false) => {
    if (songs.length === 0) return;

    const queue = shouldShuffle ? shuffleSongs(songs) : songs;
    setSourceQueue(songs);
    setPlayQueue(queue);
    setShuffle(shouldShuffle);
    setCurrentSong(queue[0]);
    setPlayRequest((request) => request + 1);
  }, []);

  const stopPlayback = useCallback(() => {
    setCurrentSong(null);
    setSourceQueue([]);
    setPlayQueue([]);
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      const previousUserId = authUserIdRef.current;
      authUserIdRef.current = nextUserId;
      syncUser(nextUserId);

      if (!nextUserId || (previousUserId && previousUserId !== nextUserId)) {
        stopPlayback();
        setShuffle(false);
        setRepeatMode("off");
      }
    });

    return () => data.subscription.unsubscribe();
  }, [stopPlayback, syncUser]);

  const currentIndex = currentSong
    ? playQueue.findIndex(
        (song) => song.shareToken === currentSong.shareToken
      )
    : -1;
  const canPrevious =
    currentIndex >= 0 &&
    playQueue.length > 1 &&
    (currentIndex > 0 || repeatMode === "all");
  const canNext =
    currentIndex >= 0 &&
    playQueue.length > 1 &&
    (currentIndex < playQueue.length - 1 || repeatMode === "all");

  const playIndex = useCallback(
    (index: number) => {
      const song = playQueue[index];
      if (!song) return;

      setCurrentSong(song);
      setPlayRequest((request) => request + 1);
    },
    [playQueue]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < 0 || playQueue.length === 0) return;
    if (currentIndex < playQueue.length - 1) {
      playIndex(currentIndex + 1);
    } else if (repeatMode === "all") {
      playIndex(0);
    }
  }, [currentIndex, playQueue.length, playIndex, repeatMode]);

  const handlePrevious = useCallback(() => {
    if (currentIndex < 0 || playQueue.length === 0) return;
    if (currentIndex > 0) {
      playIndex(currentIndex - 1);
    } else if (repeatMode === "all") {
      playIndex(playQueue.length - 1);
    }
  }, [currentIndex, playQueue.length, playIndex, repeatMode]);

  const handleSongEnded = useCallback(() => {
    if (currentIndex < 0) return;
    if (repeatMode === "one") {
      setPlayRequest((request) => request + 1);
      return;
    }

    if (currentIndex < playQueue.length - 1) {
      playIndex(currentIndex + 1);
    } else if (repeatMode === "all") {
      playIndex(0);
    }
  }, [currentIndex, playQueue.length, playIndex, repeatMode]);

  const toggleShuffle = useCallback(() => {
    const nextShuffle = !shuffle;
    setShuffle(nextShuffle);
    if (!currentSong) return;

    if (nextShuffle) {
      const index = playQueue.findIndex(
        (song) => song.shareToken === currentSong.shareToken
      );
      if (index < 0) return;
      setPlayQueue([
        ...playQueue.slice(0, index + 1),
        ...shuffleSongs(playQueue.slice(index + 1)),
      ]);
    } else {
      setPlayQueue(sourceQueue);
    }
  }, [currentSong, playQueue, shuffle, sourceQueue]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) =>
      mode === "off" ? "all" : mode === "all" ? "one" : "off"
    );
  }, []);

  const value = useMemo(
    () => ({ currentSong, playSong, playSongs, stopPlayback }),
    [currentSong, playSong, playSongs, stopPlayback]
  );
  const downloadFileName =
    currentSong?.filePath.split("/").pop() || currentSong?.name || "song";
  const downloadUrl = currentSong
    ? supabase.storage
        .from("songs")
        .getPublicUrl(currentSong.filePath, { download: downloadFileName })
        .data.publicUrl
    : "";

  return (
    <PlaybackContext.Provider value={value}>
      <div data-player-active={currentSong ? "true" : undefined}>{children}</div>
      {currentSong && (
        <MusicPlayer
          src={currentSong.url}
          title={currentSong.name}
          artist={currentSong.artist}
          onEnded={handleSongEnded}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canNext={canNext}
          canPrevious={canPrevious}
          downloadUrl={downloadUrl}
          queue={playQueue}
          currentSongToken={currentSong.shareToken}
          onSelectQueueSong={playIndex}
          playRequest={playRequest}
          shuffle={shuffle}
          onToggleShuffle={toggleShuffle}
          repeatMode={repeatMode}
          onCycleRepeat={cycleRepeatMode}
        />
      )}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within a PlaybackProvider.");
  }
  return context;
}
