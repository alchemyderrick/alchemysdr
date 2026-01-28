'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import { SuccessfulMessage } from '@/lib/types'
import { Trophy, MessageCircle, ArrowRight, Calendar, Building2, User } from 'lucide-react'

export default function WinsPage() {
  const [messages, setMessages] = useState<SuccessfulMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuccessfulMessages()
  }, [])

  const loadSuccessfulMessages = async () => {
    try {
      const data = await api.get<SuccessfulMessage[]>('/api/drafts/successful')
      setMessages(data)
    } catch (error) {
      console.error('Failed to load successful messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
            <Trophy className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">W Messages</h1>
        </div>
        <p className="text-muted-foreground">
          Successful conversations where contacts responded positively
        </p>
        {!loading && (
          <div className="mt-2">
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              {messages.length} {messages.length === 1 ? 'Win' : 'Wins'} Total
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading successful messages...</div>
      ) : messages.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No wins yet!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Responded&quot; on a contact to capture their response and log a win.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className="border border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-yellow-500/10">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {msg.company}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        {msg.contact_name}
                        {msg.telegram_handle && (
                          <span className="text-primary">@{msg.telegram_handle}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      className={
                        msg.message_type === 'initial'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      }
                    >
                      {msg.message_type === 'initial' ? 'Initial' : 'Follow-up'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(msg.created_at)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Your Message */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                    <MessageCircle className="h-3 w-3" />
                    Your Message
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {msg.message_text}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-yellow-500 rotate-90" />
                </div>

                {/* Their Response */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 mb-2">
                    <Trophy className="h-3 w-3" />
                    Their Response
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {msg.their_response || <span className="text-muted-foreground italic">No response captured</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
