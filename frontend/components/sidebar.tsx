'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Home, MessageCircle, Target, CheckCircle, FileText, ShieldCheck, Key } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

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
  const [authenticating, setAuthenticating] = useState(false)

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin || false)
        setImpersonating(data.impersonating || null)
      })
      .catch(() => {})
  }, [pathname])

  const handleXAuth = async () => {
    try {
      setAuthenticating(true)
      toast.info('Opening X login on your Mac...')

      const result = await api.post<{ success: boolean, message?: string }>('/api/x-auth/authenticate', {})

      if (result.success) {
        toast.success('X authentication successful!')
      } else {
        toast.error(result.message || 'X authentication failed')
      }
    } catch (error: any) {
      console.error('X auth error:', error)
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        toast.error('Timeout - make sure relayer is running on your Mac')
      } else {
        toast.error('X authentication failed')
      }
    } finally {
      setAuthenticating(false)
    }
  }

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

      <div className="mt-auto pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handleXAuth}
          disabled={authenticating}
          className="w-full justify-start gap-3 text-xs"
        >
          <Key className="h-3 w-3" />
          <span>{authenticating ? 'Authenticating...' : 'Login to X'}</span>
        </Button>
      </div>
    </aside>
  )
}
