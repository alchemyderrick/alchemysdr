'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Home, MessageCircle, Target, CheckCircle, FileText, ShieldCheck, Key } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { XConnectModal } from '@/components/x-connect-modal'

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
  const [xConnected, setXConnected] = useState(false)
  const [showXConnectModal, setShowXConnectModal] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')

  // Check X authentication status
  const checkXStatus = async () => {
    try {
      const res = await fetch('/api/x-auth/status', { credentials: 'include' })
      const data = await res.json()

      // If status changed from disconnected to connected, show success toast
      if (!xConnected && data.authenticated) {
        toast.success('✅ X account connected! Ready to discover users', {
          description: `${data.cookieCount} cookies stored`,
          duration: 5000
        })
      }

      setXConnected(data.authenticated || false)
    } catch (error) {
      console.error('Error checking X status:', error)
    }
  }

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin || false)
        setImpersonating(data.impersonating || null)
        setSessionId(data.sessionId || '')
      })
      .catch(() => {})

    // Initial X status check
    checkXStatus()
  }, [pathname])

  // Poll for X connection status when modal is open
  useEffect(() => {
    if (showXConnectModal && !xConnected) {
      // Poll every 3 seconds while modal is open and not connected
      const interval = setInterval(() => {
        checkXStatus()
      }, 3000)

      return () => {
        clearInterval(interval)
      }
    }
  }, [showXConnectModal, xConnected])

  const handleXConnect = () => {
    if (xConnected) {
      // Re-sync cookies
      setShowXConnectModal(true)
    } else {
      // First time connection
      setShowXConnectModal(true)
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
          onClick={handleXConnect}
          className="w-full justify-start gap-3 text-xs"
        >
          <Key className="h-3 w-3" />
          <span>{xConnected ? '✓ X Connected' : 'Connect X Account'}</span>
        </Button>
      </div>

      <XConnectModal
        open={showXConnectModal}
        onOpenChange={setShowXConnectModal}
        sessionId={sessionId}
      />
    </aside>
  )
}
