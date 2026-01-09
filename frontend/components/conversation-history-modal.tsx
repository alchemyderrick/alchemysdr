'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'

interface ConversationHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
  company: string
  telegramHandle: string
}

export function ConversationHistoryModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  company,
  telegramHandle,
}: ConversationHistoryModalProps) {
  const [history, setHistory] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      loadHistory()
    }
  }, [open, contactId])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await api.get<DraftWithContact[]>(`/api/drafts/contact/${contactId}/history`)
      setHistory(data)
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] w-[90vw] max-h-[85vh] overflow-auto bg-card border-2 border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-xl">Conversation History: {contactName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {company} • @{telegramHandle}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No message history found</div>
        ) : (
          <div className="space-y-4 mt-4">
            {history.map((msg, index) => {
              const isOriginal = msg.status === 'sent'
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg border ${
                    isOriginal
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-amber/5 border-amber/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      className={
                        isOriginal
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-amber/10 text-amber border-amber/30'
                      }
                    >
                      {isOriginal ? 'Original Message' : `Follow-up #${index}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.message_text}</div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
