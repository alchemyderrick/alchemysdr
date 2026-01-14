'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Home, MessageCircle, Target, CheckCircle, FileText, ShieldCheck } from 'lucide-react'
import { XAuthButton } from './x-auth-button'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/followups', label: 'Follow-ups', icon: MessageCircle },
  { href: '/targets', label: 'Research Teams', icon: Target },
  { href: '/active', label: 'Active Outreach', icon: CheckCircle },
  { href: '/approved', label: 'Target Teams', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin || false)
        setImpersonating(data.impersonating || null)
      })
      .catch(() => {})
  }, [pathname])

  return (
    <aside className="w-56 bg-card border-r flex flex-col py-8 px-4">
      <div className="mb-8 px-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          SDR Console
        </h1>
        {impersonating && (
          <div className="mt-2 px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
            Viewing as: {impersonating}
          </div>
        )}
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

        {isAdmin && (
          <>
            <div className="my-2 border-t" />
            <Link href="/admin">
              <Button
                variant={pathname === '/admin' ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 ${
                  pathname === '/admin' ? 'bg-primary text-primary-foreground shadow-lg' : ''
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Admin</span>
              </Button>
            </Link>
          </>
        )}
      </nav>

      {/* X Authentication Button */}
      <div className="mt-auto pt-4 border-t">
        <XAuthButton />
      </div>
    </aside>
  )
}
