
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl?: number
}

// Helper function to check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export class CacheManager {
  private static instance: CacheManager
  private maxAge = 5 * 60 * 1000 // 5 minutes default TTL

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  set<T>(key: string, data: T, ttl?: number): void {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available, skipping cache set')
      return
    }

    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.maxAge
      }
      localStorage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn(`Failed to cache data for key "${key}":`, error)
    }
  }

  get<T>(key: string): T | null {
    if (!isLocalStorageAvailable()) {
      return null
    }

    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const cacheItem: CacheItem<T> = JSON.parse(cached)
      const now = Date.now()
      const age = now - cacheItem.timestamp

      if (cacheItem.ttl && age > cacheItem.ttl) {
        this.remove(key)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.warn(`Failed to retrieve cached data for key "${key}":`, error)
      return null
    }
  }

  isExpired(key: string): boolean {
    if (!isLocalStorageAvailable()) {
      return true
    }

    try {
      const cached = localStorage.getItem(key)
      if (!cached) return true

      const cacheItem: CacheItem<any> = JSON.parse(cached)
      const now = Date.now()
      const age = now - cacheItem.timestamp

      return cacheItem.ttl ? age > cacheItem.ttl : false
    } catch (error) {
      return true
    }
  }

  remove(key: string): void {
    if (!isLocalStorageAvailable()) {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Failed to remove cached data for key "${key}":`, error)
    }
  }

  clear(): void {
    if (!isLocalStorageAvailable()) {
      return
    }

    try {
      // Clear only our cache keys
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => 
        key.startsWith('blockchain') || 
        key.startsWith('smartContract') || 
        key.startsWith('liveMetrics')
      )
      
      cacheKeys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  getStats(): { keys: string[], totalSize: number } {
    if (!isLocalStorageAvailable()) {
      return { keys: [], totalSize: 0 }
    }

    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => 
        key.startsWith('blockchain') || 
        key.startsWith('smartContract') || 
        key.startsWith('liveMetrics')
      )
      
      const totalSize = cacheKeys.reduce((size, key) => {
        const item = localStorage.getItem(key)
        return size + (item ? item.length : 0)
      }, 0)

      return { keys: cacheKeys, totalSize }
    } catch (error) {
      return { keys: [], totalSize: 0 }
    }
  }
}

export const cache = CacheManager.getInstance()

// Cache keys constants
export const CACHE_KEYS = {
  BLOCKCHAIN_METRICS: 'blockchainMetrics',
  BLOCKCHAIN_POOLS: 'blockchainPools', 
  BLOCKCHAIN_ACTIVITY: 'blockchainActivity',
  SMART_CONTRACT_POOLS: 'smartContractPools',
  SMART_CONTRACT_METRICS: 'smartContractMetrics',
  LIVE_METRICS: 'liveMetrics'
} as const

// Utility functions for specific data types
export const cacheUtils = {
  setBlockchainData: (metrics: any, pools: any, activity: any) => {
    cache.set(CACHE_KEYS.BLOCKCHAIN_METRICS, metrics)
    cache.set(CACHE_KEYS.BLOCKCHAIN_POOLS, pools)
    cache.set(CACHE_KEYS.BLOCKCHAIN_ACTIVITY, activity)
  },

  getBlockchainData: () => ({
    metrics: cache.get(CACHE_KEYS.BLOCKCHAIN_METRICS),
    pools: cache.get(CACHE_KEYS.BLOCKCHAIN_POOLS),
    activity: cache.get(CACHE_KEYS.BLOCKCHAIN_ACTIVITY)
  }),

  setSmartContractData: (pools: any, metrics: any) => {
    cache.set(CACHE_KEYS.SMART_CONTRACT_POOLS, pools)
    cache.set(CACHE_KEYS.SMART_CONTRACT_METRICS, metrics)
  },

  getSmartContractData: () => ({
    pools: cache.get(CACHE_KEYS.SMART_CONTRACT_POOLS),
    metrics: cache.get(CACHE_KEYS.SMART_CONTRACT_METRICS)
  }),

  setLiveMetrics: (data: any) => {
    cache.set(CACHE_KEYS.LIVE_METRICS, data)
  },

  getLiveMetrics: () => cache.get(CACHE_KEYS.LIVE_METRICS),

  isBlockchainDataExpired: () => {
    return cache.isExpired(CACHE_KEYS.BLOCKCHAIN_METRICS) ||
           cache.isExpired(CACHE_KEYS.BLOCKCHAIN_POOLS) ||
           cache.isExpired(CACHE_KEYS.BLOCKCHAIN_ACTIVITY)
  },

  isSmartContractDataExpired: () => {
    return cache.isExpired(CACHE_KEYS.SMART_CONTRACT_POOLS) ||
           cache.isExpired(CACHE_KEYS.SMART_CONTRACT_METRICS)
  }
}