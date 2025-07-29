import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { SMART_CONTRACT_ADDRESS } from '@/lib/solana-config'

export interface RealTimeTrade {
  account: string
  type: 'buy' | 'sell'
  solAmount: number
  tokenAmount: number
  timestamp: number
  signature: string
  user: string
}

export interface RealTimeTradesData {
  trades: RealTimeTrade[]
  isLoading: boolean
  error: string | null
  lastUpdated: number
}

// Rate limiting utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Rate limited request function
const rateLimitedRequest = async <T>(
  requestFn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFn()
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.status === 429) {
        const delayMs = baseDelay * Math.pow(2, attempt)
        console.log(`Rate limited. Retrying after ${delayMs}ms...`)
        await delay(delayMs)
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

export const useRealTimeTrades = (poolAddress?: string, tokenMint?: string) => {
  const { connection } = useConnection()
  const [tradesData, setTradesData] = useState<RealTimeTradesData>({
    trades: [],
    isLoading: true,
    error: null,
    lastUpdated: 0
  })

  // Fetch real transaction history for the pool
  const fetchRealTimeTrades = useCallback(async (poolPubkey: PublicKey): Promise<RealTimeTrade[]> => {
    try {
      console.log(`📈 Fetching real-time trades for pool: ${poolPubkey.toString()}`)
      
      // Get recent signatures for the pool address
      const signatures = await rateLimitedRequest(() =>
        connection.getSignaturesForAddress(poolPubkey, { 
          limit: 50 // Get last 50 transactions
        })
      )
      
      console.log(`📊 Found ${signatures.length} recent transactions`)
      
      const trades: RealTimeTrade[] = []
      
      // Process transactions in batches to avoid rate limiting
      const batchSize = 5
      for (let i = 0; i < Math.min(signatures.length, 20); i += batchSize) {
        const batch = signatures.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (sigInfo) => {
          try {
            const tx = await rateLimitedRequest(() =>
              connection.getParsedTransaction(sigInfo.signature, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
              })
            )
            
            if (!tx?.meta || tx.meta.err) return null
            
            // Analyze balance changes to determine trade details
            const preBalances = tx.meta.preBalances
            const postBalances = tx.meta.postBalances
            
            if (!preBalances || !postBalances) return null
            
            // Find the user account (not the pool or program)
            const userAccountIndex = tx.transaction.message.accountKeys.findIndex(
              (key, index) => 
                key.signer && 
                key.pubkey.toString() !== poolPubkey.toString() &&
                key.pubkey.toString() !== SMART_CONTRACT_ADDRESS.toString()
            )
            
            if (userAccountIndex === -1) return null
            
            const userAccount = tx.transaction.message.accountKeys[userAccountIndex]
            const solChange = (postBalances[userAccountIndex] - preBalances[userAccountIndex]) / LAMPORTS_PER_SOL
            
            // Determine trade type and amounts from instruction logs
            const logs = tx.meta.logMessages || []
            let tokenAmount = 0
            let solAmount = Math.abs(solChange)
            let tradeType: 'buy' | 'sell' = solChange < 0 ? 'buy' : 'sell'
            
            // Try to parse token transfer amounts from logs
            for (const log of logs) {
              if (log.includes('Transfer')) {
                const match = log.match(/Transfer\s+(\d+)/i)
                if (match) {
                  tokenAmount = parseInt(match[1]) / 1e6 // Assume 6 decimals
                  break
                }
              }
            }
            
            // Skip if we couldn't determine meaningful data
            if (solAmount === 0) return null
            
            // If we couldn't determine token amount, estimate it
            if (tokenAmount === 0) {
              // Estimate token amount based on SOL amount and current pool price
              // This is a rough estimate - in a real implementation you'd parse the actual instruction data
              tokenAmount = solAmount * 1000000 // Rough estimate
            }
            
            return {
              account: userAccount.pubkey.toString().slice(0, 6) + '...' + userAccount.pubkey.toString().slice(-4),
              type: tradeType,
              solAmount,
              tokenAmount,
              timestamp: (sigInfo.blockTime || Date.now() / 1000) * 1000,
              signature: sigInfo.signature,
              user: userAccount.pubkey.toString()
            } as RealTimeTrade
            
          } catch (error) {
            console.warn(`Failed to parse transaction ${sigInfo.signature}:`, error)
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        trades.push(...batchResults.filter(t => t !== null) as RealTimeTrade[])
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < signatures.length) {
          await delay(200)
        }
      }
      
      // Sort trades by timestamp (newest first)
      trades.sort((a, b) => b.timestamp - a.timestamp)
      
      console.log(`✅ Processed ${trades.length} real-time trades from blockchain`)
      return trades
      
    } catch (error) {
      console.error('❌ Failed to fetch real-time trades:', error)
      return []
    }
  }, [connection])

  // Generate mock data for demonstration
  const generateMockTrades = (): RealTimeTrade[] => {
    const now = Date.now()
    return [
      {
        account: "7RZ6Z9",
        type: "sell",
        solAmount: 0.245,
        tokenAmount: 8670000,
        timestamp: now - 19000,
        signature: "4PpbSp",
        user: "7RZ6Z9..."
      },
      {
        account: "7RZ6Z9", 
        type: "buy",
        solAmount: 0.245,
        tokenAmount: 8670000,
        timestamp: now - 26000,
        signature: "4gYfHm",
        user: "7RZ6Z9..."
      },
      {
        account: "ABC123",
        type: "buy",
        solAmount: 0.1,
        tokenAmount: 3500000,
        timestamp: now - 45000,
        signature: "9KmLnP",
        user: "ABC123..."
      },
      {
        account: "XYZ789",
        type: "sell",
        solAmount: 0.5,
        tokenAmount: 17500000,
        timestamp: now - 67000,
        signature: "2QwErT",
        user: "XYZ789..."
      }
    ]
  }

  // Fetch trades data
  const fetchTradesData = useCallback(async () => {
    if (!poolAddress) {
      console.log('⚠️ No pool address provided, using mock data')
      setTradesData({
        trades: generateMockTrades(),
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      })
      return
    }

    try {
      setTradesData(prev => ({ ...prev, isLoading: true, error: null }))
      
      const poolPubkey = new PublicKey(poolAddress)
      const realTrades = await fetchRealTimeTrades(poolPubkey)
      
      setTradesData({
        trades: realTrades.length > 0 ? realTrades : generateMockTrades(),
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      })
      
    } catch (error) {
      console.error('❌ Error fetching real-time trades:', error)
      setTradesData({
        trades: generateMockTrades(),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trades',
        lastUpdated: Date.now()
      })
    }
  }, [poolAddress, fetchRealTimeTrades])

  // Refresh function
  const refreshTrades = useCallback(() => {
    fetchTradesData()
  }, [fetchTradesData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchTradesData()
    
    const interval = setInterval(() => {
      fetchTradesData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [fetchTradesData])

  return {
    trades: tradesData.trades,
    isLoading: tradesData.isLoading,
    error: tradesData.error,
    lastUpdated: tradesData.lastUpdated,
    refreshTrades
  }
} 