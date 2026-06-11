// src/app/maps/[id]/pin-sidebar.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { usePinModal } from "@/hooks/usePinModal";
import type { MapRole } from "@/lib/permissions";
import { MediaGallery } from "@/components/media-gallery";
import { Lightbox } from "@/components/lightbox";

interface Props {
	pinId: string;
	mapRole: MapRole;
	currentUserId: string;
	onClose: () => void;
	onDeleted: () => void;
}

export function PinSidebar({ pinId, mapRole, currentUserId, onClose, onDeleted }: Props) {
	const [lightbox, setLightbox] = useState<number | null>(null);
	const {
		pin, loading, uploading,
		posting, entryText,
		setEntryText, fileInputRef,
		addEntry, uploadMedia,
		deleteMedia, deletePin,
	} = usePinModal(pinId);

	const canEdit = mapRole === "OWNER" || mapRole === "MEMBER";

	async function handleDeletePin() {
		const res = await deletePin();
		if (res?.ok) onDeleted();
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
										onClick={handleDeletePin}
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
									<form onSubmit={addEntry} className="flex gap-2 pt-1">
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

							{/* Gallery */}

							<MediaGallery
								media={pin.media}
								canEdit={canEdit}
								uploading={uploading}
								onLightbox={setLightbox}
								onUpload={uploadMedia}
								onDelete={deleteMedia}
							/>
						</div>
					) : null}
				</div>
			</div>

			{/* Lightbox */}
			{pin && lightbox !== null && (
				<Lightbox
					media={pin.media}
					index={lightbox}
					onClose={() => setLightbox(null)}
					onChange={setLightbox}
				/>
			)}
		</>
	);
}