"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Home,
  Calendar,
  Users,
  Settings,
  LinkIcon,
  MessageSquare,
  LogOut,
  ChevronRight,
  PanelLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/contexts/sidebar-context";

interface Route {
  title: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  blocked?: boolean;
}

const routes: Route[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Agendamentos", href: "/dashboard/agendamentos", icon: Calendar },
  { title: "Clientes", href: "/dashboard/clientes", icon: Users },
  { title: "Linktree", href: "/dashboard/linktree", icon: LinkIcon },
  { title: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare },
  {
    title: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings,
  },
  { title: "Página Inicial", href: "/", icon: Home },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, setIsOpen } = useSidebar();
  const isMobile = useIsMobile();

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const [logoVisible, setLogoVisible] = useState(true);

  const { toast } = useToast();
  const { logout } = useAuth();

  const logoPath =
    currentTheme === "dark"
      ? "/logo-extend-pby-allpines.png"
      : "/logo-extend-pby-allpines-dark.png";

  useEffect(() => {
    setLogoVisible(false);
    const timeout = setTimeout(() => setLogoVisible(true), 150);
    return () => clearTimeout(timeout);
  }, [currentTheme]);

  const handleNavigation = (href: string, blocked?: boolean) => {
    if (blocked) {
      toast({
        title: "Página em desenvolvimento",
        description: "Esta funcionalidade ainda está sendo desenvolvida.",
        variant: "default",
        duration: 3000,
      });
      return;
    }

    if (pathname === href) return;
    router.push(href);
  };

  useEffect(() => {
    routes.forEach((route) => {
      if (!route.blocked) {
        router.prefetch(route.href);
      }
    });
  }, [router]);

  // Fechar sidebar ao mudar de rota em dispositivos móveis
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [pathname, isMobile, setIsOpen]);

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
    <>
      {/* Overlay mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-sidebar-background border-r border-sidebar-border transition-transform duration-300 ease-smooth",
          isMobile && !isOpen && "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header com logo */}
          <div className="relative flex h-16 items-center justify-center border-b border-sidebar-border/50 px-6">
            {logoVisible && (
              <Image
                src={logoPath}
                alt="Buzz-SaaS Logo"
                width={120}
                height={32}
                className="object-contain transition-opacity duration-300"
                priority
              />
            )}
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className="space-y-1 px-3">
              {routes.map((route) => {
                const isActive = pathname === route.href;
                const Icon = route.icon;

                return (
                  <Button
                    key={route.href}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all duration-200 ease-smooth",
                      "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/30",
                      isActive && 
                        "bg-brand-light/20 text-brand-primary hover:bg-brand-light/30 hover:text-brand-primary border border-brand-primary/10 shadow-minimal",
                      route.blocked && "opacity-50"
                    )}
                    onClick={() => handleNavigation(route.href, route.blocked)}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-brand-primary" : "text-current"
                    )} />
                    <span className="text-body-small font-medium">
                      {route.title}
                    </span>
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-primary" />
                    )}
                  </Button>
                );
              })}
            </div>
          </nav>

          {/* Footer com logout */}
          <div className="p-3 border-t border-sidebar-border/50">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 px-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-body-small font-medium">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
