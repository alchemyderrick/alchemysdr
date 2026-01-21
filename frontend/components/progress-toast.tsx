'use client'

import { Progress } from '@/components/ui/progress'

interface ProgressToastProps {
  title: string
  icon: string
  phase: string
  progress: number
}

export function ProgressToast({ title, icon, phase, progress }: ProgressToastProps) {
  return (
    <div className="flex flex-col gap-2 w-[356px] rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{phase}</p>
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs font-mono text-muted-foreground w-10 text-right">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}
