'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'

export function SentMessagesCard() {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSentMessages()
  }, [])

  const loadSentMessages = async () => {
    try {
      const data = await api.get<DraftWithContact[]>('/api/drafts')
      const sent = data.filter(d => d.status === 'sent').slice(0, 10)
      setDrafts(sent)
    } catch (error) {
      console.error('Failed to load sent messages:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Sent Messages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Successfully sent outreach messages
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : drafts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sent messages yet</div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{draft.name}</div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                      sent
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {draft.company} • @{draft.telegram_handle}
                  </div>
                  <div className="text-xs bg-muted/50 p-2 rounded-md line-clamp-3">
                    {draft.message_text}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Send Follow-up
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
