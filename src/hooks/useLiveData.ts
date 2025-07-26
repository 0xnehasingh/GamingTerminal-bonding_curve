import { useEffect, useState } from 'react'
import { usePoolContext } from '@/contexts/PoolContext'

// Hook to simulate live data updates for demo purposes
// In production, this would connect to real-time blockchain data feeds
export const useLiveData = () => {
  const { pools } = usePoolContext()
  const [liveMetrics, setLiveMetrics] = useState({
    totalVolume: 0,
    activeTrades: 0,
    priceMovements: new Map<string, number>()
  })

  // Load data from cache on component mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem('liveMetrics')
        if (cached) {
          const parsedData = JSON.parse(cached)
          // Convert Map back from stored array format
          const priceMovements = new Map(parsedData.priceMovements)
          setLiveMetrics({
            ...parsedData,
            priceMovements
          })
        } else {
          // Initial data generation only on first load
          updateLiveData()
        }
      } catch (error) {
        console.warn('Failed to load cached live metrics:', error)
        updateLiveData()
      }
    }

    const updateLiveData = () => {
      // Generate live trading activity data
      const currentTime = Date.now()
      const simulatedVolume = Math.sin(currentTime / 60000) * 50000 + 100000 + Math.random() * 10000
      const simulatedTrades = Math.floor(Math.random() * 50) + 10

      // Generate price movements for each pool
      const priceMovements = new Map<string, number>()
      pools.forEach(pool => {
        // Small random price movements (-5% to +5%)
        const movement = (Math.random() - 0.5) * 0.1
        priceMovements.set(pool.id, movement)
      })

      const newMetrics = {
        totalVolume: simulatedVolume,
        activeTrades: simulatedTrades,
        priceMovements
      }

      setLiveMetrics(newMetrics)
      
      // Cache the data (convert Map to array for JSON storage)
      try {
        localStorage.setItem('liveMetrics', JSON.stringify({
          ...newMetrics,
          priceMovements: Array.from(priceMovements.entries())
        }))
      } catch (error) {
        console.warn('Failed to cache live metrics:', error)
      }
    }

    loadCachedData()
  }, [pools])

  // Manual refresh function
  const refreshLiveData = () => {
    const currentTime = Date.now()
    const simulatedVolume = Math.sin(currentTime / 60000) * 50000 + 100000 + Math.random() * 10000
    const simulatedTrades = Math.floor(Math.random() * 50) + 10

    const priceMovements = new Map<string, number>()
    pools.forEach(pool => {
      const movement = (Math.random() - 0.5) * 0.1
      priceMovements.set(pool.id, movement)
    })

    const newMetrics = {
      totalVolume: simulatedVolume,
      activeTrades: simulatedTrades,
      priceMovements
    }

    setLiveMetrics(newMetrics)
    
    try {
      localStorage.setItem('liveMetrics', JSON.stringify({
        ...newMetrics,
        priceMovements: Array.from(priceMovements.entries())
      }))
    } catch (error) {
      console.warn('Failed to cache live metrics:', error)
    }
  }

  return { ...liveMetrics, refreshLiveData }
}

// Helper function to format large numbers
export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`
  }
  return num.toFixed(0)
}

// Helper function to format price changes
export const formatPriceChange = (change: number): string => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${(change * 100).toFixed(2)}%`
}

// Helper function to get trend color
export const getTrendColor = (change: number): string => {
  return change >= 0 ? 'text-green-400' : 'text-red-400'
}