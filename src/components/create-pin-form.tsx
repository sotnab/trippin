// src/components/create-pin-form.tsx
"use client";

import { useState } from "react";

interface Coords { lat: number; lng: number; }

interface Props {
  coords:   Coords;
  onCreate: (data: {
    title: string;
    description: string;
    tripDate: string;
    participants: string[];
    lat: number;
    lng: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export function CreatePinForm({ coords, onCreate, onCancel }: Props) {
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [tripDate,     setTripDate]     = useState("");
  const [participants, setParticipants] = useState("");
  const [creating,     setCreating]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    await onCreate({
      title:        title.trim(),
      description:  description.trim(),
      tripDate:     tripDate || "",
      participants: participants
        ? participants.split(",").map((p) => p.trim()).filter(Boolean)
        : [],
      lat: coords.lat,
      lng: coords.lng,
    });
    setCreating(false);
  }

  return (
    <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-8 w-96 glass rounded-2xl p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-sm">Drop a pin</h3>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title *"
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
        />
        <input
          type="date"
          value={tripDate}
          onChange={(e) => setTripDate(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
        />
        <input
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="People: Jan, Kasia, Piotr"
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
        />
        <p className="text-xs text-zinc-500">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={creating || !title.trim()}
            className="flex-1 text-sm bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
            {creating ? "Saving…" : "Create Pin"}
          </button>
        </div>
      </form>
    </div>
  );
}