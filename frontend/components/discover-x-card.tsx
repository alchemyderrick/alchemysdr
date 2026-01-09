'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export function DiscoverXCard() {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDiscover = async () => {
    if (!handle) {
      toast.error('Please enter a company X handle')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/workflow/x-discovery', {
        x_handle: handle.replace('@', ''),
        max_users: 5,
      })

      toast.success('X discovery started! Check Active Outreach for results.')
      setHandle('')
    } catch (error) {
      toast.error('Failed to start X discovery')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discover Users from X</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Company X handle (e.g., @alchemy)"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
        />
        <Button onClick={handleDiscover} disabled={loading} className="w-full">
          {loading ? 'Discovering...' : 'Discover Users'}
        </Button>
      </CardContent>
    </Card>
  )
}
