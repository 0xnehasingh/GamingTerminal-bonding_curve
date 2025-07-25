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

  useEffect(() => {
    const updateLiveData = () => {
      // Simulate live trading activity
      const currentTime = Date.now()
      const simulatedVolume = Math.sin(currentTime / 60000) * 50000 + 100000 + Math.random() * 10000
      const simulatedTrades = Math.floor(Math.random() * 50) + 10

      // Simulate price movements for each pool
      const priceMovements = new Map<string, number>()
      pools.forEach(pool => {
        // Small random price movements (-5% to +5%)
        const movement = (Math.random() - 0.5) * 0.1
        priceMovements.set(pool.id, movement)
      })

      setLiveMetrics({
        totalVolume: simulatedVolume,
        activeTrades: simulatedTrades,
        priceMovements
      })
    }

    // Update every 5 seconds for demo
    const interval = setInterval(updateLiveData, 5000)
    updateLiveData() // Initial update

    return () => clearInterval(interval)
  }, [pools])

  return liveMetrics
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