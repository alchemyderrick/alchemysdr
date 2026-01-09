'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import { Target } from '@/lib/types'
import { toast } from 'sonner'

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTargets()
  }, [])

  const loadTargets = async () => {
    try {
      const data = await api.get<Target[]>('/api/targets')
      const pending = data.filter(t => t.status === 'pending')
      setTargets(pending)
    } catch (error) {
      console.error('Failed to load targets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/targets/${id}/approve`, {})
      toast.success('Target approved!')
      await loadTargets()
    } catch (error) {
      toast.error('Failed to approve target')
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/api/targets/${id}/dismiss`, {})
      toast.success('Target dismissed')
      await loadTargets()
    } catch (error) {
      toast.error('Failed to dismiss target')
    }
  }

  const handleResearch = async () => {
    try {
      setLoading(true)
      toast.info('Research started... This may take a minute')
      await api.post('/api/targets/research', {})
      await loadTargets()
      toast.success('Research complete!')
    } catch (error) {
      toast.error('Research failed')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (n: number) => {
    const abs = Math.abs(n)
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (abs >= 1e3) return `$${Math.round(n / 1e3)}k`
    return `$${Math.round(n)}`
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Top Target Teams</CardTitle>
          <p className="text-sm text-muted-foreground">
            Web3 teams with ≥ $10M raised OR ≥ $500k monthly revenue
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={loadTargets}>
              Refresh
            </Button>
            <Button onClick={handleResearch} disabled={loading}>
              🔍 Research
            </Button>
            <Button variant="outline">
              + Import
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading targets...</div>
          ) : targets.length === 0 ? (
            <div className="text-muted-foreground">
              No pending targets. Click Research to find new targets.
            </div>
          ) : (
            <div className="grid gap-3">
              {targets.map((target) => (
                <div key={target.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                  <div className="font-semibold flex items-center justify-between">
                    <span>{target.team_name}</span>
                    {target.is_web3 === 1 && (
                      <Badge variant="secondary">Web3</Badge>
                    )}
                  </div>

                  {(target.x_handle || target.website) && (
                    <div className="flex gap-2 flex-wrap">
                      {target.x_handle && (
                        <a
                          href={`https://x.com/${target.x_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          @{target.x_handle.replace('@', '')}
                        </a>
                      )}
                      {target.website && (
                        <a
                          href={target.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline"
                        >
                          🌐 website
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-100">
                      Raised: {formatMoney(target.raised_usd)}
                    </Badge>
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-100">
                      Rev: {formatMoney(target.monthly_revenue_usd)}/mo
                    </Badge>
                  </div>

                  {target.notes && (
                    <p className="text-xs text-muted-foreground">{target.notes}</p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDismiss(target.id)}>
                      ✕ Dismiss
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(target.id)}>
                      ✓ Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
