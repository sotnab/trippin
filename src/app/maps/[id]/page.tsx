// src/app/maps/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMapRole } from "@/lib/permissions";
import { MapView } from "./map-view";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const map = await prisma.map.findUnique({ where: { id: params.id }, select: { title: true } });
  return { title: map?.title ?? "Map" };
}

export default async function MapPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = await getMapRole(params.id, session.user.id);
  if (!role) notFound();

  const map = await prisma.map.findUnique({
    where: { id: params.id },
    include: {
      owner:         { select: { id: true, name: true, image: true } },
      collaborators: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      pins: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
          _count:    { select: { entries: true, media: true } },
        },
      },
    },
  });

  if (!map) notFound();

  return (
    <MapView
      map={JSON.parse(JSON.stringify(map))}
      role={role}
      currentUserId={session.user.id}
      currentUser={session.user}
    />
  );
}
