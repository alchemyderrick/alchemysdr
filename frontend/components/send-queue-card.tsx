'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'
import { toast } from 'sonner'
import { CheckCircle, X, Loader2 } from 'lucide-react'

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

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/api/drafts/${id}/approve`, {})
      toast.success('Draft approved!')
      await loadDrafts()
    } catch (error) {
      toast.error('Failed to approve draft')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDismiss = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/api/drafts/${id}/dismiss`, {})
      toast.success('Draft dismissed')
      await loadDrafts()
    } catch (error) {
      toast.error('Failed to dismiss draft')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Send Queue</CardTitle>
        <CardDescription>Generated outreach messages awaiting approval</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-2 opacity-50">📭</div>
              <div className="text-sm text-muted-foreground">No queued drafts</div>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{draft.name}</div>
                    <Badge variant="secondary">{draft.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">@{draft.telegram_handle}</div>
                  <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                    {draft.message_text}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismiss(draft.id)}
                      disabled={actionLoading === draft.id}
                    >
                      {actionLoading === draft.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Dismiss
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(draft.id)}
                      disabled={actionLoading === draft.id}
                      className="flex-1"
                    >
                      {actionLoading === draft.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve + Open TG + Paste
                        </>
                      )}
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
