'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ApprovedPage() {
  return (
    <div className="p-10 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>No Outreach</CardTitle>
          <p className="text-sm text-muted-foreground">
            Targets marked as no outreach
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            No outreach targets list coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
