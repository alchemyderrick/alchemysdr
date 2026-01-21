'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

interface ResearchUrlModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onStartProgress?: () => void
  onCompleteProgress?: (message: string) => void
  onFailProgress?: (error: string) => void
}

export function ResearchUrlModal({ open, onOpenChange, onSuccess, onStartProgress, onCompleteProgress, onFailProgress }: ResearchUrlModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResearch = async () => {
    if (!url.trim()) {
      toast.error('Please enter a website URL')
      return
    }

    try {
      setLoading(true)
      onOpenChange(false)
      onStartProgress?.()

      const result = await api.post<{ ok: boolean; result: { team_name: string } }>('/api/targets/research-url', { url: url.trim() })

      if (result.ok) {
        onCompleteProgress?.(`Added ${result.result.team_name} to Research Teams`)
        onSuccess()
      } else {
        onFailProgress?.('Research failed')
      }

      setUrl('')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Research failed'
      onFailProgress?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && url.trim()) {
      handleResearch()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Research from URL</DialogTitle>
          <DialogDescription>
            Enter a company website to auto-fill their profile using Apollo and AI research.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
            <p className="font-medium text-primary mb-1">Research will find:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-xs">
              <li>Company name and description</li>
              <li>Funding raised (USD)</li>
              <li>Monthly revenue (if available)</li>
              <li>Twitter/X handle</li>
              <li>Web3 classification</li>
            </ul>
          </div>

          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            className="font-mono text-sm"
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleResearch} disabled={loading || !url.trim()}>
              {loading ? 'Researching...' : 'Research'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
