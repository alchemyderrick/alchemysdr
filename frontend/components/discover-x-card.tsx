'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'

export function DiscoverXCard() {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDiscover = async () => {
    if (!handle) {
      toast.error('Please enter a company X handle')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/workflow/x-discovery', {
        x_handle: handle.replace('@', ''),
        max_users: 5,
      })

      toast.success('X discovery started! Check Active Outreach for results.')
      setHandle('')
    } catch (error) {
      toast.error('Failed to start X discovery')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[380px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Discover Users from X</CardTitle>
        <CardDescription className="text-xs">Find potential leads from a company's X followers</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <form onSubmit={(e) => { e.preventDefault(); handleDiscover(); }} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="x-handle" className="text-xs">Company X Handle</Label>
            <Input
              id="x-handle"
              placeholder="@alchemy"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Spacer to match Add Contact card height - accounts for 3 additional fields */}
          <div className="h-[142px]"></div>

          <Button type="submit" disabled={loading} className="w-full h-8 text-sm">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Search className="mr-2 h-3 w-3" />
                Discover Users
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
