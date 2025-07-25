import { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'

export interface PoolData {
  id: string
  name: string
  symbol: string
  description?: string
  mint: string
  poolAddress: string
  tokenMint: string
  pairTokenMint: string
  targetConfig?: string
  createdAt: number
  createdBy: string
  targetAmount?: number
  imageUri?: string
  price: number
  change24h: number
  volume24h: string
  progress: number
  participants: number
  marketCap: string
  migrationStatus: 'active' | 'near_migration' | 'migrated'
}

const STORAGE_KEY = 'launchpad_pools'

export const usePoolStorage = () => {
  const [pools, setPools] = useState<PoolData[]>([])

  // Load pools from localStorage on mount
  useEffect(() => {
    const storedPools = localStorage.getItem(STORAGE_KEY)
    if (storedPools) {
      try {
        const parsedPools = JSON.parse(storedPools)
        setPools(parsedPools)
        console.log('📦 Loaded pools from storage:', parsedPools.length)
      } catch (error) {
        console.error('❌ Error parsing stored pools:', error)
        setPools([])
      }
    }
  }, [])

  // Save pools to localStorage whenever pools change
  useEffect(() => {
    if (pools.length >= 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pools))
      console.log('💾 Saved pools to storage:', pools.length)
    }
  }, [pools])

  const addPool = (poolData: Omit<PoolData, 'id' | 'createdAt'>) => {
    const newPool: PoolData = {
      ...poolData,
      id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      // Default values for dynamic data
      price: 0.00001, // Starting price
      change24h: 0,
      volume24h: '$0',
      progress: 5, // Starting progress
      participants: 1,
      marketCap: '$1K',
      migrationStatus: 'active'
    }

    console.log('➕ Adding new pool:', newPool.name, newPool)
    
    setPools(prevPools => {
      const updatedPools = [newPool, ...prevPools]
      console.log('📦 Updated pools array:', updatedPools.length, updatedPools)
      return updatedPools
    })
    
    // Force immediate localStorage update
    const currentPools = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const updatedPools = [newPool, ...currentPools]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPools))
    console.log('💾 Force saved to localStorage:', updatedPools.length)
    
    return newPool
  }

  const updatePool = (poolId: string, updates: Partial<PoolData>) => {
    setPools(prevPools => 
      prevPools.map(pool => 
        pool.id === poolId 
          ? { ...pool, ...updates }
          : pool
      )
    )
    console.log('🔄 Updated pool:', poolId)
  }

  const removePool = (poolId: string) => {
    setPools(prevPools => prevPools.filter(pool => pool.id !== poolId))
    console.log('🗑️ Removed pool:', poolId)
  }

  const getPoolByMint = (mint: string) => {
    return pools.find(pool => pool.mint === mint || pool.pairTokenMint === mint)
  }

  const getPoolByAddress = (address: string) => {
    return pools.find(pool => pool.poolAddress === address)
  }

  // Clear all pools (for testing)
  const clearPools = () => {
    setPools([])
    localStorage.removeItem(STORAGE_KEY)
    console.log('🧹 Cleared all pools')
  }

  // Force refresh pools from localStorage
  const refreshPools = () => {
    const storedPools = localStorage.getItem(STORAGE_KEY)
    if (storedPools) {
      try {
        const parsedPools = JSON.parse(storedPools)
        setPools(parsedPools)
        console.log('🔄 Refreshed pools from storage:', parsedPools.length)
      } catch (error) {
        console.error('❌ Error refreshing pools:', error)
        setPools([])
      }
    } else {
      setPools([])
    }
  }

  return {
    pools,
    addPool,
    updatePool,
    removePool,
    getPoolByMint,
    getPoolByAddress,
    clearPools,
    refreshPools
  }
}