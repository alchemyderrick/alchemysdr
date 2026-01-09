import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  subtitle: string
}

export function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 group border border-primary/30 rounded-xl bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </CardTitle>
        <div className="text-3xl opacity-50 group-hover:opacity-80 transition-opacity">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-6xl font-bold text-primary leading-none">
          {value}
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {subtitle}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
