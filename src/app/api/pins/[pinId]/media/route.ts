// src/app/api/pins/[pinId]/media/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMapRole, canEdit } from "@/lib/permissions";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { MediaType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { pinId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pin = await prisma.pin.findUnique({
    where:  { id: params.pinId },
    select: { mapId: true },
  });
  if (!pin) return NextResponse.json({ error: "Pin not found" }, { status: 404 });

  const role = await getMapRole(pin.mapId, session.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const files    = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

  const created = await Promise.all(
    files.map(async (file) => {
      const ext      = path.extname(file.name).toLowerCase();
      const key      = `pins/${params.pinId}/${uuidv4()}${ext}`;
      const buffer   = Buffer.from(await file.arrayBuffer());

      // Upload to R2
      await r2.send(new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         key,
        Body:        buffer,
        ContentType: file.type,
      }));

      const fileUrl  = `${R2_PUBLIC_URL}/${key}`;
      const fileType = file.type.startsWith("video/") ? MediaType.VIDEO : MediaType.IMAGE;

      return prisma.media.create({
        data: { pinId: params.pinId, fileUrl, fileType },
      });
    })
  );

  return NextResponse.json(created, { status: 201 });
}