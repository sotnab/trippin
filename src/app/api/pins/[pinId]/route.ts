// src/app/api/pins/[pinId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canView, canEdit } from "@/lib/permissions";

async function resolvePin(pinId: string) {
  return prisma.pin.findUnique({
    where:   { id: pinId },
    select:  { mapId: true, createdById: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: { pinId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pin = await resolvePin(params.pinId);
  if (!pin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await getMapRole(pin.mapId, session.user.id);
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const full = await prisma.pin.findUnique({
    where: { id: params.pinId },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      entries:   { orderBy: { createdAt: "asc" } },
      media:     { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ pin: full, role });
}

export async function DELETE(req: NextRequest, { params }: { params: { pinId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pin = await resolvePin(params.pinId);
  if (!pin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = await getMapRole(pin.mapId, session.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.pin.delete({ where: { id: params.pinId } });
  return new NextResponse(null, { status: 204 });
}
