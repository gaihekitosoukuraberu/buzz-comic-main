"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export type UserRole = "user" | "creator" | "admin";

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isUnauthenticated = status === "unauthenticated";

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id ?? "",
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user.role ?? "user") as UserRole,
      }
    : null;

  const isAdmin = user?.role === "admin";
  const isCreator = user?.role === "creator" || user?.role === "admin";

  const login = useCallback(
    async (
      email: string,
      password: string,
      callbackUrl = "/dashboard"
    ) => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("メールアドレスまたはパスワードが正しくありません");
      }

      router.push(callbackUrl);
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(
    async (callbackUrl = "/") => {
      await signOut({ callbackUrl });
    },
    []
  );

  const refreshSession = useCallback(async () => {
    await update();
  }, [update]);

  return {
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    isAdmin,
    isCreator,
    login,
    logout,
    refreshSession,
  };
}
