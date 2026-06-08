// src/app/login/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButtons } from "./login-buttons";

export const metadata = { title: "Sign In" };

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-400/5  rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🗺️</span>
            <span className="text-3xl font-bold tracking-tight text-white">
              Trippin
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Collaborative travel maps with your crew
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 space-y-4 animate-slide-up">
          <h1 className="text-lg font-semibold text-white text-center mb-6">
            Sign in to continue
          </h1>
          <LoginButtons />
        </div>
      </div>
    </main>
  );
}
