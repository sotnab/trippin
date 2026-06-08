// src/app/api/pins/[pinId]/entries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canEdit } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: { pinId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pin = await prisma.pin.findUnique({ where: { id: params.pinId }, select: { mapId: true } });
  if (!pin) return NextResponse.json({ error: "Pin not found" }, { status: 404 });

  const role = await getMapRole(pin.mapId, session.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const entry = await prisma.pinEntry.create({
    data: { pinId: params.pinId, content: content.trim() },
  });

  return NextResponse.json(entry, { status: 201 });
}
