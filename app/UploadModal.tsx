"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UploadModalProps = {
  onClose: () => void;
};

export default function UploadModal({ onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>("");

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

    setUploading(true);
    setMessage("");
    setError(null);

    try {
      const safeFileName = sanitizeFileName(file.name);
      const { data, error } = await supabase.storage
        .from("songs")
        .upload(`uploads/${safeFileName}`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        setError("Upload failed: " + error.message);
      } else {
        // Get the public URL
        const { data: publicUrlData } = supabase
          .storage
          .from("songs") // replace with your bucket name
          .getPublicUrl(`uploads/${safeFileName}`);

        setMessage(`Upload successful! Public URL: ${publicUrlData.publicUrl}`);
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
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="rounded-xl border border-zinc-200 p-3 text-sm text-zinc-900 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        {file && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Selected file: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload audio"}
        </button>

        {message && (
          <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-300">
            {message}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function sanitizeFileName(name: string) {
  // Replace spaces with underscores, remove non-ASCII except dot and dash
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9.\-_]/g, "_"); // Replace unsafe chars
}