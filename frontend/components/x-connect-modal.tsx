'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
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
  const [bookmarkletCode, setBookmarkletCode] = useState('')
  const [cookiesInput, setCookiesInput] = useState('')
  const [uploading, setUploading] = useState(false)

  // Get the current URL for the Railway app
  const railwayUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (open && railwayUrl) {
      // Generate bookmarklet code - copies cookies to clipboard (bypasses CSP)
      const code = `javascript:(function(){if(!window.location.hostname.includes('x.com')&&!window.location.hostname.includes('twitter.com')){alert('⚠️ Please use this bookmark on x.com (while logged in)');return}const cookies=document.cookie;if(!cookies){alert('⚠️ No cookies found. Please make sure you are logged into X.');return}navigator.clipboard.writeText(cookies).then(()=>{alert('✅ X cookies copied to clipboard!\\n\\nNow go back to the SDR Console and paste them into the text box.')}).catch(()=>{prompt('Copy these cookies manually:',cookies)})})();`

      setBookmarkletCode(code)
    }
  }, [open, railwayUrl, sessionId])

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode)
    toast.success('Bookmarklet code copied!')
  }

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
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Setup (3 steps):</h3>
            <ol className="text-sm text-blue-900 dark:text-blue-100 space-y-2 list-decimal list-inside">
              <li>Create the bookmark using the button below (or copy/paste manually)</li>
              <li>Go to <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">x.com</a> and click the bookmark</li>
              <li>Come back here and paste the cookies in the text box</li>
            </ol>
          </div>

          {/* Step 1: Create Bookmark */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                1
              </div>
              Create the Bookmark
            </h3>
            <div className="pl-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Drag this button to your bookmarks bar (press Cmd+Shift+B or Ctrl+Shift+B to show it):
              </p>
              <a
                href={bookmarkletCode}
                className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium cursor-move select-none"
                onClick={(e) => {
                  e.preventDefault()
                  toast.info('💡 Drag this button to your bookmarks bar (don\'t click it!)')
                }}
              >
                📋 Copy X Cookies
              </a>
              <p className="text-xs text-muted-foreground">
                Or <button onClick={handleCopyBookmarklet} className="text-primary hover:underline">copy the code</button> and create a bookmark manually
              </p>
            </div>
          </div>

          {/* Step 2: Run on X.com */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                2
              </div>
              Run the Bookmark on X.com
            </h3>
            <div className="pl-8">
              <p className="text-sm text-muted-foreground">
                Go to <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">x.com</a>, make sure you're logged in, then click the bookmark. It will copy your cookies to clipboard.
              </p>
            </div>
          </div>

          {/* Step 3: Paste Cookies */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                3
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
