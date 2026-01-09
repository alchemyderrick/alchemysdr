'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/stat-card'
import { AddContactCard } from '@/components/add-contact-card'
import { SendQueueCard } from '@/components/send-queue-card'
import { DiscoverXCard } from '@/components/discover-x-card'
import { api } from '@/lib/api-client'

export default function HomePage() {
  const [messagesSent, setMessagesSent] = useState<number>(0)
  const [followUpCount, setFollowUpCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Fetch all drafts and follow-ups
      const [allDrafts, followUps] = await Promise.all([
        api.get<any[]>('/api/drafts'),
        api.get<any[]>('/api/drafts/followups')
      ])

      // Calculate midnight EST (same logic as localhost:3000)
      const now = new Date()
      const estOffset = -5 * 60 // EST is UTC-5
      const localOffset = now.getTimezoneOffset()
      const estTime = new Date(now.getTime() + (localOffset + estOffset) * 60000)
      const midnightEST = new Date(estTime)
      midnightEST.setHours(0, 0, 0, 0)
      const midnightLocal = new Date(midnightEST.getTime() - (localOffset + estOffset) * 60000)

      // Count sent drafts since midnight EST (include both 'sent' AND 'skipped' statuses)
      // Dismissed messages still count as sent since they were actually sent
      const sentDraftsToday = allDrafts.filter((msg: any) => {
        if (msg.status !== 'sent' && msg.status !== 'skipped') return false
        const msgDate = new Date(msg.updated_at)
        return msgDate >= midnightLocal
      }).length

      // Count sent follow-ups since midnight EST (using prepared_at)
      const sentFollowUpsToday = followUps.filter((f: any) => {
        if (!f.prepared_at) return false
        const msgDate = new Date(f.prepared_at)
        return msgDate >= midnightLocal
      }).length

      // Total messages sent today = sent drafts + sent follow-ups
      const totalMessagesToday = sentDraftsToday + sentFollowUpsToday

      // Count unique contacts needing follow-up (not total follow-up messages)
      const uniqueContacts = new Set(followUps.map((f: any) => f.contact_id))
      const followUpCount = uniqueContacts.size

      setMessagesSent(totalMessagesToday)
      setFollowUpCount(followUpCount)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadStats()
    setRefreshTrigger(prev => prev + 1)
  }

  const handleMessageSent = () => {
    loadStats()
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AddContactCard onRefresh={handleRefresh} />
        <DiscoverXCard />
        <div className="md:col-span-2">
          <SendQueueCard refreshTrigger={refreshTrigger} onMessageSent={handleMessageSent} />
        </div>
      </div>
    </div>
  )
}
