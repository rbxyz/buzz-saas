"use client";

import { User, ChevronDown, Sun, Moon, Settings, LogOut, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "@/contexts/sidebar-context";

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();

  const handleLogout = () => {
    try {
      logout();
      router.push("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível sair. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-10 h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-6">
        {/* Botão de menu mobile */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Ações do usuário */}
        <div className="ml-auto flex items-center gap-2">
          {/* Toggle de tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-9 w-9 rounded-lg transition-all duration-200 hover:bg-muted/60"
            aria-label={
              theme === "dark"
                ? "Mudar para tema claro"
                : "Mudar para tema escuro"
            }
          >
            <Sun className="h-4 w-4 transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 transition-all scale-0 rotate-90 dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Dropdown do usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 gap-2 rounded-lg px-3 transition-all duration-200 hover:bg-muted/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand shadow-minimal">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="hidden flex-col items-start sm:flex">
                  <span className="text-body-small font-medium text-foreground">
                    Ruan
                  </span>
                  <span className="text-caption text-muted-foreground">
                    Administrador
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl border-subtle shadow-medium animate-fade-in"
            >
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-body-small font-medium">Ruan</span>
                    <span className="text-caption text-muted-foreground">
                      ruan@exemplo.com
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator className="bg-border/50" />
              
              <DropdownMenuItem
                className="cursor-pointer gap-2 px-3 py-2 transition-colors hover:bg-muted/60 focus:bg-muted/60"
                onClick={() => router.push("/dashboard/configuracoes")}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-body-small">Configurações</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-border/50" />
              
              <DropdownMenuItem
                className="cursor-pointer gap-2 px-3 py-2 text-destructive transition-colors hover:bg-destructive/5 focus:bg-destructive/5 hover:text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-body-small">Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
