// src/app/api/media/[filename]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createReadStream, statSync } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

// Map common extensions to MIME types
const MIME: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
};

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  // Auth check — media is only for authenticated users
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const filename = params.filename;

  // ── Path traversal protection ─────────────────────────────────────────────
  // Ensure the resolved path is strictly inside UPLOAD_DIR
  const resolvedDir  = path.resolve(UPLOAD_DIR);
  const resolvedFile = path.resolve(resolvedDir, filename);

  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Only allow a plain filename (no path separators)
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(resolvedFile);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext      = path.extname(filename).toLowerCase();
  const mimeType = MIME[ext] ?? "application/octet-stream";

  // Stream the file using Node.js ReadStream → Web ReadableStream adapter
  const nodeStream = createReadStream(resolvedFile);
  const webStream  = new ReadableStream({
    start(controller) {
      nodeStream.on("data",  (chunk) => controller.enqueue(chunk));
      nodeStream.on("end",   ()      => controller.close());
      nodeStream.on("error", (err)   => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type":   mimeType,
      "Content-Length": String(stat.size),
      "Cache-Control":  "private, max-age=3600",
    },
  });
}
