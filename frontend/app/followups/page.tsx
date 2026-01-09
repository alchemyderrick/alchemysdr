'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { DraftWithContact } from '@/lib/types'
import { History, MessageCircle, X } from 'lucide-react'
import { ConversationHistoryModal } from '@/components/conversation-history-modal'
import { FollowupModal } from '@/components/followup-modal'
import { SentMessagesCard } from '@/components/sent-messages-card'
import { toast } from 'sonner'

interface ContactGroup {
  contact: DraftWithContact
  followUps: DraftWithContact[]
  totalMessages: number
  sentFollowUpCount: number
}

export default function FollowupsPage() {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([])
  const [loading, setLoading] = useState(true)
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([])
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [followupModalOpen, setFollowupModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<DraftWithContact | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<DraftWithContact | null>(null)
  const [sentMessagesRefresh, setSentMessagesRefresh] = useState(0)

  useEffect(() => {
    loadFollowups()

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadFollowups()
      setSentMessagesRefresh(prev => prev + 1)
    }, 10000)

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFollowups()
        setSentMessagesRefresh(prev => prev + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadFollowups = async () => {
    try {
      const data = await api.get<DraftWithContact[]>('/api/drafts/followups')
      setDrafts(data)

      // Group follow-ups by contact_id
      const groups = new Map<string, ContactGroup>()
      for (const item of data) {
        if (!groups.has(item.contact_id)) {
          groups.set(item.contact_id, {
            contact: item,
            followUps: [],
            totalMessages: 1, // +1 for original message
            sentFollowUpCount: 0,
          })
        }
        const group = groups.get(item.contact_id)!
        group.followUps.push(item)
        if (item.prepared_at) {
          group.sentFollowUpCount++
        }
        group.totalMessages = group.sentFollowUpCount + 1
      }

      setContactGroups(Array.from(groups.values()))
    } catch (error) {
      console.error('Failed to load follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistory = (contact: DraftWithContact) => {
    setSelectedContact(contact)
    setHistoryModalOpen(true)
  }

  const handleSendFollowup = (group: ContactGroup) => {
    // Use the most recent follow-up as the base
    const mostRecent = group.followUps[0]
    setSelectedDraft(mostRecent)
    setFollowupModalOpen(true)
  }

  const handleDismissAll = async (group: ContactGroup) => {
    if (!confirm(`Dismiss all follow-ups for ${group.contact.name}?`)) {
      return
    }

    try {
      // Dismiss all follow-ups for this contact
      for (const followUp of group.followUps) {
        await api.post(`/api/drafts/${followUp.id}/skip`, {})
      }
      toast.success('All follow-ups dismissed')
      loadFollowups()
    } catch (error) {
      console.error('Failed to dismiss follow-ups:', error)
      toast.error('Failed to dismiss follow-ups')
    }
  }

  const handleFollowupSuccess = () => {
    loadFollowups()
    setSentMessagesRefresh(prev => prev + 1)
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sent Messages Card */}
        <SentMessagesCard refreshTrigger={sentMessagesRefresh} />

        {/* Follow-ups Card */}
        <Card className="border border-cyan-500/50 rounded-xl bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">Follow-ups</CardTitle>
              <p className="text-sm text-muted-foreground">
                Follow-up messages sent
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading follow-ups...</div>
          ) : contactGroups.length === 0 ? (
            <div className="text-muted-foreground">
              No follow-up messages yet. Follow-ups are generated after initial outreach.
            </div>
          ) : (
            <div className="grid gap-4">
              {contactGroups.map((group) => {
                const mostRecent = group.followUps[0]
                return (
                  <div
                    key={group.contact.contact_id}
                    className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-amber/30 hover:shadow-lg transition-all bg-amber/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-foreground">{group.contact.name}</div>
                      <Badge className="bg-amber/10 text-amber border-amber/30">
                        messages: {group.totalMessages}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      @{group.contact.telegram_handle}
                    </div>

                    {/* Preview of most recent follow-up */}
                    <div className="text-sm bg-background/50 p-3 rounded-md border border-border/30 line-clamp-3">
                      {mostRecent.message_text}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500"
                        onClick={() => handleViewHistory(group.contact)}
                      >
                        <History className="mr-1 h-3 w-3" />
                        View History ({group.totalMessages})
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50 hover:bg-success/10 hover:border-success"
                        onClick={() => handleSendFollowup(group)}
                      >
                        <MessageCircle className="mr-1 h-3 w-3" />
                        Send Follow-up
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                        onClick={() => handleDismissAll(group)}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Dismiss All
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>

        {/* Modals */}
        {selectedContact && (
          <ConversationHistoryModal
            open={historyModalOpen}
            onOpenChange={setHistoryModalOpen}
            contactId={selectedContact.contact_id}
            contactName={selectedContact.name}
            company={selectedContact.company}
            telegramHandle={selectedContact.telegram_handle}
          />
        )}

        {selectedDraft && (
          <FollowupModal
            open={followupModalOpen}
            onOpenChange={setFollowupModalOpen}
            draft={selectedDraft}
            onSuccess={handleFollowupSuccess}
          />
        )}
      </Card>
      </div>
    </div>
  )
}
