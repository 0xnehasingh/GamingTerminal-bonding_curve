'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { PoolData } from '@/hooks/usePoolStorage'

interface PoolContextType {
  pools: PoolData[]
  addPool: (poolData: Omit<PoolData, 'id' | 'createdAt'>) => PoolData
  refreshPools: () => void
  clearPools: () => void
}

const PoolContext = createContext<PoolContextType | undefined>(undefined)

const STORAGE_KEY = 'launchpad_pools'

export function PoolProvider({ children }: { children: ReactNode }) {
  const [pools, setPools] = useState<PoolData[]>([])

  // Load pools from localStorage on mount (client-side only)
  useEffect(() => {
    const loadPools = () => {
      if (typeof window === 'undefined') return
      
      const storedPools = localStorage.getItem(STORAGE_KEY)
      if (storedPools) {
        try {
          const parsedPools = JSON.parse(storedPools)
          setPools(parsedPools)
          console.log('🏊 PoolProvider: Loaded pools from storage:', parsedPools.length)
        } catch (error) {
          console.error('❌ PoolProvider: Error parsing stored pools:', error)
          setPools([])
        }
      } else {
        console.log('🏊 PoolProvider: No pools in storage')
        setPools([])
      }
    }

    loadPools()
  }, [])

  // Save pools to localStorage whenever pools change (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (pools.length >= 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pools))
      console.log('💾 PoolProvider: Saved pools to storage:', pools.length)
    }
  }, [pools])

  const addPool = useCallback((poolData: Omit<PoolData, 'id' | 'createdAt'>) => {
    console.log('🔥 PoolProvider: addPool called with:', poolData)
    
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

    console.log('➕ PoolProvider: Creating new pool:', newPool)
    
    setPools(prevPools => {
      const updatedPools = [newPool, ...prevPools]
      console.log('📦 PoolProvider: Updated pools array length:', updatedPools.length)
      console.log('📦 PoolProvider: Updated pools:', updatedPools)
      return updatedPools
    })
    
    console.log('✅ PoolProvider: Pool addition completed')
    return newPool
  }, [])

  const refreshPools = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const storedPools = localStorage.getItem(STORAGE_KEY)
    if (storedPools) {
      try {
        const parsedPools = JSON.parse(storedPools)
        setPools(parsedPools)
        console.log('🔄 PoolProvider: Refreshed pools from storage:', parsedPools.length)
      } catch (error) {
        console.error('❌ PoolProvider: Error refreshing pools:', error)
        setPools([])
      }
    } else {
      setPools([])
    }
  }, [])

  const clearPools = useCallback(() => {
    setPools([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    console.log('🧹 PoolProvider: Cleared all pools')
  }, [])

  return (
    <PoolContext.Provider value={{ pools, addPool, refreshPools, clearPools }}>
      {children}
    </PoolContext.Provider>
  )
}

export function usePoolContext() {
  const context = useContext(PoolContext)
  if (context === undefined) {
    throw new Error('usePoolContext must be used within a PoolProvider')
  }
  return context
}