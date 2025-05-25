"use client";

import { useState } from "react";
import { Menu, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function DashboardHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  function toggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }

  return (
    <header className="bg-background flex items-center justify-between border-b px-4 py-3 md:pl-64">
      <Button variant="ghost" className="p-2 md:hidden" onClick={toggleSidebar}>
        <Menu className="h-6 w-6" />
      </Button>

      <div className="text-lg font-semibold"></div>

      <div className="flex items-center gap-2">
        {/* Toggle Theme */}
        <Button
          variant="ghost"
          className="cursor-pointer p-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Dropdown do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-2">
              <User className="h-5 w-5" />
              <span className="hidden sm:block">Ruan</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <a href="/dashboard/configuracoes">Configurações</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/logout">Sair</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
