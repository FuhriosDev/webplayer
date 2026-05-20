"use client";
import { useState } from "react";
import UploadModal from "./UploadModal"; // adjust path if needed

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-6">
      <button
        onClick={() => setShowModal(true)}
        className="rounded-xl bg-zinc-950 px-6 py-3 text-white font-semibold"
      >
        Upload Audio
      </button>
      {showModal && (
        <UploadModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}