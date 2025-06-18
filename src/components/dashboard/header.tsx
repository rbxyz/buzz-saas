"use client";

import { User, ChevronDown } from "lucide-react";
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
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-background sticky top-0 z-10 flex h-16 items-center justify-between border-b px-4 py-3 md:pl-64">
      <div className="text-lg font-semibold md:hidden"></div>

      <div className="ml-auto flex items-center gap-2">
        {/* Toggle Theme */}
        <Button
          variant="ghost"
          className="cursor-pointer p-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={
            theme === "dark"
              ? "Mudar para tema claro"
              : "Mudar para tema escuro"
          }
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
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                <User className="text-primary h-5 w-5" />
              </div>
              <span className="hidden sm:block">Ruan</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <a
                href="/dashboard/configuracoes"
                className="flex w-full cursor-pointer items-center"
              >
                Configurações
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/logout"
                className="flex w-full cursor-pointer items-center"
              >
                Sair
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
