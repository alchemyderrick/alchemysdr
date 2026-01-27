'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Copy, Download, Terminal, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface SetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string
}

export function SetupModal({ open, onOpenChange, employeeId }: SetupModalProps) {
  const [copiedInstall, setCopiedInstall] = useState(false)
  const [copiedRun, setCopiedRun] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  const serverUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sdr-console-production.up.railway.app'
  const installCommand = `curl -fsSL ${serverUrl}/install.sh | bash`
  const runCommand = 'cd ~/sdr-relayer && npm run relayer'

  const copyToClipboard = async (text: string, type: 'install' | 'run') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'install') {
        setCopiedInstall(true)
        setTimeout(() => setCopiedInstall(false), 2000)
      } else {
        setCopiedRun(true)
        setTimeout(() => setCopiedRun(false), 2000)
      }
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Setup Relayer
          </DialogTitle>
          <DialogDescription>
            One command to install the Telegram automation on your Mac
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main install command */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Paste this in Terminal:</h3>
            <div className="relative">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <code>{installCommand}</code>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(installCommand, 'install')}
              >
                {copiedInstall ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* What it does */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-2">
              The installer will:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" /> Download and install the relayer
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" /> Prompt for your credentials
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" /> Open System Settings for permissions
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3" /> Start the relayer automatically
              </li>
            </ul>
          </div>

          {/* Credentials reminder */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-2">
              Have these ready:
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li><strong>EMPLOYEE_ID:</strong> {employeeId || 'your username'}</li>
              <li><strong>RELAYER_API_KEY:</strong> (from your manager)</li>
              <li><strong>ANTHROPIC_API_KEY:</strong> (from your manager)</li>
            </ul>
          </div>

          {/* Run command for later */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">To start relayer later:</h4>
            <div className="relative">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg font-mono text-xs">
                <code>{runCommand}</code>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 h-7 w-7 p-0"
                onClick={() => copyToClipboard(runCommand, 'run')}
              >
                {copiedRun ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Troubleshooting accordion */}
          <div className="border rounded-lg">
            <button
              className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            >
              <span>Troubleshooting</span>
              {showTroubleshooting ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showTroubleshooting && (
              <div className="px-3 pb-3 text-sm space-y-3">
                <div>
                  <p className="font-medium">Telegram opens but nothing sends</p>
                  <p className="text-muted-foreground text-xs">
                    Grant Accessibility permission: System Settings &rarr; Privacy &amp; Security &rarr; Accessibility &rarr; Add Terminal
                  </p>
                </div>
                <div>
                  <p className="font-medium">&quot;Cannot reach server&quot;</p>
                  <p className="text-muted-foreground text-xs">
                    Check your internet connection and verify the server URL is correct
                  </p>
                </div>
                <div>
                  <p className="font-medium">&quot;Unauthorized&quot; or &quot;Invalid API key&quot;</p>
                  <p className="text-muted-foreground text-xs">
                    Double-check your RELAYER_API_KEY matches what your manager provided
                  </p>
                </div>
                <div>
                  <p className="font-medium">No drafts processing</p>
                  <p className="text-muted-foreground text-xs">
                    Make sure your EMPLOYEE_ID matches your web UI username exactly
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <a
            href="/relayer-package.tar.gz"
            download
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            Manual download
          </a>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
