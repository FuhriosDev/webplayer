"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MusicPlayer from "@/app/components/MusicPlayer";
import SignInButton from "@/app/components/SignInButton";
import HeaderBar from "@/app/components/HeaderBar";
import UploadModal from "@/app/components/UploadModal";

export default function SharePage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [songName, setSongName] = useState<string>("Song");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

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
    const initSession = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setIsSaved(false);
    setSaveError(null);

    if (!user) {
      setCheckingSaved(false);
      return () => {
        cancelled = true;
      };
    }

    const checkSaved = async () => {
      setCheckingSaved(true);

      try {
        const [savedResult, ownerResult] = await Promise.all([
          supabase
            .from("saved_songs")
            .select("share_token")
            .eq("user_id", user.id)
            .eq("share_token", shareToken)
            .maybeSingle(),

          supabase
            .from("songs_meta")
            .select("share_token")
            .eq("user_id", user.id)
            .eq("share_token", shareToken)
            .maybeSingle(),
        ]);

        if (savedResult.error) throw savedResult.error;
        if (ownerResult.error) throw ownerResult.error;

        if (!cancelled) {
          setIsSaved(Boolean(savedResult.data));
          setIsOwner(Boolean(ownerResult.data));
        }
      } catch (err) {
        console.error("Error checking saved song:", err);
      } finally {
        if (!cancelled) {
          setCheckingSaved(false);
        }
      }
    };

    void checkSaved();

    return () => {
      cancelled = true;
    };
  }, [user?.id, shareToken]);

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
    setUser(null);
  };

  const handleSaveSong = async () => {
    if (!user || isOwner || saving || isSaved) return;

    setSaving(true);
    setSaveError(null);

    try {
      const { error } = await supabase.from("saved_songs").insert({
        user_id: user.id,
        share_token: shareToken,
      });

      if (error?.code === "23505") {
        setIsSaved(true);
        return;
      }

      if (error) throw error;

      setIsSaved(true);
    } catch (err) {
      console.error("Error saving song:", err);
      setSaveError("Failed to save song. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-black">
        <HeaderBar
          user={user}
          onUpload={() => setShowModal(true)}
          onSignOut={handleSignOut}
        />

      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUploadSuccess={() => {
            setShowModal(false);
            router.push("/");
          }}
        />
      )}

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
    disabled={checkingSaved || saving || isSaved}
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