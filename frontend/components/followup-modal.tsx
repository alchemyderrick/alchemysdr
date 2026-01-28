'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { DraftWithContact } from '@/lib/types'
import { Loader2, Sparkles, CheckCircle } from 'lucide-react'

// Helper to count paragraphs in message text
function countParagraphs(text: string): number {
  if (!text) return 0;
  const paragraphs = text
    .split(/\n\n+|\r\n\r\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return paragraphs.length;
}

interface FollowupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: DraftWithContact
  onSuccess: () => void
  capturedResponse?: string | null
}

export function FollowupModal({ open, onOpenChange, draft, onSuccess, capturedResponse }: FollowupModalProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (open) {
      setFeedback('')
      generateFollowup()
    }
  }, [open, capturedResponse])

  const generateFollowup = async (feedbackText?: string) => {
    setLoading(true)
    try {
      toast.info('Generating follow-up with Claude...')
      const result = await api.post<{ message_text: string }>('/api/drafts/generate-followup', {
        contact_name: draft.name,
        company: draft.company,
        original_message: draft.message_text,
        feedback: feedbackText,
        their_response: capturedResponse,
      })
      setMessage(result.message_text)
      toast.success('Follow-up generated! Edit if needed.')
    } catch (error) {
      console.error('Failed to generate follow-up:', error)
      toast.error('Generation failed. Write your follow-up below.')
      setMessage('')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback on how to improve the follow-up')
      return
    }

    setRegenerating(true)
    try {
      toast.info('Regenerating follow-up with Claude...')
      const result = await api.post<{ message_text: string }>('/api/drafts/generate-followup', {
        contact_name: draft.name,
        company: draft.company,
        original_message: draft.message_text,
        current_followup: message,
        feedback: feedback.trim(),
        their_response: capturedResponse,
      })
      setMessage(result.message_text)
      toast.success('Follow-up regenerated!')
      setFeedback('')
    } catch (error) {
      console.error('Failed to regenerate follow-up:', error)
      toast.error('Failed to regenerate follow-up')
    } finally {
      setRegenerating(false)
    }
  }

  const handleQuickFeedback = (quickFeedback: string) => {
    setFeedback(quickFeedback)
  }

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please write a follow-up message')
      return
    }

    setSending(true)
    try {
      // Try approve-open-telegram first (for Mac), then fallback to regular send
      try {
        await api.post('/api/drafts/send-followup', {
          contact_id: draft.contact_id,
          telegram_handle: draft.telegram_handle,
          message_text: message,
          original_message: draft.message_text,
          contact_name: draft.name,
          company: draft.company,
          auto_send: true,
          open_telegram: true,
        })
        toast.success('Follow-up approved and Telegram opened!')
      } catch (error: any) {
        // If it fails because not on macOS, use regular send
        if (error.message?.includes('only on macOS')) {
          await api.post('/api/drafts/send-followup', {
            contact_id: draft.contact_id,
            telegram_handle: draft.telegram_handle,
            message_text: message,
            original_message: draft.message_text,
            contact_name: draft.name,
            company: draft.company,
            auto_send: true,
          })
          toast.success('Follow-up approved! Relayer will send within 10 seconds.')
        } else {
          throw error
        }
      }

      // Save successful message to shared database (visible to all users) if response was captured
      if (capturedResponse) {
        try {
          await api.post('/api/shared/successful-messages', {
            contact_name: draft.name,
            company: draft.company,
            telegram_handle: draft.telegram_handle,
            message_text: draft.message_text,
            message_type: draft.status === 'followup' ? 'followup' : 'initial',
            their_response: capturedResponse
          })
          console.log('Saved successful message to shared W Messaging')
        } catch (saveError) {
          console.error('Failed to save successful message:', saveError)
          // Don't block the flow if saving fails
        }
      }

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to send follow-up:', error)
      toast.error('Failed to send follow-up')
    } finally {
      setSending(false)
    }
  }

  const paragraphCount = countParagraphs(message)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] bg-card border-2 border-success/30">
        <DialogHeader>
          <DialogTitle className="text-xl">Send Follow-up</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Following up with {draft.name} at {draft.company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Their Response (if captured) */}
          {capturedResponse && (
            <div>
              <div className="text-xs font-semibold text-primary mb-2">Their Response:</div>
              <div className="text-sm bg-primary/5 p-3 rounded-md border border-primary/30 max-h-32 overflow-auto whitespace-pre-wrap">
                {capturedResponse}
              </div>
            </div>
          )}

          {/* Original message */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Original Message:</div>
            <div className="text-sm bg-background/50 p-3 rounded-md border border-border/30 max-h-32 overflow-auto whitespace-pre-wrap">
              {draft.message_text}
            </div>
          </div>

          {/* Follow-up message */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Follow-up Message:
              {loading && <span className="ml-2 text-primary">Generating...</span>}
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your follow-up message here..."
              disabled={loading}
              className="min-h-[150px] bg-background"
            />
          </div>

          {/* Quick feedback buttons */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Quick Suggestions:</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Make it more urgent - emphasize time sensitivity")}
                disabled={regenerating || loading}
                className="text-xs"
              >
                More Urgent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Make it shorter and more concise")}
                disabled={regenerating || loading}
                className="text-xs"
              >
                Shorter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Take a different angle - try a new approach")}
                disabled={regenerating || loading}
                className="text-xs"
              >
                Different Angle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Make it more casual and friendly")}
                disabled={regenerating || loading}
                className="text-xs"
              >
                More Casual
              </Button>
            </div>
          </div>

          {/* Feedback input */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Your Feedback:
              {regenerating && <span className="ml-2 text-primary">Regenerating...</span>}
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe how to improve this follow-up (e.g., 'more urgent', 'shorter', 'different angle')"
              disabled={regenerating || loading}
              className="min-h-[80px] bg-background"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending || regenerating}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={loading || regenerating || !feedback.trim()}
              className="hover:bg-primary/10 hover:border-primary hover:text-primary"
            >
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regenerate
                </>
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || sending || regenerating || !message.trim()}
              className="flex-1 bg-amber hover:bg-amber/90 shadow-md"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve + Send ({paragraphCount} {paragraphCount === 1 ? 'msg' : 'msgs'})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
