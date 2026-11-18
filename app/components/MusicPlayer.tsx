"use client";

import { useEffect, useRef } from "react";

type MusicPlayerProps = {
  src: string;
  title?: string;
  onEnded?: () => void;
  playRequest?: number;
  autoPlay?: boolean;
};

export default function MusicPlayer({
  src,
  title,
  onEnded,
  playRequest = 0,
  autoPlay = false,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!autoPlay || !src) return;

    void audioRef.current?.play().catch((error) => {
      console.error("Could not start playback:", error);
    });
  }, [autoPlay, src, playRequest]);

  if (!src) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white px-4 py-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <div className="min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title || "Now playing"}
        </div>

        <audio
          ref={audioRef}
          controls
          src={src}
          onEnded={onEnded}
          className="w-full min-w-0 dark:bg-zinc-900"
        />
      </div>
    </div>
  );
}