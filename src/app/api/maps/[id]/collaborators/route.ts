// src/app/api/maps/[id]/collaborators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canManage } from "@/lib/permissions";
import { CollaboratorRole } from "@prisma/client";

async function guard(mapId: string, userId: string) {
  const role = await getMapRole(mapId, userId);
  if (!canManage(role)) return false;
  return true;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await guard(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role } = await req.json();
  if (!email || !["MEMBER", "VIEWER"].includes(role))
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === session.user.id)
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

  // Check they're not already the owner
  const map = await prisma.map.findUnique({ where: { id: params.id }, select: { ownerId: true } });
  if (map?.ownerId === target.id)
    return NextResponse.json({ error: "User is the map owner" }, { status: 400 });

  const collab = await prisma.collaborator.upsert({
    where:  { mapId_userId: { mapId: params.id, userId: target.id } },
    update: { role: role as CollaboratorRole },
    create: { mapId: params.id, userId: target.id, role: role as CollaboratorRole },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(collab, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await guard(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { collaboratorId } = await req.json();
  await prisma.collaborator.delete({ where: { id: collaboratorId } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await guard(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { collaboratorId, role } = await req.json();
  if (!["MEMBER", "VIEWER"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const updated = await prisma.collaborator.update({
    where:   { id: collaboratorId },
    data:    { role: role as CollaboratorRole },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(updated);
}
