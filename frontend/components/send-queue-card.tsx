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
import { CheckCircle, X, Loader2, RefreshCw } from 'lucide-react'

interface SendQueueCardProps {
  refreshTrigger?: number
  onMessageSent?: () => void
}

export function SendQueueCard({ refreshTrigger, onMessageSent }: SendQueueCardProps) {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDrafts()
  }, [refreshTrigger])

  const loadDrafts = async () => {
    try {
      // Use /api/queue which includes both 'queued' and 'approved' statuses
      const data = await api.get<DraftWithContact[]>('/api/queue')
      setDrafts(data)
    } catch (error) {
      console.error('Failed to load drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const handleRegenerate = async (id: string) => {
    setRegeneratingId(id)
    try {
      const result = await api.post<{ message_text: string }>(`/api/drafts/${id}/regenerate`, {})
      // Update the draft in the local state
      setDrafts(prev => prev.map(draft =>
        draft.id === id ? { ...draft, message_text: result.message_text } : draft
      ))
      toast.success('Message regenerated!')
    } catch (error) {
      toast.error('Failed to regenerate message')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      // Try approve-open-telegram first (for Mac), then fallback to approve
      try {
        await api.post(`/api/drafts/${id}/approve-open-telegram`, {})
        toast.success('Draft approved and Telegram opened!')
      } catch (error: any) {
        // If it fails because not on macOS, use regular approve
        if (error.message?.includes('only on macOS')) {
          await api.post(`/api/drafts/${id}/approve`, {})
          toast.success('Draft approved! Relayer will send within 10 seconds.')
        } else {
          throw error
        }
      }
      await loadDrafts()
      onMessageSent?.()
    } catch (error) {
      toast.error('Failed to approve draft')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDismiss = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/api/drafts/${id}/skip`, {})
      toast.success('Draft dismissed')
      await loadDrafts()
      onMessageSent?.()
    } catch (error) {
      toast.error('Failed to dismiss draft')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="relative overflow-hidden flex flex-col h-[420px] min-h-[420px] max-h-[420px] border border-amber/50 rounded-xl bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-amber/20 hover:border-amber/80 group">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-amber/10 text-amber">
            <CheckCircle className="h-4 w-4" />
          </div>
          Send Queue
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Generated outreach messages awaiting approval</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        <ScrollArea className="h-full pr-4">
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
                <div key={draft.id} className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-amber/30 transition-all bg-card/30">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">{draft.name}</div>
                    <Badge className="bg-amber/10 text-amber border-amber/30 text-xs px-2 py-0.5">{draft.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{draft.telegram_handle}
                  </div>
                  <div className="text-sm bg-background/50 p-3 rounded-md line-clamp-3 border border-border/30">
                    {draft.message_text}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerate(draft.id)}
                      disabled={regeneratingId === draft.id || actionLoading === draft.id}
                      className="hover:bg-primary/10 hover:border-primary hover:text-primary transition-all border-border/50"
                      title="Regenerate message"
                    >
                      {regeneratingId === draft.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(draft.id)}
                      disabled={actionLoading === draft.id || regeneratingId === draft.id}
                      className="flex-1 hover:bg-amber/10 hover:border-amber hover:text-amber transition-all border-border/50"
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismiss(draft.id)}
                      disabled={actionLoading === draft.id || regeneratingId === draft.id}
                      className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all border-border/50"
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
