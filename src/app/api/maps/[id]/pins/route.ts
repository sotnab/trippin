// src/app/api/maps/[id]/pins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canEdit } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getMapRole(params.id, session.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, description, lat, lng, tripDate, participants } = await req.json();
  if (!title?.trim() || lat == null || lng == null)
    return NextResponse.json({ error: "title, lat, lng are required" }, { status: 400 });

  const pin = await prisma.pin.create({
    data: {
      mapId:        params.id,
      title:        title.trim(),
      description:  description?.trim() || null,
      lat,
      lng,
      tripDate:     tripDate ? new Date(tripDate) : null,
      participants: participants ?? [],
      createdById:  session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(pin, { status: 201 });
}