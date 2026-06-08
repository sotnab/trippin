// src/app/maps/[id]/pin-sidebar.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import type { MapRole } from "@/lib/permissions";

interface PinEntry { id: string; content: string; createdAt: string; }
interface Media     { id: string; fileUrl: string; fileType: "IMAGE" | "VIDEO"; }
interface PinFull {
  id: string; title: string; description: string | null;
  lat: number; lng: number; createdAt: string;
  createdBy: { id: string; name: string | null; image: string | null };
  entries: PinEntry[];
  media:   Media[];
}

interface Props {
  pinId:         string;
  mapRole:       MapRole;
  currentUserId: string;
  onClose:       () => void;
  onDeleted:     () => void;
}

export function PinSidebar({ pinId, mapRole, currentUserId, onClose, onDeleted }: Props) {
  const [pin,     setPin]     = useState<PinFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryText, setEntryText] = useState("");
  const [posting,   setPosting]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = mapRole === "OWNER" || mapRole === "MEMBER";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pins/${pinId}`)
      .then((r) => r.json())
      .then(({ pin }) => { setPin(pin); setLoading(false); });
  }, [pinId]);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!entryText.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/pins/${pinId}/entries`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content: entryText }),
    });
    if (res.ok) {
      const entry = await res.json();
      setPin((p) => p ? { ...p, entries: [...p.entries, entry] } : p);
      setEntryText("");
    }
    setPosting(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleDelete() {
    if (!confirm("Delete this pin and all its content?")) return;
    const res = await fetch(`/api/pins/${pinId}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <div className="absolute top-0 right-0 h-full w-full max-w-sm z-20 flex flex-col glass border-l border-surface-border animate-slide-up overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-16 pb-4 border-b border-surface-border">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse" />
          ) : (
            <>
              <h2 className="font-bold text-white text-base leading-tight truncate">{pin?.title}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {pin?.lat.toFixed(4)}, {pin?.lng.toFixed(4)}
              </p>
            </>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors ml-3 text-lg leading-none">✕</button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 p-5 space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-4 bg-zinc-700 rounded animate-pulse" />)}
        </div>
      ) : pin ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Creator + description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {pin.createdBy.image && (
                <Image src={pin.createdBy.image} alt="" width={20} height={20} className="rounded-full" />
              )}
              <span className="text-xs text-zinc-400">by {pin.createdBy.name}</span>
              <span className="text-xs text-zinc-600 ml-auto">{new Date(pin.createdAt).toLocaleDateString()}</span>
            </div>
            {pin.description && <p className="text-sm text-zinc-300">{pin.description}</p>}
          </div>

          {/* Media */}
          {pin.media.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Media</h3>
              <div className="grid grid-cols-2 gap-2">
                {pin.media.map((m) =>
                  m.fileType === "IMAGE" ? (
                    <a key={m.id} href={m.fileUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.fileUrl} alt="" className="w-full h-28 object-cover rounded-lg border border-surface-border" />
                    </a>
                  ) : (
                    <video key={m.id} src={m.fileUrl} controls className="w-full h-28 object-cover rounded-lg border border-surface-border" />
                  )
                )}
              </div>
            </div>
          )}

          {/* Upload zone */}
          {canEdit && (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
                onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-surface-border hover:border-brand-500/50 rounded-xl py-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "📎 Add images or videos"}
              </button>
            </div>
          )}

          {/* Entries */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Entries ({pin.entries.length})
            </h3>
            {pin.entries.length === 0 && (
              <p className="text-xs text-zinc-600 italic">No entries yet.</p>
            )}
            {pin.entries.map((entry) => (
              <div key={entry.id} className="bg-surface/60 rounded-lg p-3 text-sm text-zinc-300 border border-surface-border">
                <p>{entry.content}</p>
                <p className="text-xs text-zinc-600 mt-1">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Add entry */}
          {canEdit && (
            <form onSubmit={handleAddEntry} className="space-y-2">
              <textarea
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Add a memory or note…"
                rows={3}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
              />
              <button type="submit" disabled={posting || !entryText.trim()}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {posting ? "Posting…" : "Add Entry"}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {/* Footer — delete */}
      {canEdit && pin && (
        <div className="px-5 py-4 border-t border-surface-border">
          <button onClick={handleDelete}
            className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 py-2 rounded-lg transition-colors">
            🗑 Delete Pin
          </button>
        </div>
      )}
    </div>
  );
}
