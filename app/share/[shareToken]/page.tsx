"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MusicPlayer from "@/app/components/MusicPlayer";
import HeaderBar from "@/app/components/HeaderBar";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { getErrorMessage } from "@/lib/errorMessage";

type SavedSongStatus = {
  key: string;
  isSaved: boolean;
  isOwner: boolean;
};

function getSavedSongKey(userId: string | undefined, shareToken: string) {
  return JSON.stringify([userId ?? null, shareToken]);
}

export default function SharePage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [songName, setSongName] = useState<string>("Song");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const session = useAuthSession();
  const user = session?.user ?? null;
  const [saving, setSaving] = useState(false);
  const [savedSongStatus, setSavedSongStatus] =
    useState<SavedSongStatus | null>(null);
  const [saveErrorState, setSaveErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [statusErrorState, setStatusErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const userId = user?.id;
  const savedSongKey = getSavedSongKey(userId, shareToken);
  const currentSavedSongStatus =
    savedSongStatus?.key === savedSongKey ? savedSongStatus : null;
  const isSaved = currentSavedSongStatus?.isSaved ?? false;
  const isOwner = currentSavedSongStatus?.isOwner ?? false;
  const checkingSaved = Boolean(userId) && !currentSavedSongStatus;
  const saveError =
    saveErrorState?.key === savedSongKey ? saveErrorState.message : null;
  const statusError =
    statusErrorState?.key === savedSongKey ? statusErrorState.message : null;

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const response = await fetch(`/api/share/${shareToken}`);
        if (!response.ok) {
          throw new Error("Song not found or cannot be accessed.");
        }
        const song: { display_name: string; file_path: string } =
          await response.json();

        const { data } = supabase.storage
          .from("songs")
          .getPublicUrl(song.file_path);

        setPublicUrl(data.publicUrl);
        setSongName(song.display_name || "Song");
      } catch (err) {
        console.error("Error loading song:", err);
        setError("Song not found or cannot be accessed.");
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [shareToken]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const key = getSavedSongKey(userId, shareToken);
    let isSaved = false;
    let isOwner = false;

    const checkSaved = async () => {
      try {
        const [savedResult, ownerResult] = await Promise.all([
          supabase
            .from("saved_songs")
            .select("share_token")
            .eq("user_id", userId)
            .eq("share_token", shareToken)
            .maybeSingle(),

          supabase
            .from("songs_meta")
            .select("share_token")
            .eq("user_id", userId)
            .eq("share_token", shareToken)
            .maybeSingle(),
        ]);

        if (savedResult.error) throw savedResult.error;
        if (ownerResult.error) throw ownerResult.error;

        isSaved = Boolean(savedResult.data);
        isOwner = Boolean(ownerResult.data);
        if (!cancelled) {
          setStatusErrorState((current) =>
            current?.key === key ? null : current
          );
        }
      } catch (err) {
        if (!cancelled) {
          setStatusErrorState({
            key,
            message: getErrorMessage(err, "Could not check song status."),
          });
        }
      } finally {
        if (!cancelled) {
          setSavedSongStatus({
            key,
            isSaved,
            isOwner,
          });
        }
      }
    };

    void checkSaved();

    return () => {
      cancelled = true;
    };
  }, [userId, shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-900 dark:text-zinc-50">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveSong = async () => {
    if (!user || isOwner || saving || isSaved) return;

    const key = getSavedSongKey(user.id, shareToken);
    setSaving(true);
    setSaveErrorState(null);

    try {
      const { error } = await supabase.from("saved_songs").insert({
        user_id: user.id,
        share_token: shareToken,
      });

      if (error?.code === "23505") {
        setSavedSongStatus((current) => ({
          key,
          isSaved: true,
          isOwner: current?.key === key ? current.isOwner : false,
        }));
        return;
      }

      if (error) throw error;

      setSavedSongStatus((current) => ({
        key,
        isSaved: true,
        isOwner: current?.key === key ? current.isOwner : false,
      }));
    } catch (err) {
      console.error("Error saving song:", err);
      setSaveErrorState({
        key,
        message: "Failed to save song. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-black">
        <HeaderBar
          user={user}
          onSignOut={handleSignOut}
        />

      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            {songName}
          </h1>
          {publicUrl && <MusicPlayer src={publicUrl} title={songName} />}
          {user && !isOwner && (
  <button
    type="button"
    onClick={handleSaveSong}
    disabled={checkingSaved || Boolean(statusError) || saving || isSaved}
    className="mt-4 rounded bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    {checkingSaved
      ? "Checking..."
      : saving
        ? "Saving..."
        : isSaved
          ? "Saved"
          : "Save song"}
  </button>
)}

{user && isOwner && <p>Already in your library</p>}

{statusError && (
  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
    {statusError}
  </p>
)}

{saveError && (
  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
    {saveError}
  </p>
)}
        </div>
      </main>
    </div>
  );
}