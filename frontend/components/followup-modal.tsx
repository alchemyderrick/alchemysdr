'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { DraftWithContact } from '@/lib/types'

interface FollowupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: DraftWithContact
  onSuccess: () => void
}

export function FollowupModal({ open, onOpenChange, draft, onSuccess }: FollowupModalProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      generateFollowup()
    }
  }, [open])

  const generateFollowup = async () => {
    setLoading(true)
    try {
      toast.info('Generating follow-up with Claude...')
      const result = await api.post('/api/drafts/generate-followup', {
        contact_name: draft.name,
        company: draft.company,
        original_message: draft.message_text,
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

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please write a follow-up message')
      return
    }

    setSending(true)
    try {
      toast.info('Sending follow-up...')
      await api.post('/api/drafts/send-followup', {
        contact_id: draft.contact_id,
        telegram_handle: draft.telegram_handle,
        message_text: message,
        original_message: draft.message_text,
        contact_name: draft.name,
        company: draft.company,
        auto_send: true,
      })
      toast.success('Follow-up sent!')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to send follow-up:', error)
      toast.error('Failed to send follow-up')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] bg-card border-2 border-success/30">
        <DialogHeader>
          <DialogTitle className="text-xl">Send Follow-up</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Following up with {draft.name} at {draft.company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Original message */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Original Message:</div>
            <div className="text-sm bg-background/50 p-3 rounded-md border border-border/30 max-h-32 overflow-auto">
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
              className="min-h-[120px] bg-background"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || sending || !message.trim()}
              className="flex-1 bg-success hover:bg-success/90 shadow-md"
            >
              {sending ? 'Sending...' : 'Send Follow-up'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
