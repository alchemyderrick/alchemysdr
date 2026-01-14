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
}

export function ImportTargetsModal({ open, onOpenChange, onSuccess }: ImportTargetsModalProps) {
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

      const result = await api.post<{ inserted: number; skipped: number }>('/api/targets/import', { items })
      toast.success(`Imported ${result.inserted} targets (${result.skipped} skipped)`)
      setText('')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Invalid JSON format. Please check the format and try again.')
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
          <DialogTitle>Import Target Teams</DialogTitle>
          <DialogDescription>
            Import teams via JSON. Only teams meeting the filter criteria will be added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-medium">Filter Criteria:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Must have <span className="text-foreground font-medium">raised_usd &ge; $10M</span></li>
              <li>Must have <span className="text-foreground font-medium">monthly_revenue_usd &ge; $500k</span></li>
              <li>Must be <span className="text-foreground font-medium">is_web3: true</span></li>
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
    "x_handle": "example_handle",
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
            className="min-h-[200px] font-mono text-sm"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={loading || !text.trim()}>
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
