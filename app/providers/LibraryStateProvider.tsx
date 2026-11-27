"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Playlist } from "@/lib/playlists";
import type { Song } from "@/lib/song";

export type LibraryView = "songs" | "playlists";

type LibraryState = {
  songs: Song[];
  setSongs: Dispatch<SetStateAction<Song[]>>;
  songsLoaded: boolean;
  setSongsLoaded: Dispatch<SetStateAction<boolean>>;
  playlists: Playlist[];
  setPlaylists: Dispatch<SetStateAction<Playlist[]>>;
  playlistsLoaded: boolean;
  setPlaylistsLoaded: Dispatch<SetStateAction<boolean>>;
  libraryView: LibraryView;
  setLibraryView: Dispatch<SetStateAction<LibraryView>>;
  syncUser: (userId: string | null) => boolean;
};

const LibraryStateContext = createContext<LibraryState | null>(null);

export function LibraryStateProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoaded, setSongsLoaded] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [libraryView, setLibraryView] = useState<LibraryView>("songs");
  const userIdRef = useRef<string | null>(null);

  const syncUser = useCallback((userId: string | null) => {
    if (userIdRef.current === userId) return false;

    userIdRef.current = userId;
    setSongs([]);
    setSongsLoaded(false);
    setPlaylists([]);
    setPlaylistsLoaded(false);
    return true;
  }, []);

  return (
    <LibraryStateContext.Provider
      value={{
        songs,
        setSongs,
        songsLoaded,
        setSongsLoaded,
        playlists,
        setPlaylists,
        playlistsLoaded,
        setPlaylistsLoaded,
        libraryView,
        setLibraryView,
        syncUser,
      }}
    >
      {children}
    </LibraryStateContext.Provider>
  );
}

export function useLibraryState() {
  const context = useContext(LibraryStateContext);
  if (!context) {
    throw new Error(
      "useLibraryState must be used within a LibraryStateProvider."
    );
  }
  return context;
}
