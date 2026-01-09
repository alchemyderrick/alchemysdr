'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Name (required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Company (required)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <Input
          placeholder="Telegram handle (@username)"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
        />
        <Textarea
          placeholder="Notes/angle (funding, hiring, chain, infra pain, etc.)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-20"
        />
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Adding...' : 'Add + Generate Draft'}
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            Refresh Queue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
