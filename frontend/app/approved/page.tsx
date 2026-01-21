'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { Target } from '@/lib/types'
import { toast } from 'sonner'
import { Search as SearchIcon, Users, X } from 'lucide-react'
import { ContactsModal } from '@/components/contacts-modal'
import { EditTargetModal } from '@/components/edit-target-modal'

interface TargetWithMessages extends Target {
  messages_sent?: number
}

export default function ApprovedPage() {
  const [targets, setTargets] = useState<TargetWithMessages[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<TargetWithMessages | null>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTargetForEdit, setSelectedTargetForEdit] = useState<Target | null>(null)

  useEffect(() => {
    loadTargets()
  }, [])

  const loadTargets = async () => {
    try {
      const data = await api.get<TargetWithMessages[]>('/api/targets/approved')
      // Filter to only show targets WITHOUT messages sent
      const noMessages = data.filter(t => !t.messages_sent || t.messages_sent === 0)
      setTargets(noMessages)
    } catch (error) {
      console.error('Failed to load targets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDiscoverXUsers = async (targetId: string) => {
    setActionLoading(targetId + '-x')
    try {
      toast.info('Discovering X users...')
      const result = await api.post<{ valid: number; message?: string }>(`/api/targets/${targetId}/discover-x-users`, { max_users: 5 })

      if (result.valid === 0) {
        toast.info(result.message || 'No users found. Try again or check X authentication.')
      } else {
        toast.success(`Found ${result.valid} valid users! Check the queue.`)
      }
    } catch (error: any) {
      console.error('X discovery error:', error)

      // Extract error message from API response
      const errorMessage = error?.response?.message || error?.message || 'Failed to discover X users'

      // Show specific error messages based on error type
      if (errorMessage.includes('authentication') || errorMessage.includes('cookies')) {
        toast.error('X authentication required. Please connect your X account in the sidebar.')
      } else if (errorMessage.includes('rate limit')) {
        toast.error('X is rate limiting. Please wait a few minutes and try again.')
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Browser')) {
        toast.error('Request timed out. Please try again in a moment.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleSearchAllContacts = async (targetId: string, teamName: string) => {
    setActionLoading(targetId + '-search')
    try {
      toast.info('Searching for contacts...')
      const result = await api.post<{ stored: number }>(`/api/targets/${targetId}/all-contacts`, {})
      if (result.stored === 0) {
        toast.info('All contacts found - no new contacts to add')
      } else {
        toast.success(`Found ${result.stored} new contacts for ${teamName}!`)
      }
    } catch (error) {
      toast.error('Failed to search contacts')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/api/targets/${id}/dismiss`, {})
      toast.success('Target removed')
      await loadTargets()
    } catch (error) {
      toast.error('Failed to remove target')
    }
  }

  const handleViewContacts = async (target: TargetWithMessages) => {
    setActionLoading(target.id + '-view')
    try {
      toast.info('Loading contacts...')
      const result = await api.get<{ contacts: any[] }>(`/api/targets/${target.id}/view-contacts`)
      if (result.contacts.length === 0) {
        toast.info('No contacts found yet. Click "Search" to find contacts.')
      } else {
        setSelectedTarget(target)
        setContacts(result.contacts)
        setContactsModalOpen(true)
      }
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setActionLoading(null)
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
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <Card className="border border-purple/50 rounded-xl bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple/10 text-purple">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">Approved - No Outreach</CardTitle>
              <p className="text-sm text-muted-foreground">
                Teams you've approved but haven't contacted
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : targets.length === 0 ? (
            <div className="text-muted-foreground">
              No approved targets without outreach. All your approved targets have been contacted!
            </div>
          ) : (
            <div className="grid gap-4">
              {targets.map((target) => (
                <div key={target.id} className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-purple/30 hover:shadow-lg transition-all bg-card/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedTargetForEdit(target as Target)
                          setEditModalOpen(true)
                        }}
                        className="font-semibold text-foreground hover:text-primary hover:underline transition-colors text-left"
                      >
                        {target.team_name}
                      </button>
                      {target.is_web3 === 1 && (
                        <Badge className="bg-primary/10 text-primary border-primary/30">Web3</Badge>
                      )}
                    </div>
                    <button
                      onClick={() => handleDismiss(target.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove target"
                    >
                      <X className="h-4 w-4" />
                    </button>
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
                          className="text-xs text-success hover:underline"
                        >
                          🌐 website
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-amber/10 text-amber border-amber/30">
                      Raised: {formatMoney(target.raised_usd)}
                    </Badge>
                    <Badge className="bg-amber/10 text-amber border-amber/30">
                      Rev: {formatMoney(target.monthly_revenue_usd)}/mo
                    </Badge>
                  </div>

                  {target.notes && (
                    <p className="text-xs text-muted-foreground">{target.notes}</p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {target.x_handle && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50 hover:bg-cyan-500/10 hover:border-cyan-500"
                        onClick={() => handleDiscoverXUsers(target.id)}
                        disabled={actionLoading === target.id + '-x'}
                      >
                        🐦 X
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/50 hover:bg-success/10 hover:border-success"
                      onClick={() => handleSearchAllContacts(target.id, target.team_name)}
                      disabled={actionLoading === target.id + '-search'}
                    >
                      <SearchIcon className="mr-1 h-3 w-3" />
                      Search
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/50 hover:bg-purple/10 hover:border-purple"
                      onClick={() => handleViewContacts(target)}
                      disabled={actionLoading === target.id + '-view'}
                    >
                      <Users className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTarget && (
        <ContactsModal
          open={contactsModalOpen}
          onOpenChange={setContactsModalOpen}
          teamName={selectedTarget.team_name}
          teamId={selectedTarget.id}
          contacts={contacts}
        />
      )}

      {selectedTargetForEdit && (
        <EditTargetModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          target={selectedTargetForEdit}
          onSuccess={loadTargets}
        />
      )}
    </div>
  )
}
