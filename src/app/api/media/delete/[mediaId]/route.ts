// src/app/api/media/delete/[mediaId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canEdit } from "@/lib/permissions";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(req: NextRequest, { params }: { params: { mediaId: string } }) {
	const session = await getServerSession(authOptions);
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const media = await prisma.media.findUnique({
		where: { id: params.mediaId },
		include: { pin: { select: { mapId: true } } },
	});
	if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const role = await getMapRole(media.pin.mapId, session.user.id);
	if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	// Delete file from disk
	try {
		const filename = media.fileUrl.replace("/api/media/", "");
		const resolvedDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
		const filepath = path.resolve(resolvedDir, filename);
		if (filepath.startsWith(resolvedDir)) await unlink(filepath);
	} catch {
		// File already gone from disk, continue
	}

	await prisma.media.delete({ where: { id: params.mediaId } });
	return new NextResponse(null, { status: 204 });
}