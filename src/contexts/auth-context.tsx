"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

interface User {
  id: number;
  nome: string;
  email: string;
  funcao: "superadmin" | "admin";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("user_data");
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => (user ? false : true));
  const router = useRouter();

  const verifyTokenMutation = api.auth.verifyToken.useMutation();

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      setIsLoading(false);
      return false;
    }

    try {
      const result = await verifyTokenMutation.mutateAsync({ token });

      if (result.valid && result.user) {
        localStorage.setItem("user_data", JSON.stringify(result.user));
        setUser(result.user);
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error("Erro ao verificar token remoto:", error);
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setUser(null);
    setIsLoading(false);
    return false;
  }, [verifyTokenMutation]);

  const login = (token: string, userData: User) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_data", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setUser(null);
    router.push("/");
  };

  useEffect(() => {
    if (!user) {
      void checkAuth();
    }
  }, [checkAuth, user]);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
