import { useState, useCallback } from 'react'

interface RefreshControlOptions {
  onRefresh: () => Promise<void> | void
  cooldownMs?: number
}

interface RefreshControlState {
  isRefreshing: boolean
  lastRefreshTime: number | null
  canRefresh: boolean
  error: string | null
}

export const useRefreshControl = ({ onRefresh, cooldownMs = 2000 }: RefreshControlOptions) => {
  const [state, setState] = useState<RefreshControlState>({
    isRefreshing: false,
    lastRefreshTime: null,
    canRefresh: true,
    error: null
  })

  const refresh = useCallback(async () => {
    if (!state.canRefresh || state.isRefreshing) {
      return
    }

    setState(prev => ({
      ...prev,
      isRefreshing: true,
      error: null
    }))

    try {
      await onRefresh()
      const now = Date.now()
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        lastRefreshTime: now,
        canRefresh: false
      }))

      // Enable refresh after cooldown
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          canRefresh: true
        }))
      }, cooldownMs)

    } catch (error) {
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Refresh failed',
        canRefresh: true
      }))
    }
  }, [onRefresh, state.canRefresh, state.isRefreshing, cooldownMs])

  const getTimeSinceLastRefresh = useCallback(() => {
    if (!state.lastRefreshTime) return null
    return Date.now() - state.lastRefreshTime
  }, [state.lastRefreshTime])

  const getFormattedLastRefreshTime = useCallback(() => {
    if (!state.lastRefreshTime) return 'Never'
    
    const timeSince = getTimeSinceLastRefresh()
    if (!timeSince) return 'Never'
    
    if (timeSince < 60000) {
      return `${Math.floor(timeSince / 1000)}s ago`
    } else if (timeSince < 3600000) {
      return `${Math.floor(timeSince / 60000)}m ago`
    } else {
      return `${Math.floor(timeSince / 3600000)}h ago`
    }
  }, [getTimeSinceLastRefresh])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    refresh,
    isRefreshing: state.isRefreshing,
    canRefresh: state.canRefresh,
    error: state.error,
    lastRefreshTime: state.lastRefreshTime,
    getTimeSinceLastRefresh,
    getFormattedLastRefreshTime,
    clearError
  }
}