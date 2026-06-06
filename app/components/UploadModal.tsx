"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UploadModalProps = {
  onClose: () => void;
  onUploadSuccess?: (title?: string) => void;
};

export default function UploadModal({
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [songName, setSongName] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      setError(null);
      return;
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/flac",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a valid audio file (mp3, wav, ogg, m4a, flac).");
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Select an audio file first.");
      return;
    }

    if (!songName.trim()) {
      setError("Please enter a song name.");
      return;
    }

    setUploading(true);
    setMessage("");
    setError(null);

    try {
      // Get user first
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("Please sign in before uploading.");
        setUploading(false);
        return;
      }

      const userId = userData.user.id;
      const safeFileName = sanitizeFileName(file.name);
      const filePath = `uploads/${userId}/${safeFileName}`;

      // Upload to user-specific path
      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setError("Upload failed: " + uploadError.message);
      } else {
        // Get public URL (kept for display; not returned to parent)
        const { data: publicUrlData } = supabase
          .storage
          .from("songs")
          .getPublicUrl(filePath);

        // Save metadata with matching file_path
        const { error: metaError } = await supabase
          .from("songs_meta")
          .insert([
            {
              file_path: filePath,
              display_name: songName,
              user_id: userId,
            },
          ]);

        if (metaError) {
          setError(
            "Upload succeeded but saving song name failed: " + metaError.message
          );
        } else {
          setMessage("Upload successful!");
          onUploadSuccess?.(songName);
        }
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-6">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Upload an audio file
        </h1>

        <label className="mt-8 flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Choose audio
          </span>

          <div className="relative">
            <button
              type="button"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              Select audio file
            </button>

            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {file ? file.name : "No file selected"}
          </p>
        </label>

        {file && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Selected file: <strong>{file.name}</strong> (
            {Math.round(file.size / 1024)} KB)
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Song name
          </span>
          <input
            type="text"
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="Enter song name"
            required
          />
        </label>

        <div className="flex justify-between mt-8">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload audio"}
          </button>
          <button
            onClick={onClose}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
}