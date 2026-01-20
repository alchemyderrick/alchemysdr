'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'

interface XConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId?: string
}

interface UploadResponse {
  success: boolean
  error?: string
  cookieCount?: number
}

export function XConnectModal({ open, onOpenChange, sessionId }: XConnectModalProps) {
  const [cookiesInput, setCookiesInput] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleUploadCookies = async () => {
    if (!cookiesInput.trim()) {
      toast.error('Please paste your X cookies first')
      return
    }

    setUploading(true)
    try {
      const result = await api.post<UploadResponse>('/api/x-auth/upload-cookies-from-browser', {
        cookies: cookiesInput,
        sessionToken: sessionId
      })

      if (result.success) {
        toast.success(`✅ X account connected! ${result.cookieCount} cookies stored`)
        setCookiesInput('')
        onOpenChange(false)
      } else {
        toast.error(`Failed: ${result.error}`)
      }
    } catch (error: any) {
      toast.error(`Connection failed: ${error?.response?.data?.error || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Your X Account</DialogTitle>
          <DialogDescription>
            Copy your X cookies and paste them below to enable automation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Simple Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Setup (2 steps):</h3>
            <ol className="text-sm text-blue-900 dark:text-blue-100 space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">x.com</a> and copy cookies from DevTools</li>
              <li>Come back here and paste the cookies in the text box</li>
            </ol>
          </div>

          {/* Step 1: Copy from DevTools */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                1
              </div>
              Copy Cookies from DevTools
            </h3>
            <div className="pl-8 space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Instructions:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside ml-2">
                  <li>Go to <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">x.com</a> and make sure you're logged in</li>
                  <li>Open DevTools (F12 or Cmd+Option+I on Mac)</li>
                  <li>Go to the <strong>Application</strong> tab (Chrome) or <strong>Storage</strong> tab (Firefox)</li>
                  <li>In the left sidebar, expand <strong>Cookies</strong> and click on <strong>https://x.com</strong></li>
                  <li>Look for the <strong>auth_token</strong> cookie and copy its value</li>
                  <li>Also copy values for: <strong>ct0</strong>, <strong>twid</strong>, and any other cookies</li>
                  <li>Format them as: <code className="text-xs bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">auth_token=VALUE1; ct0=VALUE2; twid=VALUE3</code></li>
                </ol>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-xs text-yellow-900 dark:text-yellow-100">
                  <strong>Tip:</strong> The auth_token is an HttpOnly cookie, so it won't show up in JavaScript. You must use DevTools to access it.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Paste Cookies */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                2
              </div>
              Paste Cookies Here
            </h3>
            <div className="pl-8 space-y-2">
              <Textarea
                placeholder="Paste your X cookies here (they look like: auth_token=...; ct0=...; ...)"
                value={cookiesInput}
                onChange={(e) => setCookiesInput(e.target.value)}
                className="font-mono text-xs min-h-[120px]"
              />
              <Button
                onClick={handleUploadCookies}
                disabled={uploading || !cookiesInput.trim()}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Connect X Account
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Help text */}
          <div className="bg-gray-50 dark:bg-gray-900 border rounded-md p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Why this method?</strong> X.com blocks external scripts for security. By copying cookies to clipboard and pasting them here, we bypass those restrictions while keeping your data secure.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
