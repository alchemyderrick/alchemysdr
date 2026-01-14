'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>{children}</AuthGuard>
    </QueryClientProvider>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't check auth on login or register pages
    if (pathname === '/login' || pathname === '/register') {
      setIsChecking(false)
      setIsAuthenticated(true) // Allow these pages to render
      return
    }

    // Check authentication status
    fetch('/api/auth/status', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true)
        } else {
          // Redirect to login
          router.push('/login')
        }
      })
      .catch(() => {
        // On error, redirect to login
        router.push('/login')
      })
      .finally(() => {
        setIsChecking(false)
      })
  }, [pathname, router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated or on login/register pages
  if (!isAuthenticated && pathname !== '/login' && pathname !== '/register') {
    return null
  }

  return <>{children}</>
}
