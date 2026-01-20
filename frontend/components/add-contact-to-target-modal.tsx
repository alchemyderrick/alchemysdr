'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

interface AddContactToTargetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetId: string
  targetName: string
  onSuccess: () => void
}

export function AddContactToTargetModal({
  open,
  onOpenChange,
  targetId,
  targetName,
  onSuccess
}: AddContactToTargetModalProps) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [telegramHandle, setTelegramHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!telegramHandle.trim()) {
      toast.error('Telegram handle is required')
      return
    }

    setLoading(true)
    try {
      // Create contact
      const contactRes = await api.post<{ id: string }>('/api/contacts', {
        name: name.trim(),
        company: targetName,
        title: title.trim() || '',
        telegram_handle: telegramHandle.trim().replace('@', ''),
        notes: notes.trim() || `Manually added to ${targetName}`,
      })

      // Generate draft
      await api.post('/api/drafts/generate', {
        contact_id: contactRes.id,
      })

      toast.success('Contact added and draft generated!')

      // Reset form
      setName('')
      setTitle('')
      setTelegramHandle('')
      setNotes('')

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to add contact:', error)
      toast.error(error.message || 'Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setTitle('')
      setTelegramHandle('')
      setNotes('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle>Add Contact to {targetName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manually add a contact to this company
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="title"
              placeholder="CEO, CTO, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram" className="text-sm font-medium">
              Telegram Handle *
            </Label>
            <Input
              id="telegram"
              placeholder="@username or username"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              className="bg-background/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background/50 min-h-[80px] resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 border-border/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
