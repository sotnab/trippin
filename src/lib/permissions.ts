// src/lib/permissions.ts
import { prisma } from "@/lib/prisma";
import { CollaboratorRole } from "@prisma/client";

export type MapRole = "OWNER" | CollaboratorRole;

/**
 * Returns the caller's role on a map, or null if they have no access.
 */
export async function getMapRole(
  mapId: string,
  userId: string
): Promise<MapRole | null> {
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    select: { ownerId: true },
  });

  if (!map) return null;
  if (map.ownerId === userId) return "OWNER";

  const collab = await prisma.collaborator.findUnique({
    where: { mapId_userId: { mapId, userId } },
    select: { role: true },
  });

  return collab?.role ?? null;
}

/** Can the user see the map at all? */
export function canView(role: MapRole | null): boolean {
  return role !== null;
}

/** Can the user add/edit/delete pins and add entries/media? */
export function canEdit(role: MapRole | null): boolean {
  return role === "OWNER" || role === CollaboratorRole.MEMBER;
}

/** Can the user delete the map or manage collaborators? */
export function canManage(role: MapRole | null): boolean {
  return role === "OWNER";
}
