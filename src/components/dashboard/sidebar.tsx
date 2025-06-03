"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Calendar,
  Users,
  MessageSquare,
  Settings,
  LinkIcon,
  Home,
  LogOut,
  X,
  Menu,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const [logoVisible, setLogoVisible] = useState(true);

  const logoPath =
    currentTheme === "dark"
      ? "/logo-extend-pby-allpines.png"
      : "/logo-extend-pby-allpines-dark.png";

  useEffect(() => {
    setLogoVisible(false);
    const timeout = setTimeout(() => setLogoVisible(true), 150);
    return () => clearTimeout(timeout);
  }, [currentTheme]);

  const routes = [
    { title: "Dashboard", href: "/dashboard", icon: Home },
    { title: "Agendamentos", href: "/dashboard/agendamentos", icon: Calendar },
    { title: "Clientes", href: "/dashboard/clientes", icon: Users },
    { title: "Chatbot", href: "/dashboard/chatbot", icon: MessageSquare },
    { title: "Linktree", href: "/dashboard/linktree", icon: LinkIcon },
    {
      title: "Configurações",
      href: "/dashboard/configuracoes",
      icon: Settings,
    },
    { title: "Página Inicial", href: "/", icon: Home },
  ];

  const handleNavigation = (href: string) => {
    if (pathname === href) return;
    router.push(href);
  };

  useEffect(() => {
    routes.forEach((route) => {
      router.prefetch(route.href);
    });
  }, [router]);

  return (
    <>
      {/* Botão toggle mobile */}
      <Button
        variant="ghost"
        className="fixed top-4 left-4 z-50 p-2 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar desktop */}
      <Sidebar
        className="hidden w-64 flex-col md:flex"
        style={{
          backgroundColor: "hsl(var(--sidebar-background))",
          color: "hsl(var(--sidebar-foreground))",
        }}
      >
        <SidebarContent className="mt-20 flex-1 overflow-y-auto">
          <SidebarMenu>
            {routes.map((route, index) => {
              const isActive = pathname === route.href;

              return (
                <SidebarMenuItem
                  key={route.href}
                  className={cn(
                    index === 5 ? "mb-10" : "", // adiciona margem só depois do item de índice 5 (Configurações)
                  )}
                >
                  <SidebarMenuButton
                    onClick={() => {
                      if (typeof route.href === "string") {
                        handleNavigation(route.href);
                      }
                    }}
                    className={cn(
                      "mx-auto flex max-w-[280px] cursor-pointer items-center gap-4 rounded-md px-5 py-2 font-semibold transition-all select-none",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground text-[20px]"
                        : "text-sidebar-foreground hover:bg-sidebar-border hover:text-accent-foreground w-60 text-[18px]",
                    )}
                  >
                    <route.icon className="h-6 w-6" />
                    <span>{route.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-4 py-3">
          <SidebarHeader
            className="flex items-center gap-3 px-4 py-3"
            style={{ justifyContent: "flex-start", paddingLeft: 0 }}
          >
            <div
              style={{
                transition: "opacity 0.3s",
                opacity: logoVisible ? 1 : 0,
              }}
            >
              <Image
                src={logoPath}
                alt="Logo"
                width={160}
                height={160}
                priority
                className="select-none"
              />
            </div>
          </SidebarHeader>
          <Button
            variant="outline"
            className="w-full justify-start"
            size="sm"
            onClick={() => console.log("logout")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Sidebar mobile */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          />

          <aside
            className={`fixed top-0 left-0 z-40 flex h-full w-64 flex-col shadow-lg transition-transform duration-300 ease-in-out`}
            style={{
              backgroundColor: "hsl(var(--sidebar-background))",
              color: "hsl(var(--sidebar-foreground))",
              transform: isOpen ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <SidebarHeader className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    transition: "opacity 0.3s",
                    opacity: logoVisible ? 1 : 0,
                  }}
                >
                  <Image
                    src={logoPath}
                    alt="Logo"
                    width={32}
                    height={32}
                    priority
                    className="select-none"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar menu"
                className="p-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </SidebarHeader>

            <SidebarContent className="flex-1 overflow-y-auto">
              <SidebarMenu>
                {routes.map((route) => {
                  const isActive = pathname === route.href;
                  return (
                    <SidebarMenuItem key={route.href}>
                      <SidebarMenuButton
                        onClick={() => {
                          handleNavigation(route.href);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-4 rounded-md px-4 py-2 font-semibold transition-all",
                          isActive
                            ? "bg-primary text-white"
                            : "hover:bg-muted text-muted-foreground",
                        )}
                      >
                        <route.icon className="h-5 w-5" />
                        <span className="text-sm">{route.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="border-t px-4 py-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  console.log("logout");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </SidebarFooter>
          </aside>
        </>
      )}
    </>
  );
}
