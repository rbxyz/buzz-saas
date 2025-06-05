"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

interface User {
  id: string;
  nome: string;
  email: string;
  funcao: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const verifyTokenMutation = api.auth.verifyToken.useMutation();

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsLoading(false);
        return false;
      }

      const result = await verifyTokenMutation.mutateAsync({ token });

      if (result.valid && result.user) {
        setUser(result.user);
        setIsLoading(false);
        return true;
      } else {
        localStorage.removeItem("auth_token");
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      localStorage.removeItem("auth_token");
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem("auth_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    router.push("/");
  };

  useEffect(() => {
    void checkAuth();
  }, []);

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
