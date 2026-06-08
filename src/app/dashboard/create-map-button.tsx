// src/app/dashboard/create-map-button.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreateMapButton() {
  const [open, setOpen]       = useState(false);
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [error, setError]     = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }

    startTransition(async () => {
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() }),
      });
      if (!res.ok) { setError("Failed to create map."); return; }
      const map = await res.json();
      setOpen(false);
      setTitle(""); setDesc("");
      router.push(`/maps/${map.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <span className="text-base">+</span> New Map
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl p-8 w-full max-w-md mx-4 animate-slide-up">
            <h2 className="text-lg font-bold text-white mb-6">Create a new map</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summer Europe Trip"
                  className="w-full bg-surface rounded-lg border border-surface-border px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Optional description…"
                  rows={3}
                  className="w-full bg-surface rounded-lg border border-surface-border px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  {isPending ? "Creating…" : "Create Map"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
