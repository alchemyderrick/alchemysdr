'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { DraftWithContact } from '@/lib/types'
import { Loader2, Sparkles, CheckCircle } from 'lucide-react'

interface ImproveMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: DraftWithContact
  onSuccess: (newMessage: string) => void
}

export function ImproveMessageModal({ open, onOpenChange, draft, onSuccess }: ImproveMessageModalProps) {
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [editedMessage, setEditedMessage] = useState(draft.message_text)
  const [wasAIImproved, setWasAIImproved] = useState(false)

  // Reset state when modal opens or draft changes
  useEffect(() => {
    if (open) {
      setEditedMessage(draft.message_text)
      setFeedback('')
      setWasAIImproved(false)
    }
  }, [open, draft.message_text])

  const handleSaveEdit = async () => {
    if (!editedMessage.trim()) {
      toast.error('Message cannot be empty')
      return
    }

    try {
      // Update the draft with the edited message
      await api.patch(`/api/drafts/${draft.id}`, {
        message_text: editedMessage.trim(),
      })

      toast.success('Message updated!')
      onSuccess(editedMessage.trim())
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save message:', error)
      toast.error('Failed to save message')
    }
  }

  const handleImprove = async () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback on how to improve the message')
      return
    }

    setRegenerating(true)
    try {
      toast.info('Improving message with Claude...')

      const result = await api.post<{ message_text: string }>(`/api/drafts/${draft.id}/regenerate`, {
        feedback: feedback.trim(),
      })

      toast.success('Message improved!')
      setEditedMessage(result.message_text)
      setWasAIImproved(true) // Mark as AI-improved so we don't show "Save Manual Edits" button
      onSuccess(result.message_text)
      // Keep modal open so user can see the improved message

      // Clear feedback for next use
      setFeedback('')
    } catch (error) {
      console.error('Failed to improve message:', error)
      toast.error('Failed to improve message')
    } finally {
      setRegenerating(false)
    }
  }

  const handleQuickFeedback = (quickFeedback: string) => {
    setFeedback(quickFeedback)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] bg-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Improve Message with AI
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tell Claude how to improve the message for {draft.name} at {draft.company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current/Editable message */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Current Message (editable):
            </div>
            <Textarea
              value={editedMessage}
              onChange={(e) => {
                setEditedMessage(e.target.value)
                setWasAIImproved(false) // Clear AI flag when user manually edits
              }}
              className="text-sm bg-background min-h-[150px]"
              placeholder="Edit your message..."
            />
          </div>

          {/* Quick feedback buttons */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Quick Suggestions:</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Make it more technical - mention specific Alchemy APIs and features")}
                disabled={regenerating}
                className="text-xs"
              >
                More Technical
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Make it shorter and more concise - reduce to 2 paragraphs")}
                disabled={regenerating}
                className="text-xs"
              >
                Shorter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Take a different angle - focus on a different Alchemy product or use case")}
                disabled={regenerating}
                className="text-xs"
              >
                Different Angle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback("Make it more casual and conversational")}
                disabled={regenerating}
                className="text-xs"
              >
                More Casual
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Your Feedback:
              {regenerating && <span className="ml-2 text-primary">Regenerating with Claude...</span>}
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe how to improve this message (e.g., 'more technical', 'shorter', 'different angle', 'mention specific features like Cortex or Data API')"
              disabled={regenerating}
              className="min-h-[100px] bg-background"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Be specific! Mention features, tone changes, length preferences, or angles.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setFeedback('')
                setEditedMessage(draft.message_text)
              }}
              className="flex-1"
              disabled={regenerating}
            >
              Cancel
            </Button>
            {/* Show Save button if message was manually edited (not AI-improved) */}
            {editedMessage !== draft.message_text && !wasAIImproved && (
              <Button
                onClick={handleSaveEdit}
                disabled={!editedMessage.trim()}
                className="flex-1 bg-secondary hover:bg-secondary/90 shadow-md"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Save Manual Edits
              </Button>
            )}
            <Button
              onClick={handleImprove}
              disabled={regenerating || !feedback.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 shadow-md"
            >
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Improve with AI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
