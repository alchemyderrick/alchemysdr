'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api-client'
import { Target } from '@/lib/types'

export default function ActivePage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTargets()
  }, [])

  const loadTargets = async () => {
    try {
      const data = await api.get<Target[]>('/api/targets')
      const approved = data.filter(t => t.status === 'approved')
      setTargets(approved)
    } catch (error) {
      console.error('Failed to load targets:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Active Outreach</CardTitle>
          <p className="text-sm text-muted-foreground">
            Approved targets ready for outreach
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : targets.length === 0 ? (
            <div className="text-muted-foreground">
              No active outreach targets. Approve some targets to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map((target) => (
                <div key={target.id} className="border rounded p-3">
                  <div className="font-semibold">{target.team_name}</div>
                  {target.notes && (
                    <div className="text-sm text-muted-foreground">{target.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
