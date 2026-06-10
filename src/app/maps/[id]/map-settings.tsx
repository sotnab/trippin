// src/app/maps/[id]/map-settings.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CollabUser, Collaborator, SimpleUser, MapData } from '@/types/map';

interface Props {
	map: MapData;
	onClose: () => void;
	onCollaboratorsChange: (c: Collaborator[]) => void;
}

export function MapSettings({ map, onClose, onCollaboratorsChange }: Props) {
	const [collabs, setCollabs] = useState<Collaborator[]>(map.collaborators);
	const [searchEmail, setSearchEmail] = useState("");
	const [foundUser, setFoundUser] = useState<CollabUser | null | "not_found">(null);
	const [inviteRole, setInviteRole] = useState<"MEMBER" | "VIEWER">("MEMBER");
	const [searching, setSearching] = useState(false);
	const [inviting, setInviting] = useState(false);
	const [error, setError] = useState("");
	const [deleting, setDeleting] = useState(false);
	const router = useRouter();

	async function handleSearch(e: React.FormEvent) {
		e.preventDefault();
		setError(""); setFoundUser(null);
		if (!searchEmail.trim()) return;
		setSearching(true);
		const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail.trim())}`);
		const { user } = await res.json();
		setFoundUser(user ?? "not_found");
		setSearching(false);
	}

	async function handleInvite() {
		if (!foundUser || foundUser === "not_found") return;
		setInviting(true); setError("");
		const res = await fetch(`/api/maps/${map.id}/collaborators`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: foundUser.email, role: inviteRole }),
		});
		if (res.ok) {
			const collab: Collaborator = await res.json();
			const updated = collabs.filter((c) => c.user.id !== collab.user.id).concat(collab);
			setCollabs(updated);
			onCollaboratorsChange(updated);
			setFoundUser(null); setSearchEmail("");
		} else {
			const { error: msg } = await res.json();
			setError(msg ?? "Failed to invite.");
		}
		setInviting(false);
	}

	async function handleRemove(collabId: string) {
		const res = await fetch(`/api/maps/${map.id}/collaborators`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ collaboratorId: collabId }),
		});
		if (res.ok) {
			const updated = collabs.filter((c) => c.id !== collabId);
			setCollabs(updated);
			onCollaboratorsChange(updated);
		}
	}

	async function handleRoleChange(collabId: string, role: "MEMBER" | "VIEWER") {
		const res = await fetch(`/api/maps/${map.id}/collaborators`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ collaboratorId: collabId, role }),
		});
		if (res.ok) {
			const updated = await res.json();
			const newList = collabs.map((c) => c.id === collabId ? updated : c);
			setCollabs(newList);
			onCollaboratorsChange(newList);
		}
	}

	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
			<div className="glass rounded-2xl w-full max-w-lg mx-4 animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
					<h2 className="font-bold text-white">Map Settings</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
					{/* Map info */}
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Map Info</h3>
						<p className="text-sm text-white font-medium">{map.title}</p>
						{map.description && <p className="text-xs text-zinc-400 mt-1">{map.description}</p>}
					</section>

					{/* Invite */}
					<section className="space-y-3">
						<h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Invite Collaborator</h3>
						<form onSubmit={handleSearch} className="flex gap-2">
							<input
								type="email"
								value={searchEmail}
								onChange={(e) => { setSearchEmail(e.target.value); setFoundUser(null); }}
								placeholder="user@email.com"
								className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
							/>
							<button type="submit" disabled={searching}
								className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
								{searching ? "…" : "Find"}
							</button>
						</form>

						{foundUser === "not_found" && (
							<p className="text-xs text-red-400">No user found with that email.</p>
						)}

						{foundUser && foundUser !== "not_found" && (
							<div className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-surface-border">
								{foundUser.image && (
									<Image src={foundUser.image} alt="" width={28} height={28} className="rounded-full" />
								)}
								<div className="flex-1 min-w-0">
									<p className="text-sm text-white font-medium truncate">{foundUser.name}</p>
									<p className="text-xs text-zinc-500 truncate">{foundUser.email}</p>
								</div>
								<select
									value={inviteRole}
									onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "VIEWER")}
									className="bg-zinc-800 border border-surface-border text-white text-xs rounded px-2 py-1"
								>
									<option value="MEMBER">Member</option>
									<option value="VIEWER">Viewer</option>
								</select>
								<button onClick={handleInvite} disabled={inviting}
									className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
									{inviting ? "…" : "Invite"}
								</button>
							</div>
						)}
						{error && <p className="text-xs text-red-400">{error}</p>}
					</section>

					{/* Current collaborators */}
					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
							Collaborators ({collabs.length})
						</h3>
						{collabs.length === 0 && (
							<p className="text-xs text-zinc-600 italic">No collaborators yet.</p>
						)}
						{collabs.map((c) => (
							<div key={c.id} className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-surface-border">
								{c.user.image && (
									<Image src={c.user.image} alt="" width={28} height={28} className="rounded-full" />
								)}
								<div className="flex-1 min-w-0">
									<p className="text-sm text-white truncate">{c.user.name}</p>
									<p className="text-xs text-zinc-500 truncate">{c.user.email}</p>
								</div>
								<select
									value={c.role}
									onChange={(e) => handleRoleChange(c.id, e.target.value as "MEMBER" | "VIEWER")}
									className="bg-zinc-800 border border-surface-border text-white text-xs rounded px-2 py-1"
								>
									<option value="MEMBER">Member</option>
									<option value="VIEWER">Viewer</option>
								</select>
								<button onClick={() => handleRemove(c.id)}
									className="text-red-400 hover:text-red-300 text-xs px-2 transition-colors">
									Remove
								</button>
							</div>
						))}
					</section>

					{/* Danger zone */}
					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-widest text-red-500">
							Danger Zone
						</h3>
						<div className="border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
							<div>
								<p className="text-sm text-white font-medium">Delete this map</p>
								<p className="text-xs text-zinc-500 mt-0.5">Permanently deletes the map, all pins and media.</p>
							</div>
							<button
								onClick={async () => {
									if (!confirm("Are you sure? This cannot be undone.")) return;
									setDeleting(true);
									const res = await fetch(`/api/maps/${map.id}`, { method: "DELETE" });
									if (res.ok) router.push("/dashboard");
									else setDeleting(false);
								}}
								disabled={deleting}
								className="shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
							>
								{deleting ? "Deleting…" : "Delete Map"}
							</button>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
