'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

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
  notes?: string
}

interface ContactsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamName: string
  teamId: string
  contacts: Contact[]
}

export function ContactsModal({ open, onOpenChange, teamName, teamId, contacts }: ContactsModalProps) {
  const [telegramHandles, setTelegramHandles] = useState<{ [key: string]: string }>({})
  const [addingContact, setAddingContact] = useState<string | null>(null)

  const handleTelegramChange = (contactId: string, value: string) => {
    setTelegramHandles(prev => ({ ...prev, [contactId]: value }))
  }

  const handleAddToQueue = async (contact: Contact) => {
    setAddingContact(contact.id)
    try {
      const telegramHandle = telegramHandles[contact.id] || contact.telegram_handle || ''

      if (!telegramHandle) {
        toast.error('Please enter a Telegram handle')
        setAddingContact(null)
        return
      }

      toast.info('Adding contact and generating draft...')

      // Add contact
      const contactRes = await api.post('/api/contacts', {
        name: contact.name,
        company: teamName,
        title: contact.title || '',
        telegram_handle: telegramHandle,
        notes: contact.notes || '',
      })

      // Generate draft
      await api.post('/api/drafts/generate', {
        contact_id: contactRes.id,
      })

      toast.success('Draft generated! Check the queue.')
      setTelegramHandles(prev => {
        const newHandles = { ...prev }
        delete newHandles[contact.id]
        return newHandles
      })
    } catch (error) {
      toast.error('Failed to add contact')
      console.error('Error adding contact:', error)
    } finally {
      setAddingContact(null)
    }
  }

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Remove ${contactName} from contacts?`)) {
      return
    }

    try {
      await api.delete(`/api/targets/${teamId}/contacts/${contactId}`)
      toast.success('Contact removed')
      // Remove from local state
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to delete contact')
      console.error('Error deleting contact:', error)
    }
  }

  const getSourceBadge = (source?: string) => {
    if (source === 'apollo') {
      return <Badge className="bg-indigo-600 text-white border-0 text-[10px] px-2 py-0">Apollo</Badge>
    } else if (source === 'web_search') {
      return <Badge className="bg-emerald-600 text-white border-0 text-[10px] px-2 py-0">Web</Badge>
    } else if (source === 'x_discovery') {
      return <Badge className="bg-sky-500 text-white border-0 text-[10px] px-2 py-0">X</Badge>
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[90vw] max-h-[85vh] overflow-auto bg-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl">All Contacts at {teamName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Employees found via Apollo, X discovery, Google, and LinkedIn
          </DialogDescription>
        </DialogHeader>

        {!contacts || contacts.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            No contacts found. This may take a moment on first search.
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="relative border border-border/50 rounded-lg p-4 bg-card/30 hover:border-primary/30 transition-all space-y-2"
              >
                {/* Delete button */}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 rounded"
                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Name and source badge */}
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-foreground">{contact.name}</div>
                  {getSourceBadge(contact.source)}
                </div>

                {/* Apollo confidence score */}
                {contact.apollo_confidence_score && contact.source === 'apollo' && (
                  <div className="text-xs text-muted-foreground">
                    Data quality: {(contact.apollo_confidence_score * 100).toFixed(0)}%
                  </div>
                )}

                {/* Title */}
                {contact.title && (
                  <div className="text-xs text-muted-foreground">{contact.title}</div>
                )}

                {/* Contact info */}
                <div className="space-y-1 text-sm">
                  {contact.email && <div>📧 {contact.email}</div>}
                  {contact.phone && <div>📞 {contact.phone}</div>}
                  {contact.linkedin && (
                    <div>
                      🔗{' '}
                      <a
                        href={contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                  {contact.telegram_handle && <div>Telegram: {contact.telegram_handle}</div>}
                  {contact.x_username && <div>X: @{contact.x_username}</div>}
                  {contact.x_bio && (
                    <div className="text-xs text-muted-foreground italic">{contact.x_bio}</div>
                  )}
                </div>

                {/* Notes */}
                {contact.notes && (
                  <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/30">
                    {contact.notes}
                  </div>
                )}

                {/* Telegram input and add button */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Telegram handle (optional)"
                    value={telegramHandles[contact.id] || contact.telegram_handle || ''}
                    onChange={(e) => handleTelegramChange(contact.id, e.target.value)}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddToQueue(contact)}
                    disabled={addingContact === contact.id}
                    className="bg-primary hover:bg-primary/90 shadow-md"
                  >
                    {addingContact === contact.id ? 'Adding...' : 'Add to queue'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
