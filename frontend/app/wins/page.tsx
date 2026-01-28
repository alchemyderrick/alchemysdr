'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { SuccessfulMessage } from '@/lib/types'
import { Trophy, MessageCircle, ArrowRight, Calendar, Building2, User, ChevronDown, ChevronUp, X } from 'lucide-react'
import { toast } from 'sonner'

export default function WinsPage() {
  const [messages, setMessages] = useState<SuccessfulMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSuccessfulMessages()
  }, [])

  const loadSuccessfulMessages = async () => {
    try {
      // Load from shared public database
      const data = await api.get<SuccessfulMessage[]>('/api/shared/successful-messages')
      setMessages(data)
    } catch (error) {
      console.error('Failed to load successful messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDelete = async (id: string, contactName: string) => {
    if (!confirm(`Remove this win from ${contactName}?`)) return

    try {
      await api.delete(`/api/shared/successful-messages/${id}`)
      setMessages(prev => prev.filter(m => m.id !== id))
      toast.success('Message removed from W Messaging')
    } catch (error: any) {
      console.error('Failed to delete message:', error)
      if (error?.status === 403) {
        toast.error('You can only delete your own messages')
      } else {
        toast.error('Failed to remove message')
      }
    }
  }

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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
          <h1 className="text-3xl font-bold text-foreground">W Messaging</h1>
        </div>
        <p className="text-muted-foreground">
          Successful conversations from all team members - learn from what works!
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
        <div className="grid gap-3">
          {messages.map((msg) => {
            const isExpanded = expandedIds.has(msg.id)
            return (
              <Card
                key={msg.id}
                className="border border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 transition-all"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                      onClick={() => toggleExpanded(msg.id)}
                    >
                      <div className="p-1.5 rounded-full bg-yellow-500/10 shrink-0">
                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{msg.company}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground truncate">{msg.contact_name}</span>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {truncateText(msg.their_response || msg.message_text)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          msg.message_type === 'initial'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        }`}
                      >
                        {msg.message_type === 'initial' ? 'Initial' : 'Follow-up'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(msg.id, msg.contact_name)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleExpanded(msg.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4 space-y-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="h-3 w-3" />
                      {formatDate(msg.created_at)}
                      {msg.submitted_by && (
                        <>
                          <span className="mx-1">•</span>
                          <User className="h-3 w-3" />
                          <span className="text-primary font-medium">{msg.submitted_by}</span>
                        </>
                      )}
                      {msg.telegram_handle && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="text-muted-foreground">@{msg.telegram_handle}</span>
                        </>
                      )}
                    </div>
                    {/* Your Message */}
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
                        <MessageCircle className="h-3 w-3" />
                        Your Message
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm whitespace-pre-wrap">
                        {msg.message_text}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="h-4 w-4 text-yellow-500 rotate-90" />
                    </div>

                    {/* Their Response */}
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 mb-1.5">
                        <Trophy className="h-3 w-3" />
                        Their Response
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm whitespace-pre-wrap">
                        {msg.their_response || <span className="text-muted-foreground italic">No response captured</span>}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
