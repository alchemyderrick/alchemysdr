'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Check, X as XIcon } from 'lucide-react'

export function XAuthButton() {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'not-authenticated'>('loading')
  const [authenticating, setAuthenticating] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const result = await api.get<any>('/api/x-auth/status')
      setStatus(result.authenticated ? 'authenticated' : 'not-authenticated')
    } catch (error) {
      setStatus('not-authenticated')
    }
  }

  const handleAuthenticate = async () => {
    setAuthenticating(true)
    try {
      // Open X login in new window
      const width = 600
      const height = 700
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      const authWindow = window.open(
        '/x-auth-popup',
        'X Authentication',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      )

      if (!authWindow) {
        toast.error('Please allow popups for authentication')
        setAuthenticating(false)
        return
      }

      // Listen for auth completion message from popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'x-auth-complete' && event.data.success) {
          window.removeEventListener('message', handleMessage)
          if (!authWindow.closed) authWindow.close()
          toast.success('X authentication successful!')
          await checkStatus() // Refresh status
          setAuthenticating(false)
        } else if (event.data.type === 'x-auth-error') {
          window.removeEventListener('message', handleMessage)
          if (!authWindow.closed) authWindow.close()
          toast.error('Authentication failed: ' + (event.data.error || 'Unknown error'))
          setAuthenticating(false)
        }
      }

      window.addEventListener('message', handleMessage)

      // Timeout after 5 minutes
      setTimeout(() => {
        if (authWindow && !authWindow.closed) {
          authWindow.close()
          window.removeEventListener('message', handleMessage)
          toast.error('Authentication timeout')
          setAuthenticating(false)
        }
      }, 300000)
    } catch (error) {
      console.error('Auth error:', error)
      toast.error('Authentication failed')
      setAuthenticating(false)
    }
  }

  if (status === 'loading') {
    return (
      <Button variant="outline" disabled size="sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking X Auth...
      </Button>
    )
  }

  if (status === 'authenticated') {
    return (
      <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50">
        <Check className="mr-2 h-4 w-4" />
        X Authenticated
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAuthenticate}
      disabled={authenticating}
      className="border-amber-500 text-amber-600 hover:bg-amber-50"
    >
      {authenticating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          <XIcon className="mr-2 h-4 w-4" />
          Authenticate X
        </>
      )}
    </Button>
  )
}
