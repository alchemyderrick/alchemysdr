'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Target } from '@/lib/types'

interface EditTargetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: Target
  onSuccess: () => void
}

export function EditTargetModal({ open, onOpenChange, target, onSuccess }: EditTargetModalProps) {
  const [teamName, setTeamName] = useState(target.team_name)
  const [xHandle, setXHandle] = useState(target.x_handle || '')
  const [website, setWebsite] = useState(target.website || '')
  const [raisedUsd, setRaisedUsd] = useState(target.raised_usd.toString())
  const [monthlyRevenue, setMonthlyRevenue] = useState(target.monthly_revenue_usd.toString())
  const [notes, setNotes] = useState(target.notes || '')
  const [saving, setSaving] = useState(false)

  // Reset form when target changes
  useEffect(() => {
    setTeamName(target.team_name)
    setXHandle(target.x_handle || '')
    setWebsite(target.website || '')
    setRaisedUsd(target.raised_usd.toString())
    setMonthlyRevenue(target.monthly_revenue_usd.toString())
    setNotes(target.notes || '')
  }, [target])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/api/targets/${target.id}`, {
        x_handle: xHandle.replace('@', ''),
        website: website,
        notes: notes,
        raised_usd: parseInt(raisedUsd) || 0,
        monthly_revenue_usd: parseInt(monthlyRevenue) || 0,
      })
      toast.success('Target updated!')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update target:', error)
      toast.error('Failed to update target')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Target: {teamName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="x-handle">X (Twitter) Handle</Label>
            <Input
              id="x-handle"
              placeholder="@username or username"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="raised">Total Raised (USD)</Label>
              <Input
                id="raised"
                type="number"
                placeholder="10000000"
                value={raisedUsd}
                onChange={(e) => setRaisedUsd(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current: ${parseInt(raisedUsd).toLocaleString()}
              </p>
            </div>

            <div>
              <Label htmlFor="revenue">Monthly Revenue (USD)</Label>
              <Input
                id="revenue"
                type="number"
                placeholder="500000"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current: ${parseInt(monthlyRevenue).toLocaleString()}/mo
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about this target..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[100px]"
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
