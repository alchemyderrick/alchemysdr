'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'

interface DiscoverXCardProps {
  onDiscoveryComplete?: () => void
}

export function DiscoverXCard({ onDiscoveryComplete }: DiscoverXCardProps) {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDiscover = async () => {
    if (!handle) {
      toast.error('Please enter a company X handle')
      return
    }

    setLoading(true)
    try {
      const result = await api.post<{ valid: number, invalid: number, drafts_generated: number }>('/api/workflow/x-discovery', {
        x_handle: handle.replace('@', ''),
        max_users: 5,
      })

      if (result.drafts_generated > 0) {
        toast.success(`Found ${result.valid} users with Telegram! ${result.drafts_generated} draft${result.drafts_generated > 1 ? 's' : ''} added to Send Queue.`)
      } else if (result.valid > 0) {
        toast.info(`Found ${result.valid} users but no drafts generated`)
      } else {
        toast.info('No users found with company in bio')
      }

      setHandle('')

      // Trigger refresh of Send Queue
      if (onDiscoveryComplete) {
        onDiscoveryComplete()
      }
    } catch (error) {
      toast.error('Failed to start X discovery')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden flex flex-col h-[420px] min-h-[420px] max-h-[420px] border border-primary/50 rounded-xl bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/80 group">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
          </div>
          Discover Users from X
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Find potential leads from a company's X followers</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
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
          <div className="h-[182px]"></div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 text-sm bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
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
