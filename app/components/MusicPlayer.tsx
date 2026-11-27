"use client";

import { useEffect, useRef, useState } from "react";
import type { Song } from "@/lib/song";

type MusicPlayerProps = {
  src: string;
  title?: string;
  onEnded: () => void;
  onNext: () => void;
  onPrevious: () => void;
  canNext: boolean;
  canPrevious: boolean;
  downloadUrl: string;
  queue: Song[];
  currentSongToken: string;
  onSelectQueueSong: (index: number) => void;
  playRequest: number;
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: "off" | "all" | "one";
  onCycleRepeat: () => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function ControlButton({
  label,
  active = false,
  pressed,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "text-blue-600 dark:text-blue-400"
          : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

export default function MusicPlayer({
  src,
  title,
  onEnded,
  onNext,
  onPrevious,
  canNext,
  canPrevious,
  downloadUrl,
  queue,
  currentSongToken,
  onSelectQueueSong,
  playRequest,
  shuffle,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [queueOpen, setQueueOpen] = useState(false);
  const queueControlRef = useRef<HTMLDivElement>(null);
  const queueButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    void audio.play().catch((error) => {
      setPlaying(false);
      console.error("Could not start playback:", error);
    });
  }, [src, playRequest]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!queueOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !queueControlRef.current?.contains(event.target)
      ) {
        setQueueOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setQueueOpen(false);
      queueButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [queueOpen]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch((error) => {
        console.error("Could not start playback:", error);
      });
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(event.currentTarget.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(event.currentTarget.value));
  };

  const repeatLabel =
    repeatMode === "one"
      ? "Repeat one"
      : repeatMode === "all"
        ? "Repeat all"
        : "Turn repeat on";
  const seekDuration = Number.isFinite(duration) ? duration : 0;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/80 bg-zinc-50/95 text-zinc-900 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur dark:border-zinc-800/80 dark:bg-black/95 dark:text-zinc-100">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadStart={() => {
          setCurrentTime(0);
          setDuration(0);
        }}
        onLoadedMetadata={(event) => {
          setDuration(
            Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : 0
          );
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onDurationChange={(event) =>
          setDuration(
            Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : 0
          )
        }
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (repeatMode === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
          }
          onEnded();
        }}
      />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,1.5fr)_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-2 sm:px-6 sm:py-3">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold"
            title={title || "Now playing"}
          >
            {title || "Now playing"}
          </p>
        </div>

        <div className="flex items-center justify-end gap-0.5 sm:justify-center sm:gap-1">
          <ControlButton
            label="Shuffle"
            active={shuffle}
            pressed={shuffle}
            onClick={onToggleShuffle}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M4 7h3l10 10h3" />
              <path d="m17 14 3 3-3 3" />
              <path d="M4 17h3L17 7h3" />
              <path d="m17 4 3 3-3 3" />
            </svg>
          </ControlButton>

          <ControlButton
            label="Previous song"
            disabled={!canPrevious}
            onClick={onPrevious}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 5h2v14H6zM20 5v14L9 12z" />
            </svg>
          </ControlButton>

          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            title={playing ? "Pause" : "Play"}
            onClick={handlePlayPause}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {playing ? (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M7 5h4v14H7zM15 5h4v14h-4z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </button>

          <ControlButton
            label="Next song"
            disabled={!canNext}
            onClick={onNext}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
            </svg>
          </ControlButton>

          <ControlButton
            label={repeatLabel}
            active={repeatMode !== "off"}
            pressed={repeatMode !== "off"}
            onClick={onCycleRepeat}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11V9a3 3 0 0 1 3-3h15" />
              <path d="m7 22-4-4 4-4" />
              <path d="M21 13v2a3 3 0 0 1-3 3H3" />
            </svg>
            {repeatMode === "one" && (
              <span className="absolute bottom-1 right-1 text-[9px] font-bold">
                1
              </span>
            )}
          </ControlButton>
        </div>

        <div className="col-span-2 flex min-w-0 items-center justify-end gap-1 sm:col-span-1 sm:gap-2">
          <a
            href={downloadUrl}
            download
            aria-label="Download song"
            title="Download song"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m7 10 5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
          </a>

          <div className="relative" ref={queueControlRef}>
            <button
              ref={queueButtonRef}
              type="button"
              aria-label="Playback queue"
              aria-expanded={queueOpen}
              aria-haspopup="dialog"
              title="Playback queue"
              onClick={() => setQueueOpen((open) => !open)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h10" />
                <path d="m18 16 3 2-3 2" />
              </svg>
            </button>

            {queueOpen && (
              <div
                role="dialog"
                aria-label="Playback queue"
                className="absolute bottom-full right-0 z-[60] mb-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              >
                <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-700">
                  Queue ({queue.length})
                </h2>
                <ol className="max-h-64 overflow-y-auto p-2">
                  {queue.map((song, index) => {
                    const isCurrentSong = song.shareToken === currentSongToken;
                    return (
                      <li key={`${song.shareToken}-${index}`}>
                        <button
                          type="button"
                          aria-current={isCurrentSong ? "true" : undefined}
                          onClick={() => {
                            onSelectQueueSong(index);
                            setQueueOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                            isCurrentSong
                              ? "bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-800 dark:text-white"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {song.name}
                          </span>
                          {isCurrentSong && (
                            <span className="shrink-0 text-xs text-blue-600 dark:text-blue-400">
                              Now playing
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden h-5 w-5 shrink-0 text-zinc-500 sm:block"
            aria-hidden="true"
          >
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a10 10 0 0 1 0 14" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
            className="hidden w-24 cursor-pointer accent-zinc-800 sm:block dark:accent-white"
          />
        </div>

        <div className="col-span-2 grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 sm:col-span-3">
          <span className="text-right text-[11px] tabular-nums text-zinc-500">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={seekDuration}
            step="0.1"
            value={Math.min(currentTime, seekDuration)}
            onChange={handleSeek}
            aria-label="Seek"
            disabled={!duration}
            className="w-full cursor-pointer accent-zinc-800 disabled:cursor-default dark:accent-white"
          />
          <span className="text-[11px] tabular-nums text-zinc-500">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </footer>
  );
}
