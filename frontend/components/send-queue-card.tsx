'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'
import { toast } from 'sonner'
import { CheckCircle, X, Loader2, Sparkles } from 'lucide-react'
import { ImproveMessageModal } from './improve-message-modal'

// Helper to count paragraphs in message text
function countParagraphs(text: string): number {
  if (!text) return 0;
  const paragraphs = text
    .split(/\n\n+|\r\n\r\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return paragraphs.length;
}

interface SendQueueCardProps {
  refreshTrigger?: number
  onMessageSent?: () => void
}

export function SendQueueCard({ refreshTrigger, onMessageSent }: SendQueueCardProps) {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({})

  useEffect(() => {
    loadDrafts()
  }, [refreshTrigger])

  const loadDrafts = async () => {
    try {
      // Use /api/queue which includes both 'queued' and 'approved' statuses
      const data = await api.get<DraftWithContact[]>('/api/queue')
      // Filter to only show 'queued' drafts (approved drafts are being processed by relayer)
      const queuedOnly = data.filter(draft => draft.status === 'queued')
      setDrafts(queuedOnly)
    } catch (error) {
      console.error('Failed to load drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [improvingDraft, setImprovingDraft] = useState<DraftWithContact | null>(null)

  const handleImproveMessage = (draft: DraftWithContact) => {
    setImprovingDraft(draft)
  }

  const handleImproveSuccess = (draftId: string, newMessage: string) => {
    // Update the draft in local state
    setDrafts(prev => prev.map(draft =>
      draft.id === draftId ? { ...draft, message_text: newMessage } : draft
    ))
    // Don't close modal - let user close it manually after reviewing the improved message
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      // Get the edited message if it exists, otherwise use original
      const messageToSend = editedMessages[id]
      const payload = messageToSend ? { message_text: messageToSend } : {}

      // Try approve-open-telegram first (for Mac), then fallback to approve
      try {
        await api.post(`/api/drafts/${id}/approve-open-telegram`, payload)
        toast.success('Draft approved and Telegram opened!')
      } catch (error: any) {
        // If it fails because not on macOS, use regular approve
        if (error.message?.includes('only on macOS')) {
          await api.post(`/api/drafts/${id}/approve`, payload)
          toast.success('Draft approved! Relayer will send within 10 seconds.')
        } else {
          throw error
        }
      }

      // Immediately remove from local state for instant UI update
      setDrafts(prev => prev.filter(draft => draft.id !== id))

      // Clear the edited message from state after sending
      setEditedMessages(prev => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      })

      // Reload from server to ensure consistency
      await loadDrafts()
      onMessageSent?.()
    } catch (error: any) {
      console.error('Approve error:', error)
      const message = error?.message || 'Failed to approve draft'
      toast.error(`Failed to approve draft: ${message}`)
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
    <Card className="relative overflow-hidden flex flex-col h-[650px] min-h-[650px] max-h-[650px] border border-amber/50 rounded-xl bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-amber/20 hover:border-amber/80 group">
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
              {drafts.map((draft) => {
                const paragraphCount = countParagraphs(draft.message_text);

                return (
                  <div key={draft.id} className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-amber/30 transition-all bg-card/30">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-foreground">{draft.name}</div>
                      <Badge className="bg-amber/10 text-amber border-amber/30 text-xs px-2 py-0.5">{draft.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{draft.telegram_handle}
                    </div>
                    <Textarea
                      value={editedMessages[draft.id] ?? draft.message_text}
                      onChange={(e) => {
                        setEditedMessages(prev => ({
                          ...prev,
                          [draft.id]: e.target.value
                        }))
                      }}
                      onFocus={() => setEditingDraftId(draft.id)}
                      onBlur={() => setEditingDraftId(null)}
                      className="text-sm bg-background/50 min-h-[150px] max-h-48 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImproveMessage(draft)}
                        disabled={actionLoading === draft.id}
                        className="hover:bg-primary/10 hover:border-primary hover:text-primary transition-all border-border/50"
                        title="Improve message with feedback"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(draft.id)}
                        disabled={actionLoading === draft.id}
                        className="flex-1 hover:bg-amber/10 hover:border-amber hover:text-amber transition-all border-border/50"
                      >
                        {actionLoading === draft.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve + Send ({paragraphCount} {paragraphCount === 1 ? 'msg' : 'msgs'})
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismiss(draft.id)}
                        disabled={actionLoading === draft.id}
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
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {improvingDraft && (
        <ImproveMessageModal
          open={!!improvingDraft}
          onOpenChange={(open) => {
            if (!open) setImprovingDraft(null)
          }}
          draft={improvingDraft}
          onSuccess={(newMessage) => handleImproveSuccess(improvingDraft.id, newMessage)}
        />
      )}
    </Card>
  )
}
