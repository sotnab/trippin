// src/app/maps/[id]/pin-sidebar.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import type { MapRole } from "@/lib/permissions";

interface PinEntry { id: string; content: string; }
interface Media { id: string; fileUrl: string; fileType: "IMAGE" | "VIDEO"; }
interface PinFull {
	id: string; title: string; description: string | null;
	lat: number; lng: number; createdAt: string;
	tripDate: string | null;
	participants: string[];
	createdBy: { id: string; name: string | null; image: string | null };
	entries: PinEntry[];
	media: Media[];
}

interface Props {
	pinId: string;
	mapRole: MapRole;
	currentUserId: string;
	onClose: () => void;
	onDeleted: () => void;
}

export function PinSidebar({ pinId, mapRole, currentUserId, onClose, onDeleted }: Props) {
	const [pin, setPin] = useState<PinFull | null>(null);
	const [loading, setLoading] = useState(true);
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [entryText, setEntryText] = useState("");
	const [posting, setPosting] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const canEdit = mapRole === "OWNER" || mapRole === "MEMBER";

	useEffect(() => {
		setLoading(true);
		fetch(`/api/pins/${pinId}`)
			.then((r) => r.json())
			.then(({ pin }) => { setPin(pin); setLoading(false); });
	}, [pinId]);

	// Close on Escape
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (lightbox !== null) setLightbox(null);
				else onClose();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [lightbox, onClose]);

	async function handleAddEntry(e: React.FormEvent) {
		e.preventDefault();
		if (!entryText.trim()) return;
		setPosting(true);
		const res = await fetch(`/api/pins/${pinId}/entries`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: entryText }),
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
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm animate-fade-in"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-4 md:inset-8 z-40 glass rounded-2xl flex flex-col overflow-hidden animate-slide-up">

				{/* Header */}
				<div className="flex items-start justify-between px-6 py-4 border-b border-surface-border shrink-0">
					<div className="space-y-2 flex-1 min-w-0">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 min-w-0">
								<h2 className="text-xl font-bold text-white truncate">{loading ? "Loading…" : pin?.title}</h2>
								{pin?.tripDate && (
									<span className="text-base font-semibold text-brand-400 shrink-0">
										📅 {new Date(pin.tripDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{canEdit && pin && (
									<button
										onClick={handleDelete}
										className="text-red-400 hover:text-red-300 hover:bg-red-950/30 px-3 py-1.5 text-xs rounded-lg transition-colors border border-red-500/20"
									>
										🗑 Delete
									</button>
								)}
								<button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-xl leading-none">✕</button>
							</div>
						</div>

						{pin?.participants && pin.participants.length > 0 && (
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs text-zinc-500 font-medium">People:</span>
								{pin.participants.map((name) => (
									<span
										key={name}
										className="text-xs bg-zinc-700/60 text-zinc-200 border border-zinc-600/40 px-2.5 py-1 rounded-full font-medium"
									>
										{name}
									</span>
								))}
							</div>
						)}

						{pin?.description && (
							<p className="text-sm text-zinc-400">{pin.description}</p>
						)}
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
							{[1, 2, 3, 4, 5, 6].map((i) => (
								<div key={i} className="aspect-square bg-zinc-800 rounded-xl animate-pulse" />
							))}
						</div>
					) : pin ? (
						<div className="p-6 space-y-8">

							{/* Gallery */}
							{pin.media.length > 0 ? (
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
									{pin.media.map((m, i) =>
										m.fileType === "IMAGE" ? (
											<button
												key={m.id}
												onClick={() => setLightbox(i)}
												className="aspect-square rounded-xl overflow-hidden border border-surface-border hover:border-brand-500/50 transition-colors group"
											>
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={m.fileUrl}
													alt=""
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											</button>
										) : (
											<div key={m.id} className="aspect-square rounded-xl overflow-hidden border border-surface-border">
												<video src={m.fileUrl} controls className="w-full h-full object-cover" />
											</div>
										)
									)}

									{/* Upload tile */}
									{canEdit && (
										<>
											<input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
												onChange={handleFileUpload} />
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
							) : (
								<div className="flex flex-col items-center justify-center py-12 gap-3">
									<span className="text-4xl">📷</span>
									<p className="text-zinc-500 text-sm">No photos yet</p>
									{canEdit && (
										<>
											<input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
												onChange={handleFileUpload} />
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
							)}

							{/* Entries */}
							<div className="space-y-3">
								<h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
									Notes & Memories
								</h3>
								{pin.entries.length === 0 && (
									<p className="text-xs text-zinc-600 italic">No notes yet.</p>
								)}
								{pin.entries.map((entry) => (
									<div key={entry.id} className="bg-surface/60 rounded-lg p-4 text-sm text-zinc-300 border border-surface-border">
										{entry.content}
									</div>
								))}

								{canEdit && (
									<form onSubmit={handleAddEntry} className="flex gap-2 pt-1">
										<input
											value={entryText}
											onChange={(e) => setEntryText(e.target.value)}
											placeholder="Add a memory or note…"
											className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
										/>
										<button type="submit" disabled={posting || !entryText.trim()}
											className="shrink-0 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
											{posting ? "…" : "Add"}
										</button>
									</form>
								)}
							</div>
						</div>
					) : null}
				</div>
			</div>

			{/* Lightbox */}
			{lightbox !== null && pin && (
				<div
					className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
					onClick={() => setLightbox(null)}
				>
					<button
						className="absolute top-4 right-4 text-white text-2xl hover:text-zinc-400 transition-colors"
						onClick={() => setLightbox(null)}
					>✕</button>

					{lightbox > 0 && (
						<button
							className="absolute left-4 text-white text-3xl hover:text-zinc-400 transition-colors px-4 py-8"
							onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
						>‹</button>
					)}

					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={pin.media[lightbox].fileUrl}
						alt=""
						className="max-w-full max-h-full object-contain"
						onClick={(e) => e.stopPropagation()}
					/>

					{lightbox < pin.media.length - 1 && (
						<button
							className="absolute right-4 text-white text-3xl hover:text-zinc-400 transition-colors px-4 py-8"
							onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
						>›</button>
					)}

					<div className="absolute bottom-4 text-xs text-zinc-500">
						{lightbox + 1} / {pin.media.length}
					</div>
				</div>
			)}
		</>
	);
}