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
import { MessageCircle, X, Loader2, MessageSquareReply } from 'lucide-react'
import { FollowupModal } from './followup-modal'
import { ImproveMessageModal } from './improve-message-modal'
import { EditContactModal } from './edit-contact-modal'
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
  const [editingContact, setEditingContact] = useState<DraftWithContact | null>(null)
  const [capturedResponse, setCapturedResponse] = useState<string | null>(null)
  const [capturingResponse, setCapturingResponse] = useState<string | null>(null)

  useEffect(() => {
    loadSentMessages()
  }, [refreshTrigger])

  const loadSentMessages = async () => {
    try {
      // Use /sent endpoint which excludes contacts that have follow-ups
      const data = await api.get<DraftWithContact[]>('/api/drafts/sent')

      // Sort: contacts needing follow-up (48+ hours) at top, others at bottom
      const fortyEightHours = 48 * 60 * 60 * 1000
      const now = Date.now()
      const sortedData = [...data].sort((a, b) => {
        const aLastTime = new Date(a.updated_at).getTime()
        const bLastTime = new Date(b.updated_at).getTime()
        const aNeedsFollowUp = (now - aLastTime) >= fortyEightHours
        const bNeedsFollowUp = (now - bLastTime) >= fortyEightHours

        // Contacts needing follow-up come first
        if (aNeedsFollowUp && !bNeedsFollowUp) return -1
        if (!aNeedsFollowUp && bNeedsFollowUp) return 1

        // Within same category, sort by oldest first (most urgent at top)
        return aLastTime - bLastTime
      })

      setDrafts(sortedData.slice(0, 10))
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

  const handleRespondedClick = async (draft: DraftWithContact) => {
    setCapturingResponse(draft.id)
    try {
      toast.info('Opening Telegram and capturing response...')
      const result = await api.post<{ response: string }>('/api/drafts/capture-response', {
        telegram_handle: draft.telegram_handle
      })

      // Save successful message to shared database (visible to all users)
      try {
        await api.post('/api/shared/successful-messages', {
          contact_name: draft.name,
          company: draft.company,
          telegram_handle: draft.telegram_handle,
          message_text: draft.message_text,
          message_type: draft.status === 'followup' ? 'followup' : 'initial',
          their_response: result.response
        })
        console.log('Saved successful message to shared W Messaging')
      } catch (saveError) {
        console.error('Failed to save successful message:', saveError)
        // Don't block the flow if saving fails
      }

      setCapturedResponse(result.response)
      setSelectedDraft(draft)
      setFollowupModalOpen(true)
      toast.success('Response captured!')
    } catch (error: any) {
      if (error.message?.includes('no_response') || error.message?.includes('No response found')) {
        toast.error('No Response Found')
      } else {
        toast.error('Failed to capture response')
      }
    } finally {
      setCapturingResponse(null)
    }
  }

  const handleEditContact = (draft: DraftWithContact) => {
    setEditingContact(draft)
  }

  const handleContactEditSuccess = () => {
    loadSentMessages()
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
              {drafts.map((draft) => {
                // Check if last message was sent more than 48 hours ago
                const lastMessageTime = new Date(draft.updated_at).getTime()
                const hoursSinceLastMessage = (Date.now() - lastMessageTime) / (1000 * 60 * 60)
                const needsFollowUp = hoursSinceLastMessage >= 48

                return (
                <div key={draft.id} className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-success/30 transition-all bg-card/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {needsFollowUp && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="No follow-up in 48+ hours" />
                      )}
                      <div
                        className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleEditContact(draft)}
                        title="Click to edit contact details"
                      >
                        {draft.company}
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/30 text-xs px-2 py-0.5">
                      sent
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {draft.name} • @{draft.telegram_handle} • Sent: {new Date(draft.updated_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
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
                      className="flex-1 hover:bg-amber/10 hover:border-amber hover:text-amber transition-all border-border/50"
                      onClick={() => handleFollowupClick(draft)}
                      disabled={actionLoading === draft.id || capturingResponse === draft.id}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Send Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-primary/10 hover:border-primary hover:text-primary transition-all border-border/50"
                      onClick={() => handleRespondedClick(draft)}
                      disabled={actionLoading === draft.id || capturingResponse === draft.id}
                      title="Capture their response from Telegram"
                    >
                      {capturingResponse === draft.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquareReply className="mr-2 h-4 w-4" />
                      )}
                      Responded
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all border-border/50"
                      onClick={() => handleDismiss(draft.id)}
                      disabled={actionLoading === draft.id || capturingResponse === draft.id}
                      title="Dismiss message"
                    >
                      {actionLoading === draft.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
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

      {selectedDraft && (
        <FollowupModal
          open={followupModalOpen}
          onOpenChange={(open) => {
            setFollowupModalOpen(open)
            if (!open) setCapturedResponse(null)
          }}
          draft={selectedDraft}
          onSuccess={handleFollowupSuccess}
          capturedResponse={capturedResponse}
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

      {editingContact && (
        <EditContactModal
          open={!!editingContact}
          onOpenChange={(open) => {
            if (!open) setEditingContact(null)
          }}
          draft={editingContact}
          onSuccess={handleContactEditSuccess}
        />
      )}
    </Card>
  )
}
