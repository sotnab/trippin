// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:    string;
      role:  "ADMIN" | "USER";
      name?:  string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: "ADMIN" | "USER";
  }
}