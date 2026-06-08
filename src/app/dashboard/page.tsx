// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CreateMapButton } from "./create-map-button";
import { UserMenu } from "@/components/user-menu";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  console.log("SESSION:", session);
  if (!session) redirect("/login");

  const [ownedMaps, sharedMaps] = await Promise.all([
    prisma.map.findMany({
      where:   { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { pins: true, collaborators: true } } },
    }),
    prisma.map.findMany({
      where:   { collaborators: { some: { userId: session.user.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        owner:         { select: { name: true, image: true } },
        collaborators: { where: { userId: session.user.id }, select: { role: true } },
        _count:        { select: { pins: true } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="border-b border-surface-border px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold text-lg">
          <span>🗺️</span> Trippin
        </Link>
        <UserMenu user={session.user} />
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Maps</h1>
            <p className="text-sm text-zinc-400 mt-1">Plan and relive adventures with your crew.</p>
          </div>
          <CreateMapButton />
        </div>

        {/* My Maps */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            My Maps
          </h2>
          {ownedMaps.length === 0 ? (
            <EmptyState message="You haven't created any maps yet." />
          ) : (
            <MapGrid>
              {ownedMaps.map((m) => (
                <MapCard
                  key={m.id}
                  id={m.id}
                  title={m.title}
                  description={m.description}
                  pinCount={m._count.pins}
                  badge="Owner"
                  badgeColor="brand"
                  updatedAt={m.updatedAt}
                />
              ))}
            </MapGrid>
          )}
        </section>

        {/* Shared */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            Shared with Me
          </h2>
          {sharedMaps.length === 0 ? (
            <EmptyState message="No one has shared a map with you yet." />
          ) : (
            <MapGrid>
              {sharedMaps.map((m) => (
                <MapCard
                  key={m.id}
                  id={m.id}
                  title={m.title}
                  description={m.description}
                  pinCount={m._count.pins}
                  badge={m.collaborators[0]?.role ?? "VIEWER"}
                  badgeColor="zinc"
                  updatedAt={m.updatedAt}
                  ownerName={m.owner.name}
                />
              ))}
            </MapGrid>
          )}
        </section>
      </main>
    </div>
  );
}

function MapGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

function MapCard({
  id, title, description, pinCount, badge, badgeColor, updatedAt, ownerName,
}: {
  id: string; title: string; description?: string | null;
  pinCount: number; badge: string; badgeColor: "brand" | "zinc";
  updatedAt: Date; ownerName?: string | null;
}) {
  const badgeClass = badgeColor === "brand"
    ? "bg-brand-500/20 text-brand-400 border-brand-500/30"
    : "bg-zinc-700/40 text-zinc-400 border-zinc-600/30";

  return (
    <Link href={`/maps/${id}`}>
      <div className="group glass rounded-xl p-5 hover:border-brand-500/40 transition-colors cursor-pointer h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
            {title}
          </h3>
          <span className={`shrink-0 text-xs border px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        </div>
        {description && (
          <p className="text-sm text-zinc-400 line-clamp-2 flex-1">{description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <span>{pinCount} pin{pinCount !== 1 ? "s" : ""}</span>
          {ownerName && <span>by {ownerName}</span>}
          <span>{new Date(updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass rounded-xl p-10 text-center text-zinc-500 text-sm">
      {message}
    </div>
  );
}
