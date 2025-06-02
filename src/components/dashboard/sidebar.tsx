"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

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
  ];

  // Função para navegação instantânea
  const handleNavigation = (href: string) => {
    if (pathname === href) return; // Não navega se já está na página

    // Dispara evento de início de navegação
    window.dispatchEvent(new Event("navigation-start"));

    // Navega imediatamente
    router.push(href);
  };

  // Prefetch todas as rotas ao montar o componente
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
        style={{
          backgroundColor: "hsl(var(--sidebar-background))",
          color: "hsl(var(--sidebar-foreground))",
        }}
        className="hidden w-64 flex-col md:flex"
      >
        <SidebarHeader
          className="flex items-center gap-3 px-4 py-3"
          style={{ justifyContent: "flex-start", paddingLeft: 0 }}
        >
          <Image
            src="/logo-b.png"
            alt="Logo"
            width={40}
            height={40}
            priority
            className="select-none"
          />
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            {routes.map((route) => (
              <SidebarMenuItem key={route.href}>
                <SidebarMenuButton
                  isActive={pathname === route.href}
                  tooltip={route.title}
                  onClick={() => handleNavigation(route.href)}
                  className="flex cursor-pointer items-center gap-4 text-lg font-semibold"
                >
                  <route.icon className="h-6 w-6" />
                  <span>{route.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-4 py-3">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Sidebar mobile */}
      {isOpen && (
        <aside
          style={{
            backgroundColor: "hsl(var(--sidebar-background))",
            color: "hsl(var(--sidebar-foreground))",
          }}
          className="fixed inset-0 z-40 flex w-64 flex-col shadow-md md:hidden"
        >
          <SidebarHeader className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                priority
                className="select-none"
              />
              <button
                onClick={() => {
                  handleNavigation("/dashboard");
                  setIsOpen(false);
                }}
                className="cursor-pointer text-xl font-bold select-none"
              >
                Duzz
              </button>
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
              {routes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton
                    isActive={pathname === route.href}
                    tooltip={route.title}
                    onClick={() => {
                      handleNavigation(route.href);
                      setIsOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-4 text-lg font-semibold"
                  >
                    <route.icon className="h-6 w-6" />
                    <span>{route.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t px-4 py-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                // logout aqui se quiser
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </SidebarFooter>
        </aside>
      )}
    </>
  );
}
