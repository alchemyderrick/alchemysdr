'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Plus, RefreshCw } from 'lucide-react'

interface AddContactCardProps {
  onRefresh?: () => void
}

export function AddContactCard({ onRefresh }: AddContactCardProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [telegram, setTelegram] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name || !company) {
      toast.error('Name and company are required')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/contacts/add-generate', {
        name,
        company,
        telegram_handle: telegram,
        notes,
        has_question: false,
      })

      toast.success('Contact added and draft generated!')
      setName('')
      setCompany('')
      setTelegram('')
      setNotes('')
      onRefresh?.()
    } catch (error) {
      toast.error('Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Contact</CardTitle>
        <CardDescription>Create a new contact and generate an outreach draft</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                placeholder="Acme Inc"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram Handle</Label>
            <Input
              id="telegram"
              placeholder="@username"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Angle</Label>
            <Textarea
              id="notes"
              placeholder="Funding, hiring, chain pain points..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add + Generate Draft
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
