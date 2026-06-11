// src/app/api/media/delete/[mediaId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canEdit } from "@/lib/permissions";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export async function DELETE(req: NextRequest, { params }: { params: { mediaId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const media = await prisma.media.findUnique({
    where:   { id: params.mediaId },
    include: { pin: { select: { mapId: true } } },
  });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await getMapRole(media.pin.mapId, session.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete from R2
  try {
    const key = media.fileUrl.replace(`${R2_PUBLIC_URL}/`, "");
    await r2.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key:    key,
    }));
  } catch {
    // Continue even if R2 delete fails — still remove DB record
  }

  await prisma.media.delete({ where: { id: params.mediaId } });
  return new NextResponse(null, { status: 204 });
}