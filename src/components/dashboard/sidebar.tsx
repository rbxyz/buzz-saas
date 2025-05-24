"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  MessageSquare,
  BarChart,
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
      <Sidebar className="bg-background hidden w-64 flex-col md:flex">
        <SidebarHeader className="flex items-center gap-3 px-4 py-3">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={32}
            height={32}
            priority
            className="select-none"
          />
          <Link href="/dashboard" className="text-xl font-bold select-none">
            Duzz
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            {routes.map((route) => (
              <SidebarMenuItem key={route.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === route.href}
                  tooltip={route.title}
                >
                  <Link
                    href={route.href}
                    className="flex items-center gap-4 text-lg font-semibold"
                  >
                    <route.icon className="h-6 w-6" />
                    <span>{route.title}</span>
                  </Link>
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
        <aside className="bg-background fixed inset-0 z-40 flex w-64 flex-col shadow-md md:hidden">
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
              <Link href="/dashboard" className="text-xl font-bold select-none">
                Duzz
              </Link>
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
                    asChild
                    isActive={pathname === route.href}
                    tooltip={route.title}
                  >
                    <Link
                      href={route.href}
                      className="flex items-center gap-4 text-lg font-semibold"
                      onClick={() => setIsOpen(false)}
                    >
                      <route.icon className="h-6 w-6" />
                      <span>{route.title}</span>
                    </Link>
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
