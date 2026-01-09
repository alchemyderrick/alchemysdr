'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { DraftWithContact } from '@/lib/types'

interface EditContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: DraftWithContact
  onSuccess: () => void
}

export function EditContactModal({ open, onOpenChange, draft, onSuccess }: EditContactModalProps) {
  const [name, setName] = useState(draft.name)
  const [company, setCompany] = useState(draft.company)
  const [telegramHandle, setTelegramHandle] = useState(draft.telegram_handle || '')
  const [saving, setSaving] = useState(false)

  // Reset form when draft changes
  useEffect(() => {
    setName(draft.name)
    setCompany(draft.company)
    setTelegramHandle(draft.telegram_handle || '')
  }, [draft])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!company.trim()) {
      toast.error('Company is required')
      return
    }

    setSaving(true)
    try {
      await api.patch(`/api/contacts/${draft.contact_id}`, {
        name: name.trim(),
        company: company.trim(),
        telegram_handle: telegramHandle.trim().replace('@', ''),
      })
      toast.success('Contact updated!')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update contact:', error)
      toast.error('Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="contact-name">Name *</Label>
            <Input
              id="contact-name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="company-name">Company *</Label>
            <Input
              id="company-name"
              placeholder="Acme Inc"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="telegram-handle">Telegram Handle</Label>
            <Input
              id="telegram-handle"
              placeholder="@username or username"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
