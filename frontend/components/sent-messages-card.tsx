'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'
import { MessageCircle, X, Loader2, Sparkles } from 'lucide-react'
import { FollowupModal } from './followup-modal'
import { ImproveMessageModal } from './improve-message-modal'
import { toast } from 'sonner'

interface SentMessagesCardProps {
  refreshTrigger?: number
}

export function SentMessagesCard({ refreshTrigger }: SentMessagesCardProps) {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [followupModalOpen, setFollowupModalOpen] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<DraftWithContact | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [improvingDraft, setImprovingDraft] = useState<DraftWithContact | null>(null)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSentMessages()
  }, [refreshTrigger])

  const loadSentMessages = async () => {
    try {
      // Use /sent endpoint which excludes contacts that have follow-ups
      const data = await api.get<DraftWithContact[]>('/api/drafts/sent')
      setDrafts(data.slice(0, 10))
    } catch (error) {
      console.error('Failed to load sent messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowupClick = (draft: DraftWithContact) => {
    setSelectedDraft(draft)
    setFollowupModalOpen(true)
  }

  const handleFollowupSuccess = () => {
    loadSentMessages()
  }

  const handleDismiss = async (id: string) => {
    setActionLoading(id)
    try {
      await api.post(`/api/drafts/${id}/skip`, {})
      toast.success('Message dismissed')
      loadSentMessages()
    } catch (error) {
      toast.error('Failed to dismiss message')
    } finally {
      setActionLoading(null)
    }
  }

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

  return (
    <Card className="relative overflow-hidden flex flex-col border border-success/50 rounded-xl bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-success/20 hover:border-success/80 group">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-success/10 text-success">
            <MessageCircle className="h-4 w-4" />
          </div>
          Sent Messages
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Recent outreach messages successfully delivered</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-2 opacity-50">📬</div>
              <div className="text-sm text-muted-foreground">No sent messages yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-success/30 transition-all bg-card/30">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">{draft.name}</div>
                    <Badge className="bg-success/10 text-success border-success/30 text-xs px-2 py-0.5">
                      sent
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {draft.company} • @{draft.telegram_handle}
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
                      className="flex-1 hover:bg-success/10 hover:border-success hover:text-success transition-all border-border/50"
                      onClick={() => handleFollowupClick(draft)}
                      disabled={actionLoading === draft.id}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Send Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all border-border/50"
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {selectedDraft && (
        <FollowupModal
          open={followupModalOpen}
          onOpenChange={setFollowupModalOpen}
          draft={selectedDraft}
          onSuccess={handleFollowupSuccess}
        />
      )}

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
