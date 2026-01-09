'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'
import { MessageCircle } from 'lucide-react'

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
    <Card className="flex flex-col h-[380px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sent Messages</CardTitle>
        <CardDescription className="text-xs">Recent outreach messages successfully delivered</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <ScrollArea className="h-full">
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
                <div key={draft.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{draft.name}</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                      sent
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {draft.company} • @{draft.telegram_handle}
                  </div>
                  <div className="text-sm bg-muted/50 p-3 rounded-md line-clamp-3">
                    {draft.message_text}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <MessageCircle className="mr-2 h-4 w-4" />
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
