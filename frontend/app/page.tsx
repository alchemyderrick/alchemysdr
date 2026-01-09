'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/stat-card'
import { AddContactCard } from '@/components/add-contact-card'
import { SendQueueCard } from '@/components/send-queue-card'
import { DiscoverXCard } from '@/components/discover-x-card'
import { SentMessagesCard } from '@/components/sent-messages-card'
import { api } from '@/lib/api-client'

export default function HomePage() {
  const [messagesSent, setMessagesSent] = useState<number>(0)
  const [followUpCount, setFollowUpCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const drafts = await api.get<any[]>('/api/drafts')

      // Count sent messages today
      const today = new Date().toISOString().split('T')[0]
      const sentToday = drafts.filter((d: any) =>
        d.status === 'sent' && d.prepared_at?.startsWith(today)
      ).length

      // Count follow-ups needed
      const followupsNeeded = drafts.filter((d: any) =>
        d.status === 'followup'
      ).length

      setMessagesSent(sentToday)
      setFollowUpCount(followupsNeeded)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 max-w-7xl mx-auto w-full">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          icon="📨"
          label="Messages Sent"
          value={loading ? '-' : messagesSent}
          subtitle="Since 12:00 AM EST"
        />
        <StatCard
          icon="📋"
          label="Companies to Follow Up"
          value={loading ? '-' : followUpCount}
          subtitle="Awaiting response"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddContactCard onRefresh={loadStats} />
        <DiscoverXCard />
        <SendQueueCard />
        <SentMessagesCard />
      </div>
    </div>
  )
}
