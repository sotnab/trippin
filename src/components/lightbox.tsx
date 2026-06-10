// src/components/lightbox.tsx
"use client";

import { useEffect } from "react";
import type { Media } from "@/types/map";

interface Props {
  media:    Media[];
  index:    number;
  onClose:  () => void;
  onChange: (index: number) => void;
}

export function Lightbox({ media, index, onClose, onChange }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft"  && index > 0)              onChange(index - 1);
      if (e.key === "ArrowRight" && index < media.length - 1) onChange(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, media.length, onClose, onChange]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-2xl hover:text-zinc-400 transition-colors"
        onClick={onClose}
      >✕</button>

      {index > 0 && (
        <button
          className="absolute left-4 text-white text-3xl hover:text-zinc-400 transition-colors px-4 py-8"
          onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
        >‹</button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media[index].fileUrl}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {index < media.length - 1 && (
        <button
          className="absolute right-4 text-white text-3xl hover:text-zinc-400 transition-colors px-4 py-8"
          onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
        >›</button>
      )}

      <div className="absolute bottom-4 text-xs text-zinc-500">
        {index + 1} / {media.length}
      </div>
    </div>
  );
}