'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { useResearch } from '@/lib/research-context'

interface ImportTargetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ImportResult {
  inserted: number
  skipped: number
  duplicates?: number
  inserted_ids?: { id: string; team_name: string }[]
}

interface ResearchResult {
  ok: boolean
  id: string
  team_name: string
  x_handle?: string | null
  website?: string | null
  contacts_found?: number
  error?: string
}

export function ImportTargetsModal({ open, onOpenChange, onSuccess }: ImportTargetsModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [bypassFilter, setBypassFilter] = useState(false)
  const { startResearch, updateTask } = useResearch()

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

      // Import targets first
      const result = await api.post<ImportResult>('/api/targets/import', {
        items,
        bypass_filter: bypassFilter,
        return_ids: true // Request IDs back for research
      })

      const parts = [`Imported ${result.inserted} targets`]
      if (result.duplicates) parts.push(`${result.duplicates} duplicates`)
      if (result.skipped) parts.push(`${result.skipped} skipped`)
      toast.success(parts.join(', '))

      // Close modal and reset state
      setText('')
      setBypassFilter(false)
      onOpenChange(false)
      onSuccess()

      // Start research for all imported targets
      if (result.inserted_ids && result.inserted_ids.length > 0) {
        toast.info(`Starting research for ${result.inserted_ids.length} teams...`)

        // Initialize progress tracking
        startResearch(result.inserted_ids)

        // Research each target sequentially
        for (const target of result.inserted_ids) {
          try {
            // Update status to researching
            updateTask(target.id, { status: 'researching_x' })

            // Call the full research endpoint
            const researchResult = await api.post<ResearchResult>(`/api/targets/${target.id}/research-full`, {})

            // Update with results
            updateTask(target.id, {
              status: 'completed',
              x_handle: researchResult.x_handle,
              website: researchResult.website,
              contacts_found: researchResult.contacts_found || 0
            })
          } catch (e) {
            console.error(`Research failed for ${target.team_name}:`, e)
            updateTask(target.id, {
              status: 'error',
              error: e instanceof Error ? e.message : 'Research failed'
            })
          }
        }

        // Refresh the targets list after all research is done
        onSuccess()
      }
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
          <DialogTitle>Research & Import Target Teams</DialogTitle>
          <DialogDescription>
            Import teams via JSON. Teams will be researched to find Twitter handles, websites, and contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-medium">Filter Criteria:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><span className="text-foreground font-medium">raised_usd &ge; $10M</span> OR <span className="text-foreground font-medium">monthly_revenue_usd &ge; $500k</span></li>
              <li>Must be <span className="text-foreground font-medium">is_web3: true</span></li>
            </ul>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bypassFilter}
              onChange={(e) => setBypassFilter(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">Bypass filter criteria (import all teams)</span>
          </label>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
            <p className="font-medium text-blue-500 mb-1">Research includes:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Finding official Twitter/X handles</li>
              <li>Finding official website URLs</li>
              <li>Discovering team contacts (founders, CTOs, etc.)</li>
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
              {loading ? 'Importing...' : 'Research & Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
