// src/components/user-menu.tsx
"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full focus:outline-none"
      >
        {user.image ? (
          <Image src={user.image} alt={user.name ?? "User"} width={32} height={32}
            className="rounded-full ring-2 ring-surface-border" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 glass rounded-xl w-52 p-1 animate-fade-in">
            <div className="px-3 py-2 border-b border-surface-border mb-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left text-sm text-zinc-300 hover:text-white hover:bg-zinc-700/50 px-3 py-2 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
