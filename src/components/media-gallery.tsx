// src/components/media-gallery.tsx
"use client";

import { useRef } from "react";
import type { Media } from "@/types/map";

interface Props {
  media:       Media[];
  canEdit:     boolean;
  uploading:   boolean;
  onLightbox:  (index: number) => void;
  onUpload:    (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete:    (mediaId: string) => void;
}

export function MediaGallery({ media, canEdit, uploading, onLightbox, onUpload, onDelete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <span className="text-4xl">📷</span>
        <p className="text-zinc-500 text-sm">No photos yet</p>
        {canEdit && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload photos"}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {media.map((m, i) => (
        <div key={m.id} className="relative group aspect-square">
          {m.fileType === "IMAGE" ? (
            <button
              onClick={() => onLightbox(i)}
              className="w-full h-full rounded-xl overflow-hidden border border-surface-border hover:border-brand-500/50 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.fileUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </button>
          ) : (
            <div className="w-full h-full rounded-xl overflow-hidden border border-surface-border">
              <video src={m.fileUrl} controls className="w-full h-full object-cover" />
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => onDelete(m.id)}
              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-surface-border hover:border-brand-500/50 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <span className="text-2xl">{uploading ? "⏳" : "+"}</span>
            <span className="text-xs">{uploading ? "Uploading…" : "Add media"}</span>
          </button>
        </>
      )}
    </div>
  );
}