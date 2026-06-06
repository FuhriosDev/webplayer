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
  const filePath = decodeURIComponent(params.id as string);

  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [songName, setSongName] = useState<string>("Song");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const { data } = supabase.storage.from("songs").getPublicUrl(filePath);
        const { data: metas } = await supabase
          .from("songs_meta")
          .select("display_name")
          .eq("file_path", filePath)
          .single();

        setPublicUrl(data.publicUrl);
        setSongName(metas?.display_name || filePath.split("/").pop() || "Song");
      } catch (err) {
        console.error("Error loading song:", err);
        setError("Song not found or cannot be accessed.");
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [filePath]);

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

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-black">
      {user && (
        <HeaderBar
          user={user}
          onUpload={() => setShowModal(true)}
          onSignOut={handleSignOut}
        />
      )}

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
        {!user && <SignInButton />}

        <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            {songName}
          </h1>
          {publicUrl && <MusicPlayer src={publicUrl} title={songName} />}
        </div>
      </main>
    </div>
  );
}