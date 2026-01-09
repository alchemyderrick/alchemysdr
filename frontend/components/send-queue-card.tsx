'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'
import { toast } from 'sonner'

export function SendQueueCard() {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = async () => {
    try {
      const data = await api.get<DraftWithContact[]>('/api/drafts')
      const queued = data.filter(d => d.status === 'queued')
      setDrafts(queued)
    } catch (error) {
      console.error('Failed to load drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/drafts/${id}/approve`, {})
      toast.success('Draft approved!')
      await loadDrafts()
    } catch (error) {
      toast.error('Failed to approve draft')
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/api/drafts/${id}/dismiss`, {})
      toast.success('Draft dismissed')
      await loadDrafts()
    } catch (error) {
      toast.error('Failed to dismiss draft')
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Send Queue</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generated outreach messages
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : drafts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No queued drafts</div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-semibold">
                    {draft.name} <Badge variant="secondary">{draft.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">@{draft.telegram_handle}</div>
                  <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                    {draft.message_text}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDismiss(draft.id)}>
                      Dismiss
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(draft.id)}>
                      Approve + Open TG + Paste
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
