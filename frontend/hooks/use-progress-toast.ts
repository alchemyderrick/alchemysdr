"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { ProgressToast } from '@/components/progress-toast'

interface ProgressPhase {
  readonly name: string
  readonly duration: number  // ms
  readonly targetProgress: number  // 0-100
}

interface ProgressConfig {
  readonly title: string
  readonly icon: string
  readonly phases: readonly ProgressPhase[]
}

// Predefined operation configurations
export const PROGRESS_CONFIGS = {
  research: {
    title: 'Researching Teams',
    icon: '🔍',
    phases: [
      { name: 'Initializing research...', duration: 3000, targetProgress: 5 },
      { name: 'Finding official X handles...', duration: 15000, targetProgress: 20 },
      { name: 'Discovering websites...', duration: 15000, targetProgress: 35 },
      { name: 'Searching Apollo for contacts...', duration: 30000, targetProgress: 70 },
      { name: 'Processing contact data...', duration: 20000, targetProgress: 90 },
      { name: 'Finalizing...', duration: 7000, targetProgress: 95 },
    ]
  },
  contactSearch: {
    title: 'Searching for Contacts',
    icon: '👥',
    phases: [
      { name: 'Initializing search...', duration: 2000, targetProgress: 5 },
      { name: 'Querying Apollo API...', duration: 20000, targetProgress: 50 },
      { name: 'Searching web sources...', duration: 15000, targetProgress: 80 },
      { name: 'Processing results...', duration: 8000, targetProgress: 95 },
    ]
  },
  xDiscovery: {
    title: 'Discovering X Users',
    icon: '🐦',
    phases: [
      { name: 'Connecting to X...', duration: 3000, targetProgress: 10 },
      { name: 'Finding company followers...', duration: 25000, targetProgress: 50 },
      { name: 'Analyzing user bios...', duration: 20000, targetProgress: 80 },
      { name: 'Filtering valid contacts...', duration: 12000, targetProgress: 95 },
    ]
  },
  import: {
    title: 'Importing & Researching Teams',
    icon: '📥',
    phases: [
      { name: 'Validating data...', duration: 2000, targetProgress: 5 },
      { name: 'Importing teams...', duration: 3000, targetProgress: 10 },
      { name: 'Finding official X handles...', duration: 15000, targetProgress: 25 },
      { name: 'Discovering websites...', duration: 15000, targetProgress: 40 },
      { name: 'Searching Apollo for contacts...', duration: 30000, targetProgress: 70 },
      { name: 'Processing contact data...', duration: 20000, targetProgress: 90 },
      { name: 'Finalizing...', duration: 7000, targetProgress: 95 },
    ]
  }
} as const

export type OperationType = keyof typeof PROGRESS_CONFIGS

interface ProgressState {
  progress: number
  currentPhase: string
  title: string
  icon: string
}

interface UseProgressToastReturn {
  start: (operation: OperationType) => void
  complete: (message?: string) => void
  fail: (errorMessage: string) => void
}

export function useProgressToast(): UseProgressToastReturn {
  const [state, setState] = useState<ProgressState>({
    progress: 0,
    currentPhase: '',
    title: '',
    icon: ''
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const toastIdRef = useRef<string | number | null>(null)
  const configRef = useRef<ProgressConfig | null>(null)
  const startTimeRef = useRef<number>(0)

  const clearProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const updateToast = useCallback((newState: ProgressState) => {
    if (toastIdRef.current) {
      toast.custom(
        (t) => ProgressToast({
          title: newState.title,
          icon: newState.icon,
          phase: newState.currentPhase,
          progress: newState.progress
        }),
        {
          id: toastIdRef.current,
          duration: Infinity,
        }
      )
    }
  }, [])

  const start = useCallback((operation: OperationType) => {
    clearProgress()
    const config = PROGRESS_CONFIGS[operation]
    configRef.current = config

    const initialState: ProgressState = {
      progress: 0,
      currentPhase: config.phases[0].name,
      title: config.title,
      icon: config.icon
    }
    setState(initialState)
    startTimeRef.current = Date.now()

    // Create the toast
    toastIdRef.current = toast.custom(
      (t) => ProgressToast({
        title: initialState.title,
        icon: initialState.icon,
        phase: initialState.currentPhase,
        progress: initialState.progress
      }),
      {
        duration: Infinity,
      }
    )

    // Animate progress through phases
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const phases = config.phases

      let accumulatedTime = 0
      let currentPhaseIndex = 0

      for (let i = 0; i < phases.length; i++) {
        if (elapsed < accumulatedTime + phases[i].duration) {
          currentPhaseIndex = i
          break
        }
        accumulatedTime += phases[i].duration
        currentPhaseIndex = i
      }

      const phase = phases[currentPhaseIndex]
      const prevProgress = currentPhaseIndex > 0 ? phases[currentPhaseIndex - 1].targetProgress : 0
      const phaseElapsed = elapsed - accumulatedTime
      const phaseProgress = Math.min(1, phaseElapsed / phase.duration)

      // Ease out for smoother animation
      const easeOut = 1 - Math.pow(1 - phaseProgress, 2)
      const newProgress = prevProgress + (phase.targetProgress - prevProgress) * easeOut

      const newState: ProgressState = {
        progress: Math.min(95, newProgress), // Cap at 95% until complete() is called
        currentPhase: phase.name,
        title: config.title,
        icon: config.icon
      }

      setState(newState)
      updateToast(newState)
    }, 100)
  }, [clearProgress, updateToast])

  const complete = useCallback((message?: string) => {
    clearProgress()

    // Update to 100%
    const finalState: ProgressState = {
      progress: 100,
      currentPhase: 'Complete!',
      title: configRef.current?.title || 'Operation',
      icon: '✅'
    }
    setState(finalState)
    updateToast(finalState)

    // Dismiss after a short delay and show success toast
    setTimeout(() => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
      if (message) {
        toast.success(message)
      }
    }, 1500)
  }, [clearProgress, updateToast])

  const fail = useCallback((errorMessage: string) => {
    clearProgress()

    // Dismiss the progress toast and show error
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current)
      toastIdRef.current = null
    }
    toast.error(errorMessage)
  }, [clearProgress])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearProgress()
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
      }
    }
  }, [clearProgress])

  return {
    start,
    complete,
    fail
  }
}
