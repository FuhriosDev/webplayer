"use client";

import React from "react";

type MusicPlayerProps = {
  src: string;
  title?: string;
};

export default function MusicPlayer({ src, title }: MusicPlayerProps) {
  if (!src) return null;

  return (
    <div className="w-full flex flex-col items-center mt-6">
      {title && (
        <div className="mb-2 text-base font-medium text-zinc-800 dark:text-zinc-100">
          {title}
        </div>
      )}
      <audio controls src={src} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}