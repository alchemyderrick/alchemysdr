'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import { Target } from '@/lib/types'
import { toast } from 'sonner'
import { EditTargetModal } from '@/components/edit-target-modal'
import { ImportTargetsModal } from '@/components/import-targets-modal'
import { ContactsModal } from '@/components/contacts-modal'
import { AddContactToTargetModal } from '@/components/add-contact-to-target-modal'
import { Search, Eye, UserPlus } from 'lucide-react'

interface Contact {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  linkedin?: string
  telegram_handle?: string
  x_username?: string
  x_bio?: string
  source?: string
  apollo_confidence_score?: number
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [viewingContacts, setViewingContacts] = useState<{ teamId: string, teamName: string, contacts: Contact[] } | null>(null)
  const [addContactModalOpen, setAddContactModalOpen] = useState(false)
  const [addContactTarget, setAddContactTarget] = useState<{ id: string, name: string } | null>(null)

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

  const handleSearchContacts = async (targetId: string, teamName: string) => {
    try {
      toast.info('Searching for contacts via Apollo, web, and other sources...')
      const result = await api.post<{ contacts: any[], stored: number, drafts_generated: number, message: string }>(`/api/targets/${targetId}/all-contacts`, {})

      if (result.drafts_generated > 0) {
        toast.success(`Found ${result.contacts.length} contacts! ${result.drafts_generated} draft${result.drafts_generated > 1 ? 's' : ''} added to Send Queue.`)
      } else if (result.stored > 0) {
        toast.success(`Found ${result.contacts.length} contacts! ${result.stored} new contact${result.stored > 1 ? 's' : ''} added.`)
      } else if (result.contacts.length > 0) {
        toast.info(`Found ${result.contacts.length} contacts (already stored)`)
      } else {
        toast.info('No contacts found')
      }

      // Reload targets to show updated contact count
      await loadTargets()
    } catch (error) {
      toast.error('Failed to search for contacts')
    }
  }

  const handleViewContacts = async (targetId: string, teamName: string) => {
    try {
      const result = await api.get<{ contacts: Contact[] }>(`/api/targets/${targetId}/view-contacts`)
      setViewingContacts({
        teamId: targetId,
        teamName: teamName,
        contacts: result.contacts
      })
      setContactsModalOpen(true)
    } catch (error) {
      toast.error('Failed to load contacts')
    }
  }

  const handleAddContact = (targetId: string, teamName: string) => {
    setAddContactTarget({ id: targetId, name: teamName })
    setAddContactModalOpen(true)
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
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <Card className="border border-primary/50 rounded-xl bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">Research Teams</CardTitle>
              <p className="text-sm text-muted-foreground">
                Web3 teams with ≥ $10M raised OR ≥ $500k monthly revenue
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleResearch} disabled={loading} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
              🔍 Research
            </Button>
            <Button variant="outline" onClick={() => setImportModalOpen(true)} className="border-border/50 hover:bg-primary/10 hover:border-primary">
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
            <div className="grid gap-4">
              {targets.map((target) => (
                <div key={target.id} className="border border-border/50 rounded-lg p-4 space-y-3 hover:border-primary/30 hover:shadow-lg transition-all bg-card/30">
                  <div className="font-semibold flex items-center justify-between text-foreground">
                    <button
                      onClick={() => {
                        setSelectedTarget(target)
                        setEditModalOpen(true)
                      }}
                      className="hover:text-primary hover:underline transition-colors text-left"
                    >
                      {target.team_name}
                    </button>
                    {target.is_web3 === 1 && (
                      <Badge className="bg-primary/10 text-primary border-primary/30">Web3</Badge>
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

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDismiss(target.id)} className="hover:bg-destructive/10 hover:border-destructive hover:text-destructive border-border/50">
                      ✕ Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddContact(target.id, target.team_name)}
                      className="border-border/50 hover:bg-success/10 hover:border-success hover:text-success"
                      title="Add contact manually"
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewContacts(target.id, target.team_name)}
                      className="border-border/50 hover:bg-primary/10 hover:border-primary"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSearchContacts(target.id, target.team_name)}
                      className="border-border/50 hover:bg-primary/10 hover:border-primary"
                    >
                      <Search className="mr-1 h-3 w-3" />
                      Search
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(target.id)} className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
                      ✓ Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTarget && (
        <EditTargetModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          target={selectedTarget}
          onSuccess={loadTargets}
        />
      )}

      <ImportTargetsModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={loadTargets}
      />

      {viewingContacts && (
        <ContactsModal
          open={contactsModalOpen}
          onOpenChange={(open) => {
            setContactsModalOpen(open)
            if (!open) {
              setViewingContacts(null)
              loadTargets()
            }
          }}
          teamName={viewingContacts.teamName}
          teamId={viewingContacts.teamId}
          contacts={viewingContacts.contacts}
        />
      )}

      {addContactTarget && (
        <AddContactToTargetModal
          open={addContactModalOpen}
          onOpenChange={setAddContactModalOpen}
          targetId={addContactTarget.id}
          targetName={addContactTarget.name}
          onSuccess={() => {
            loadTargets()
            setAddContactTarget(null)
          }}
        />
      )}
    </div>
  )
}
