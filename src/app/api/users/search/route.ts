// src/app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user });
}
