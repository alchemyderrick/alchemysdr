'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Home, MessageCircle, Target, CheckCircle, FileText, ShieldCheck, Key, Download, Trophy, Bot, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { toast } from 'sonner'
import { XConnectModal } from '@/components/x-connect-modal'
import { SetupModal } from '@/components/setup-modal'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
  return 'items' in entry
}

const navItems: NavEntry[] = [
  { href: '/', label: 'Home', icon: Home },
  {
    label: 'Messaging',
    icon: MessageCircle,
    items: [
      { href: '/followups', label: 'Follow-Ups', icon: MessageCircle },
      { href: '/wins', label: 'W Messaging', icon: Trophy },
    ],
  },
  {
    label: 'Teams',
    icon: Users,
    items: [
      { href: '/targets', label: 'Add Teams', icon: Target },
      { href: '/active', label: 'Active Outreach', icon: CheckCircle },
      { href: '/approved', label: 'Target Teams', icon: FileText },
    ],
  },
  { href: '/support', label: 'Support Bot', icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [xConnected, setXConnected] = useState(false)
  const [showXConnectModal, setShowXConnectModal] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => pathname === item.href)
  }

  // Check X authentication status
  const checkXStatus = async (showToast = true) => {
    try {
      const res = await fetch('/api/x-auth/status', { credentials: 'include' })
      const data = await res.json()

      // Show success toast when status changes from disconnected to connected
      setXConnected((prevConnected) => {
        if (!prevConnected && data.authenticated && showToast) {
          toast.success('✅ X account connected! Ready to discover users', {
            description: `${data.cookieCount} cookies stored`,
            duration: 5000
          })
        }
        return data.authenticated || false
      })
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
        setEmployeeId(data.employeeId || '')
      })
      .catch(() => {})

    // Initial X status check (no toast on initial load)
    checkXStatus(false)
  }, [pathname])

  // Poll for X connection status when modal is open
  useEffect(() => {
    if (showXConnectModal && !xConnected) {
      console.log('[Sidebar] Starting X status polling...')

      // Poll every 3 seconds while modal is open and not connected
      const interval = setInterval(() => {
        console.log('[Sidebar] Polling X status...')
        checkXStatus(true)
      }, 3000)

      return () => {
        console.log('[Sidebar] Stopping X status polling')
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
          Derrick Bot (TG)
        </h1>
        {impersonating && (
          <div className="mt-2 px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
            Viewing as: {impersonating}
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((entry) => {
          if (isNavGroup(entry)) {
            const Icon = entry.icon
            const isExpanded = expandedGroups.has(entry.label)
            const groupActive = isGroupActive(entry)

            return (
              <div key={entry.label}>
                <Button
                  variant="ghost"
                  onClick={() => toggleGroup(entry.label)}
                  className={`w-full justify-start gap-3 ${
                    groupActive && !isExpanded ? 'text-primary' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium flex-1 text-left">{entry.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {isExpanded && (
                  <div className="ml-4 flex flex-col gap-1 mt-1">
                    {entry.items.map((item) => {
                      const ItemIcon = item.icon
                      const isActive = pathname === item.href

                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive ? 'default' : 'ghost'}
                            className={`w-full justify-start gap-3 ${
                              isActive ? 'bg-primary text-primary-foreground shadow-lg' : ''
                            }`}
                          >
                            <ItemIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Single nav item (not a group)
          const Icon = entry.icon
          const isActive = pathname === entry.href

          return (
            <Link key={entry.href} href={entry.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 ${
                  isActive ? 'bg-primary text-primary-foreground shadow-lg' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{entry.label}</span>
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

      <div className="mt-auto pt-4 border-t space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSetupModal(true)}
          className="w-full justify-start gap-3 text-xs"
        >
          <Download className="h-3 w-3" />
          <span>Setup Relayer</span>
        </Button>
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

      <SetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        employeeId={employeeId}
      />

      <XConnectModal
        open={showXConnectModal}
        onOpenChange={setShowXConnectModal}
        sessionId={sessionId}
      />
    </aside>
  )
}
