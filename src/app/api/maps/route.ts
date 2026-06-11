// src/app/api/maps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can create maps" }, { status: 403 });

  const { title, description } = await req.json();
  if (!title?.trim()) 
    return NextResponse.json({ error: "Title required" }, { status: 400 });

  const map = await prisma.map.create({
    data: {
      title:       title.trim(),
      description: description?.trim() || null,
      ownerId:     session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return NextResponse.json(map, { status: 201 });
}