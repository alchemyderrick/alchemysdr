'use client'

import { useResearch } from '@/lib/research-context'
import { Progress } from '@/components/ui/progress'
import { X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ResearchProgress() {
  const { progress, clearProgress } = useResearch()

  if (!progress.active && progress.completed === 0) {
    return null
  }

  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
  const isComplete = progress.completed === progress.total && progress.total > 0

  // Get current task being researched
  const currentTask = progress.tasks.find(t =>
    t.status === 'researching_x' ||
    t.status === 'researching_website' ||
    t.status === 'researching_contacts'
  )

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'researching_x': return 'Finding Twitter...'
      case 'researching_website': return 'Finding website...'
      case 'researching_contacts': return 'Finding contacts...'
      default: return 'Researching...'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            <span className="text-sm font-medium">
              {isComplete ? 'Research Complete' : 'Researching Teams'}
            </span>
          </div>
          {isComplete && (
            <button
              onClick={clearProgress}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Progress value={percentage} className="h-2 mb-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.completed} / {progress.total} teams</span>
          <span>{Math.round(percentage)}%</span>
        </div>

        {currentTask && !isComplete && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="truncate">
                <span className="text-muted-foreground">{getStatusLabel(currentTask.status)}</span>
                {' '}
                <span className="font-medium">{currentTask.team_name}</span>
              </span>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              {(() => {
                const withX = progress.tasks.filter(t => t.x_handle).length
                const withWebsite = progress.tasks.filter(t => t.website).length
                const withContacts = progress.tasks.filter(t => t.contacts_found && t.contacts_found > 0).length
                const errors = progress.tasks.filter(t => t.status === 'error').length
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Twitter handles found:</span>
                      <span className="font-medium text-foreground">{withX}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Websites found:</span>
                      <span className="font-medium text-foreground">{withWebsite}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Teams with contacts:</span>
                      <span className="font-medium text-foreground">{withContacts}</span>
                    </div>
                    {errors > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>Errors:</span>
                        <span className="font-medium">{errors}</span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
