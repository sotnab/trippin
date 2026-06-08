// src/app/api/pins/[pinId]/media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canEdit } from "@/lib/permissions";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { MediaType } from "@prisma/client";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export async function POST(req: NextRequest, { params }: { params: { pinId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pin = await prisma.pin.findUnique({ where: { id: params.pinId }, select: { mapId: true } });
  if (!pin) return NextResponse.json({ error: "Pin not found" }, { status: 404 });

  const role = await getMapRole(pin.mapId, session.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const files    = formData.getAll("files") as File[];

  if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  // Ensure the upload dir exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  const created = await Promise.all(
    files.map(async (file) => {
      const ext      = path.extname(file.name).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      const dest     = path.join(UPLOAD_DIR, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(dest, buffer);

      const isVideo  = file.type.startsWith("video/");
      const fileType = isVideo ? MediaType.VIDEO : MediaType.IMAGE;
      const fileUrl  = `/api/media/${filename}`;

      return prisma.media.create({
        data: { pinId: params.pinId, fileUrl, fileType },
      });
    })
  );

  return NextResponse.json(created, { status: 201 });
}
