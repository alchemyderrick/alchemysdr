'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface ResearchTask {
  id: string
  team_name: string
  status: 'pending' | 'researching_x' | 'researching_website' | 'researching_contacts' | 'completed' | 'error'
  x_handle?: string | null
  website?: string | null
  contacts_found?: number
  error?: string
}

interface ResearchProgress {
  active: boolean
  tasks: ResearchTask[]
  completed: number
  total: number
}

interface ResearchContextType {
  progress: ResearchProgress
  startResearch: (tasks: { id: string; team_name: string }[]) => void
  updateTask: (id: string, update: Partial<ResearchTask>) => void
  clearProgress: () => void
}

const ResearchContext = createContext<ResearchContextType | null>(null)

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ResearchProgress>({
    active: false,
    tasks: [],
    completed: 0,
    total: 0
  })

  const startResearch = useCallback((tasks: { id: string; team_name: string }[]) => {
    setProgress({
      active: true,
      tasks: tasks.map(t => ({ ...t, status: 'pending' })),
      completed: 0,
      total: tasks.length
    })
  }, [])

  const updateTask = useCallback((id: string, update: Partial<ResearchTask>) => {
    setProgress(prev => {
      const newTasks = prev.tasks.map(t =>
        t.id === id ? { ...t, ...update } : t
      )
      const completed = newTasks.filter(t => t.status === 'completed' || t.status === 'error').length
      const allDone = completed === prev.total

      return {
        ...prev,
        tasks: newTasks,
        completed,
        active: !allDone
      }
    })
  }, [])

  const clearProgress = useCallback(() => {
    setProgress({
      active: false,
      tasks: [],
      completed: 0,
      total: 0
    })
  }, [])

  return (
    <ResearchContext.Provider value={{ progress, startResearch, updateTask, clearProgress }}>
      {children}
    </ResearchContext.Provider>
  )
}

export function useResearch() {
  const context = useContext(ResearchContext)
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider')
  }
  return context
}
