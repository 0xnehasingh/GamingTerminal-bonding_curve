import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { SMART_CONTRACT_ADDRESS } from '@/lib/solana-config'

export interface RealTrade {
  timestamp: number
  price: number
  solAmount: number
  tokenAmount: number
  type: 'buy' | 'sell'
  signature: string
  user: string
}

export interface TradingDataPoint {
  timestamp: number
  price: number
  volume: number
  high: number
  low: number
  open: number
  close: number
}

export interface TokenTradingData {
  tokenMint: PublicKey
  poolAddress: PublicKey
  tokenName?: string
  tokenSymbol?: string
  imageUri?: string
  currentPrice: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  totalSupply: number
  circulatingSupply: number
  solBalance: number
  tokenBalance: number
  chartData: TradingDataPoint[]
  recentTrades: RealTrade[]
  isLoading: boolean
}

export const useTokenTradingData = (tokenAddress: string) => {
  const { connection } = useConnection()
  const [tradingData, setTradingData] = useState<TokenTradingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real transaction history for the token
  const fetchRealTransactionHistory = useCallback(async (poolAddress: PublicKey): Promise<RealTrade[]> => {
    try {
      console.log(`📈 Fetching real transaction history for pool: ${poolAddress.toString()}`)
      
      // Get signatures for the pool address
      const signatures = await connection.getSignaturesForAddress(poolAddress, { 
        limit: 1000 // Get more transactions for better data
      })
      
      console.log(`📊 Found ${signatures.length} transactions for pool`)
      
      const trades: RealTrade[] = []
      
      // Process transactions in batches to avoid rate limiting
      const batchSize = 10
      for (let i = 0; i < Math.min(signatures.length, 100); i += batchSize) {
        const batch = signatures.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (sigInfo) => {
          try {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            })
            
            if (!tx?.meta || tx.meta.err) return null
            
            // Analyze balance changes to determine trade details
            const preBalances = tx.meta.preBalances
            const postBalances = tx.meta.postBalances
            
            if (!preBalances || !postBalances) return null
            
            // Find the user account (not the pool or program)
            const userAccountIndex = tx.transaction.message.accountKeys.findIndex(
              (key, index) => 
                key.signer && 
                key.pubkey.toString() !== poolAddress.toString() &&
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
                const match = log.match(/Transfer\\s+(\\d+)/i)
                if (match) {
                  tokenAmount = parseInt(match[1]) / 1e6 // Assume 6 decimals
                  break
                }
              }
            }
            
            // Calculate price if we have both amounts
            let price = 0
            if (tokenAmount > 0 && solAmount > 0) {
              price = solAmount / tokenAmount
            }
            
            // Skip if we couldn't determine meaningful data
            if (price === 0 || solAmount === 0) return null
            
            return {
              timestamp: (sigInfo.blockTime || Date.now() / 1000) * 1000,
              price,
              solAmount,
              tokenAmount,
              type: tradeType,
              signature: sigInfo.signature,
              user: userAccount.pubkey.toString()
            } as RealTrade
            
          } catch (error) {
            console.warn(`Failed to parse transaction ${sigInfo.signature}:`, error)
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        trades.push(...batchResults.filter(t => t !== null) as RealTrade[])
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < signatures.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // Sort trades by timestamp (newest first)
      trades.sort((a, b) => b.timestamp - a.timestamp)
      
      console.log(`✅ Processed ${trades.length} real trades from blockchain`)
      return trades
      
    } catch (error) {
      console.error('❌ Failed to fetch transaction history:', error)
      return []
    }
  }, [connection])

  // Convert trades to chart data points
  const generateChartDataFromTrades = useCallback((trades: RealTrade[]): TradingDataPoint[] => {
    if (trades.length === 0) return []
    
    // Group trades by hour for OHLCV data
    const hourlyData = new Map<number, {
      timestamp: number
      trades: RealTrade[]
      volume: number
    }>()
    
    trades.forEach(trade => {
      const hourTimestamp = Math.floor(trade.timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60)
      
      if (!hourlyData.has(hourTimestamp)) {
        hourlyData.set(hourTimestamp, {
          timestamp: hourTimestamp,
          trades: [],
          volume: 0
        })
      }
      
      const hourData = hourlyData.get(hourTimestamp)!
      hourData.trades.push(trade)
      hourData.volume += trade.solAmount
    })
    
    // Convert to OHLCV format
    const chartData: TradingDataPoint[] = []
    
    Array.from(hourlyData.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(hourData => {
        const { trades, volume, timestamp } = hourData
        
        if (trades.length === 0) return
        
        const prices = trades.map(t => t.price).sort((a, b) => a - b)
        const open = trades[trades.length - 1].price // Oldest trade in hour
        const close = trades[0].price // Newest trade in hour
        const high = Math.max(...prices)
        const low = Math.min(...prices)
        
        chartData.push({
          timestamp,
          price: close,
          volume,
          high,
          low,
          open,
          close
        })
      })
    
    return chartData
  }, [])

  // Load cached data
  const loadCachedData = useCallback(() => {
    // Cache functionality removed - always fetch fresh data
    return false
  }, [tokenAddress])


  // Fetch real token data from blockchain
  const fetchTokenData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log(`🔄 Fetching real trading data for token: ${tokenAddress}`)
      
      const tokenMint = new PublicKey(tokenAddress)
      
      // Find the pool for this token from our smart contract
      const programAccounts = await connection.getProgramAccounts(SMART_CONTRACT_ADDRESS, {
        commitment: 'confirmed'
      })
      
      // Find the pool account that contains this token
      let poolAccount = null
      let poolAddress = null
      
      for (const account of programAccounts) {
        if (account.account.data.length === 394) {
          try {
            const tokenMintBytes = account.account.data.slice(16, 48)
            const accountTokenMint = new PublicKey(tokenMintBytes)
            
            if (accountTokenMint.toString() === tokenAddress) {
              poolAccount = account.account
              poolAddress = account.pubkey
              console.log(`✅ Found pool for token: ${poolAddress.toString()}`)
              break
            }
          } catch (error) {
            continue
          }
        }
      }
      
      if (!poolAccount || !poolAddress) {
        throw new Error('Pool not found for this token')
      }
      
      // Get pool signer
      const [poolSigner] = PublicKey.findProgramAddressSync(
        [Buffer.from('signer'), poolAddress.toBuffer()],
        SMART_CONTRACT_ADDRESS
      )
      
      // Get vault addresses
      const wsolMint = new PublicKey('So11111111111111111111111111111111111111112')
      const quoteVault = getAssociatedTokenAddressSync(wsolMint, poolSigner, true)
      const memeVault = getAssociatedTokenAddressSync(tokenMint, poolSigner, true)
      
      // Get current balances
      let solBalance = 0
      let tokenBalance = 0
      
      try {
        const quoteVaultInfo = await connection.getParsedAccountInfo(quoteVault)
        if (quoteVaultInfo.value?.data && 'parsed' in quoteVaultInfo.value.data) {
          solBalance = quoteVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
        }
      } catch (error) {
        console.warn('Could not fetch SOL balance')
      }
      
      try {
        const memeVaultInfo = await connection.getParsedAccountInfo(memeVault)
        if (memeVaultInfo.value?.data && 'parsed' in memeVaultInfo.value.data) {
          tokenBalance = memeVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
        }
      } catch (error) {
        console.warn('Could not fetch token balance')
      }
      
      // Calculate current price (SOL per token)
      const currentPrice = solBalance > 0 && tokenBalance > 0 ? solBalance / tokenBalance : 0
      
      if (currentPrice === 0) {
        throw new Error('Unable to calculate price - no liquidity in pool')
      }
      
      // Get token metadata (simplified without cache)
      let tokenName = 'Unknown Token'
      let tokenSymbol = 'UNK'
      let imageUri: string | undefined
      
      // For now, use default values since we removed the cache
      // In the future, you could fetch metadata from the blockchain or a different source
      
      // Get total supply
      let totalSupply = 1000000000
      try {
        const mintInfo = await connection.getParsedAccountInfo(tokenMint)
        if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
          totalSupply = mintInfo.value.data.parsed.info.supply
        }
      } catch (error) {
        console.warn('Could not fetch total supply')
      }
      
      // Fetch real transaction history
      console.log('📈 Fetching real transaction history...')
      const realTrades = await fetchRealTransactionHistory(poolAddress)
      
      // Generate chart data from real trades
      const chartData = generateChartDataFromTrades(realTrades)
      
      // Calculate real metrics from trades
      const now = Date.now()
      const last24h = now - 24 * 60 * 60 * 1000
      const trades24h = realTrades.filter(trade => trade.timestamp > last24h)
      
      const volume24h = trades24h.reduce((sum, trade) => sum + trade.solAmount, 0)
      
      // Calculate 24h price change
      let priceChange24h = 0
      if (trades24h.length > 0) {
        const oldestTrade24h = trades24h[trades24h.length - 1]
        const newestTrade = trades24h[0]
        if (oldestTrade24h && newestTrade) {
          priceChange24h = ((newestTrade.price - oldestTrade24h.price) / oldestTrade24h.price) * 100
        }
      }
      
      const circulatingSupply = totalSupply - tokenBalance
      const marketCap = currentPrice * circulatingSupply
      
      const newTradingData: TokenTradingData = {
        tokenMint,
        poolAddress,
        tokenName,
        tokenSymbol,
        imageUri,
        currentPrice,
        priceChange24h,
        volume24h,
        marketCap,
        totalSupply,
        circulatingSupply,
        solBalance,
        tokenBalance,
        chartData,
        recentTrades: realTrades.slice(0, 50), // Last 50 trades
        isLoading: false
      }
      
      setTradingData(newTradingData)
      
      console.log(`✅ Real trading data loaded for ${tokenName} (${tokenSymbol})`)
      console.log(`📊 Found ${realTrades.length} real trades, 24h volume: ${volume24h.toFixed(4)} SOL`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Failed to fetch real trading data:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [tokenAddress, connection, fetchRealTransactionHistory, generateChartDataFromTrades])

  // Manual refresh function
  const refreshTradingData = useCallback(() => {
    fetchTokenData()
  }, [fetchTokenData])

  // Load data on mount
  useEffect(() => {
    const hasCache = loadCachedData()
    if (!hasCache) {
      fetchTokenData()
    }
  }, [loadCachedData, fetchTokenData])

  return {
    tradingData,
    isLoading,
    error,
    refreshTradingData
  }
}