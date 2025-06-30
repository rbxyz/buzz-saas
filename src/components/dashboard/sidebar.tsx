'use client'

import { useAuth } from '@/contexts/auth-context'
import { useSidebar } from '@/contexts/sidebar-context'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Home,
  Link as LinkIcon,
  LogOut,
  Settings,
  Users,
  Bot,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { useToast } from '@/hooks/use-toast'

const menuItems = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/dashboard/agendamentos', label: 'Agendamentos', icon: Calendar },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/linktree', label: 'Linktree', icon: LinkIcon },
  { href: '/dashboard/chatbot', label: 'Chatbot', icon: Bot },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const { isExpanded } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  if (!user) return null

  const handleLogout = () => {
    logout()
    toast({
      title: 'Logout realizado com sucesso!',
      description: 'Você foi desconectado da sua conta.',
    })
    router.push('/')
  }

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
  )
}

export { Sidebar as DashboardSidebar } 