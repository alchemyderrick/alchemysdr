import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  subtitle: string
}

export function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 group border-2">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-blue-400 opacity-0 transition-opacity group-hover:opacity-100" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent leading-tight mb-1">
          {value}
        </div>
        <CardDescription className="text-xs">
          {subtitle}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
