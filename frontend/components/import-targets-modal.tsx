'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

interface ImportTargetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onStartProgress?: () => void
  onCompleteProgress?: (message: string) => void
  onFailProgress?: (error: string) => void
}

export function ImportTargetsModal({ open, onOpenChange, onSuccess, onStartProgress, onCompleteProgress, onFailProgress }: ImportTargetsModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!text.trim()) {
      toast.error('Please enter some data to import')
      return
    }

    try {
      setLoading(true)
      const data = JSON.parse(text)
      const items = Array.isArray(data) ? data : data.items || []

      if (items.length === 0) {
        toast.error('No valid items found in the data')
        return
      }

      // Close modal and start progress toast before the API call
      setText('')
      onOpenChange(false)
      onStartProgress?.()

      const result = await api.post<{ inserted: number; skipped: number; duplicates?: number; research_queued?: number }>('/api/targets/import', { items, bypass_filter: true })
      const parts = [`Imported ${result.inserted} targets`]
      if (result.duplicates) parts.push(`${result.duplicates} duplicates`)
      if (result.skipped) parts.push(`${result.skipped} skipped`)

      if (result.research_queued && result.research_queued > 0) {
        // Research is happening - complete progress after estimated time
        // The server runs research in background, so we simulate progress
        setTimeout(() => {
          onCompleteProgress?.(parts.join(', ') + ` - Research complete for ${result.research_queued} teams!`)
          onSuccess()
        }, 90000) // ~90 seconds for research to complete
      } else {
        onCompleteProgress?.(parts.join(', '))
        onSuccess()
      }
    } catch {
      onFailProgress?.('Invalid JSON format. Please check the format and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      setText(content)
    } catch {
      toast.error('Failed to read file')
    }

    e.target.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Research & Import Target Teams</DialogTitle>
          <DialogDescription>
            Import teams via JSON. Each team will be researched to find contacts, Twitter handles, and websites.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
            <p className="font-medium text-primary mb-1">Research includes:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Finding official Twitter/X handles</li>
              <li>Finding official website URLs</li>
              <li>Discovering team contacts (founders, CTOs, engineers)</li>
              <li>Searching Apollo API + web for employee data</li>
            </ul>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">JSON Format:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
{`[
  {
    "team_name": "Example Protocol",
    "raised_usd": 15000000,
    "monthly_revenue_usd": 600000,
    "is_web3": true,
    "x_handle": "exampleprotocol",
    "website": "https://example.com",
    "notes": "Optional notes about the team"
  }
]`}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              className="border-border/50"
            >
              Upload JSON File
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste JSON data here or upload a file..."
            className="h-[200px] max-h-[200px] font-mono text-sm resize-none overflow-auto"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={loading || !text.trim()}>
              {loading ? 'Importing...' : 'Research & Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
