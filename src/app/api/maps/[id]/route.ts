// src/app/api/maps/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canView, canManage } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getMapRole(params.id, session.user.id);
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const map = await prisma.map.findUnique({
    where: { id: params.id },
    include: {
      owner:         { select: { id: true, name: true, image: true } },
      collaborators: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      pins: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
          _count:    { select: { entries: true, media: true } },
        },
      },
    },
  });

  return NextResponse.json({ map, role });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getMapRole(params.id, session.user.id);
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.map.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
