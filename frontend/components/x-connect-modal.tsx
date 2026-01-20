'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface XConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId?: string
}

export function XConnectModal({ open, onOpenChange, sessionId }: XConnectModalProps) {
  const [copied, setCopied] = useState(false)
  const [bookmarkletCode, setBookmarkletCode] = useState('')

  // Get the current URL for the Railway app
  const railwayUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (open && railwayUrl) {
      // Generate bookmarklet code with session ID - improved with better error handling and console logging
      const code = `javascript:(function(){console.log('[SDR Console] Bookmarklet clicked');const cookies=document.cookie;const sessionToken='${sessionId || ''}';const railwayUrl='${railwayUrl}';if(!window.location.hostname.includes('x.com')&&!window.location.hostname.includes('twitter.com')){alert('⚠️ Please use this bookmark on x.com (while logged in)');console.error('[SDR Console] Not on x.com');return}if(!cookies){alert('⚠️ No cookies found. Please make sure you are logged into X.');console.error('[SDR Console] No cookies found');return}console.log('[SDR Console] Sending cookies to '+railwayUrl);alert('📡 Connecting to SDR Console...');fetch(railwayUrl+'/api/x-auth/upload-cookies-from-browser',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({cookies,sessionToken})}).then(r=>{console.log('[SDR Console] Response status:',r.status);return r.json()}).then(data=>{console.log('[SDR Console] Response:',data);if(data.success){alert('✅ X account connected! You can now use X automation.\\n\\nCookies stored: '+data.cookieCount)}else{alert('❌ Failed to connect: '+data.error);console.error('[SDR Console] Error:',data.error)}}).catch(err=>{console.error('[SDR Console] Fetch failed:',err);alert('❌ Connection failed: '+err.message+'\\n\\nMake sure you are logged into the SDR Console.')})})();`

      setBookmarkletCode(code)
    }
  }, [open, railwayUrl, sessionId])

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode)
    setCopied(true)
    toast.success('Bookmarklet code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Connect Your X Account</DialogTitle>
          <DialogDescription>
            Follow these steps to connect your X (Twitter) account for automation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                1
              </div>
              <h3 className="font-semibold">Drag this button to your bookmarks bar</h3>
            </div>
            <div className="pl-8">
              <a
                href={bookmarkletCode}
                className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium cursor-move select-none"
                onClick={(e) => {
                  e.preventDefault()
                  toast.info('Drag this button to your bookmarks bar')
                }}
              >
                📡 Connect SDR Console to X
              </a>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag the blue button above to your browser's bookmarks bar. If you don't see your bookmarks bar, press Ctrl+Shift+B (Windows) or Cmd+Shift+B (Mac).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                2
              </div>
              <h3 className="font-semibold">Go to x.com and log in</h3>
            </div>
            <div className="pl-8">
              <p className="text-sm text-muted-foreground">
                Open <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">x.com</a> in a new tab and make sure you're logged into your X account.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                3
              </div>
              <h3 className="font-semibold">Click the bookmark</h3>
            </div>
            <div className="pl-8">
              <p className="text-sm text-muted-foreground">
                While on x.com, click the "Connect SDR Console to X" bookmark you just added. You'll see a confirmation message when your account is connected.
              </p>
            </div>
          </div>

          {/* Alternative: Copy code */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Can't drag the bookmark?</strong> Copy the code below and create a bookmark manually:
            </p>
            <div className="relative">
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                {bookmarkletCode}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyBookmarklet}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Help text */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>💡 Tip:</strong> This bookmark will only work when you're on x.com. It's completely safe and only sends your X cookies to this app to enable automation.
            </p>
          </div>

          {/* Status indicator */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p className="text-sm text-green-900 dark:text-green-100">
              <strong>🔄 Waiting for connection...</strong> When you click the bookmark on x.com, you'll see a notification here automatically.
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
