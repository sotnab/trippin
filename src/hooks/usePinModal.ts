// src/hooks/usePinModal.ts
"use client";

import { useEffect, useRef, useState } from "react";
import type { PinFull, Media, PinEntry } from "@/types/map";

export function usePinModal(pinId: string) {
  const [pin,      setPin]      = useState<PinFull | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [uploading, setUploading] = useState(false);
  const [posting,   setPosting]  = useState(false);
  const [entryText, setEntryText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pins/${pinId}`)
      .then((r) => r.json())
      .then(({ pin }) => { setPin(pin); setLoading(false); });
  }, [pinId]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!entryText.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/pins/${pinId}/entries`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: entryText }),
    });
    if (res.ok) {
      const entry: PinEntry = await res.json();
      setPin((p) => p ? { ...p, entries: [...p.entries, entry] } : p);
      setEntryText("");
    }
    setPosting(false);
  }

  async function uploadMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    const res = await fetch(`/api/pins/${pinId}/media`, { method: "POST", body: form });
    if (res.ok) {
      const newMedia: Media[] = await res.json();
      setPin((p) => p ? { ...p, media: [...p.media, ...newMedia] } : p);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteMedia(mediaId: string) {
    const res = await fetch(`/api/media/delete/${mediaId}`, { method: "DELETE" });
    if (res.ok) {
      setPin((p) => p ? { ...p, media: p.media.filter((m) => m.id !== mediaId) } : p);
    }
  }

  async function deletePin() {
    if (!confirm("Delete this pin and all its content?")) return;
    return fetch(`/api/pins/${pinId}`, { method: "DELETE" });
  }

  return {
    pin, loading,
    uploading, posting,
    entryText, setEntryText,
    fileInputRef,
    addEntry, uploadMedia, deleteMedia, deletePin,
  };
}