import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  subtitle: string
}

export function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-blue-400 opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="flex items-center gap-4 p-8">
        <div className="text-5xl opacity-90">{icon}</div>
        <div className="flex-1">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent leading-tight">
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
