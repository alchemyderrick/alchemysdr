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
      console.error('Failed to add contact:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add contact'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden flex flex-col h-[420px] min-h-[420px] max-h-[420px] border border-purple/50 rounded-xl bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-purple/20 hover:border-purple/80 group">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-purple/10 text-purple">
            <Plus className="h-4 w-4" />
          </div>
          Add Contact
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Create a new contact and generate an outreach draft</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
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
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 text-sm bg-purple hover:bg-purple/90 text-white border-0 shadow-lg shadow-purple/20 hover:shadow-xl hover:shadow-purple/30 transition-all"
            >
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
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="h-9 w-9 p-0 hover:bg-purple/10 hover:border-purple transition-all border-border"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
