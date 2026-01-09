'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, MessageCircle, Target, CheckCircle, FileText } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/followups', label: 'Follow-ups', icon: MessageCircle },
  { href: '/targets', label: 'Top Targets', icon: Target },
  { href: '/active', label: 'Active Outreach', icon: CheckCircle },
  { href: '/approved', label: 'No Outreach', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-card border-r flex flex-col py-8 px-4">
      <div className="mb-8 px-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          SDR Console
        </h1>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 ${
                  isActive ? 'bg-primary text-primary-foreground shadow-lg' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
