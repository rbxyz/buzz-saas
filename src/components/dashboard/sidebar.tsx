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
  Book,
  Bell,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/contexts/sidebar-context";
import Link from "next/link";

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
  { title: "Chatbot", href: "/dashboard/chatbot", icon: Bot },
  {
    title: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings,
  },
  { title: "Página Inicial", href: "/", icon: Home },
];

const menuItems = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/dashboard/agendamentos', label: 'Agendamentos', icon: Calendar },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/linktree', label: 'Linktree', icon: LinkIcon },
  { href: '/dashboard/chatbot', label: 'Chatbot', icon: Bot },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    toast({
      title: 'Logout realizado com sucesso!',
      description: 'Você será redirecionado para a página de login.',
    });
    router.push('/');
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out',
        isExpanded ? 'w-64' : 'w-20',
      )}
    >
      <div className="flex h-16 items-center justify-center border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo-extend-pby-allpines-dark.png"
            alt="Logo"
            width={32}
            height={32}
          />
          {isExpanded && (
            <span className="text-lg font-semibold">Buzz SaaS</span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
                {isExpanded && <span>{item.label}</span>}
              </Button>
            </Link>
          ))}
          <Link href="/docs">
            <Button
              variant={pathname.startsWith('/docs') ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              title="Documentação"
            >
              <Book className="h-5 w-5" />
              {isExpanded && <span>Documentação</span>}
            </Button>
          </Link>
        </nav>
      </div>

      <div className="p-4">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start gap-2"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
          {isExpanded && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
