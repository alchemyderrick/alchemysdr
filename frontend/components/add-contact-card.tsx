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
    <Card className="flex flex-col h-[380px] min-h-[380px] max-h-[380px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base">Add Contact</CardTitle>
        <CardDescription className="text-xs">Create a new contact and generate an outreach draft</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company" className="text-xs">Company *</Label>
              <Input
                id="company"
                placeholder="Acme Inc"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="telegram" className="text-xs">Telegram Handle</Label>
            <Input
              id="telegram"
              placeholder="@username"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes / Angle</Label>
            <Textarea
              id="notes"
              placeholder="Funding, hiring..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-[50px] resize-none text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1 h-8 text-sm">
              {loading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3 w-3" />
                  Add + Draft
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onRefresh} className="h-8 w-8 p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
