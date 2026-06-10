// src/app/maps/[id]/map-view.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import type { MapRole } from "@/lib/permissions";
import { PinSidebar } from "./pin-sidebar";
import { MapSettings } from "./map-settings";
import { UserMenu } from "@/components/user-menu";
import { MapData, PinStub } from '@/types/map'
import { useMapMarkers } from "@/hooks/useMapMarkers";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// ─── Types (serialisable subset) ─────────────────────────────────────────────

interface Props {
	map: MapData;
	role: MapRole;
	currentUserId: string;
	currentUser: {
		name?: string | null;
		email?: string | null;
		image?: string | null
	};
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MapView({ map: initialMap, role, currentUserId, currentUser }: Props) {
	const mapContainer = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);

	const [map, setMap] = useState(initialMap);
	const [activePinId, setActivePinId] = useState<string | null>(null);
	const [showSettings, setShowSettings] = useState(false);

	const { syncMarkers, removeMarker, removeAll } = useMapMarkers((pinId: string) => {
		setPendingCoords(null);
		setActivePinId(pinId);
	});

	// Create-pin form state
	const [pendingCoords, setPendingCoords] = useState<{ lng: number; lat: number } | null>(null);
	const [newPinTitle, setNewPinTitle] = useState("");
	const [newPinDesc, setNewPinDesc] = useState("");
	const [creating, setCreating] = useState(false);
	const [newPinDate, setNewPinDate] = useState("");
	const [newPinParticipants, setNewPinParticipants] = useState("");

	const canEdit = role === "OWNER" || role === "MEMBER";

	// ── Initialise Mapbox ─────────────────────────────────────────────────────

	useEffect(() => {
		if (mapRef.current || !mapContainer.current) return;

		const mb = new mapboxgl.Map({
			container: mapContainer.current,
			style: "mapbox://styles/sotnab/cmq5s5db6001301s7dobfdmv5",
			center: [20, 49.65],
			zoom: 8,
		});

		mb.on("error", (e) => {
			console.error("MAP ERROR:", e);
		});

		mb.addControl(new mapboxgl.NavigationControl(), "bottom-right");
		mb.addControl(new mapboxgl.ScaleControl(), "bottom-left");

		// Click to create pin
		mb.on("click", (e) => {
			if (!canEdit) return;
			setPendingCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
			setActivePinId(null);
		});

		mapRef.current = mb;
		return () => {
			// Remove all markers first
			removeAll();
			mb.remove();
			mapRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => { syncMarkers(map.pins, mapRef.current!); }, [map.pins, syncMarkers]);

	// ── Create pin ────────────────────────────────────────────────────────────

	async function handleCreatePin(e: React.FormEvent) {
		e.preventDefault();
		if (!pendingCoords || !newPinTitle.trim()) return;
		setCreating(true);

		const res = await fetch(`/api/maps/${map.id}/pins`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: newPinTitle,
				description: newPinDesc,
				tripDate: newPinDate || null,
				participants: newPinParticipants
					? newPinParticipants.split(",").map((p) => p.trim()).filter(Boolean)
					: [],
				...pendingCoords,
			}),
		});

		if (res.ok) {
			const pin: PinStub = await res.json();
			setMap((m) => ({ ...m, pins: [pin, ...m.pins] }));
			setPendingCoords(null);
			setNewPinTitle("");
			setNewPinDesc("");
			setNewPinDate("");
			setNewPinParticipants("");
			setActivePinId(pin.id);
		}
		setCreating(false);
	}

	function handlePinDeleted(pinId: string) {
		removeMarker(pinId);
		setMap((m) => ({ ...m, pins: m.pins.filter((p) => p.id !== pinId) }));
		setActivePinId(null);
	}

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
			<div
				ref={mapContainer}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
			/>

			{/* Top nav */}
			<div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 glass border-b border-surface-border">
				<div className="flex items-center gap-3">
					<Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
						← Back
					</Link>
					<div className="w-px h-4 bg-surface-border" />
					<div>
						<h1 className="font-semibold text-white text-sm leading-tight">{map.title}</h1>
						{map.description && (
							<p className="text-xs text-zinc-400 truncate max-w-xs">{map.description}</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-3">
					<span className="text-xs text-zinc-500">{map.pins.length} pin{map.pins.length !== 1 ? "s" : ""}</span>
					{role === "OWNER" && (
						<button
							onClick={() => setShowSettings(true)}
							className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-surface-border"
						>
							⚙ Settings
						</button>
					)}
					<UserMenu user={currentUser} />
				</div>
			</div>

			{/* Create-pin popover */}
			{pendingCoords && canEdit && (
				<div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-8 w-96 glass rounded-2xl p-5 animate-slide-up">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-white text-sm">Drop a pin</h3>
						<button onClick={() => setPendingCoords(null)} className="text-zinc-500 hover:text-white">✕</button>
					</div>
					<form onSubmit={handleCreatePin} className="space-y-3">
						<input
							value={newPinTitle}
							onChange={(e) => setNewPinTitle(e.target.value)}
							placeholder="Title *"
							className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
						/>
						<textarea
							value={newPinDesc}
							onChange={(e) => setNewPinDesc(e.target.value)}
							placeholder="Description (optional)"
							rows={2}
							className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
						/>
						<input
							type="date"
							value={newPinDate}
							onChange={(e) => setNewPinDate(e.target.value)}
							className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
						/>
						<input
							value={newPinParticipants}
							onChange={(e) => setNewPinParticipants(e.target.value)}
							placeholder="People (comma separated: Jan, Kasia, Piotr)"
							className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
						/>
						<p className="text-xs text-zinc-500">
							{pendingCoords.lat.toFixed(4)}, {pendingCoords.lng.toFixed(4)}
						</p>
						<div className="flex gap-2">
							<button type="button" onClick={() => setPendingCoords(null)}
								className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors">
								Cancel
							</button>
							<button type="submit" disabled={creating || !newPinTitle.trim()}
								className="flex-1 text-sm bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
								{creating ? "Saving…" : "Create Pin"}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Pin sidebar */}
			{activePinId && (
				<PinSidebar
					pinId={activePinId}
					mapRole={role}
					currentUserId={currentUserId}
					onClose={() => setActivePinId(null)}
					onDeleted={() => handlePinDeleted(activePinId)}
				/>
			)}

			{/* Settings panel */}
			{showSettings && role === "OWNER" && (
				<MapSettings
					map={map}
					onClose={() => setShowSettings(false)}
					onCollaboratorsChange={(collabs) => setMap((m) => ({ ...m, collaborators: collabs }))}
				/>
			)}

			{/* Hint */}
			{canEdit && !pendingCoords && !activePinId && !showSettings && (
				<div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
					<p className="text-xs text-zinc-400 glass px-3 py-1.5 rounded-full">
						Click anywhere on the map to drop a pin
					</p>
				</div>
			)}
		</div>
	);
}
