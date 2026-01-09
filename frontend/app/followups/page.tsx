'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FollowupsPage() {
  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
          <p className="text-sm text-muted-foreground">
            Companies awaiting response
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            Follow-ups feature coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
