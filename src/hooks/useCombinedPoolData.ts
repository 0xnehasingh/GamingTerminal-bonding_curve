import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useRealSmartContract } from './useRealSmartContract'
import { usePoolContext } from '@/contexts/PoolContext'

interface CombinedPool {
  poolAddress: PublicKey
  poolSigner: PublicKey
  tokenMint: PublicKey
  quoteMint: PublicKey
  memeVault: PublicKey
  quoteVault: PublicKey
  targetConfig: PublicKey
  tokenName: string
  tokenSymbol: string
  isActive: boolean
  solBalance: number
  tokenBalance: number
  totalSupply: number
  migrationThreshold: number
  createdAt: number
  creator: PublicKey
  // Additional fields from local context
  description?: string
  progress?: number
  price?: number
  change24h?: number
  volume24h?: string
  marketCap?: string
  participants?: number
  migrationStatus?: 'active' | 'near_migration' | 'migrated'
  // Source tracking
  source: 'onchain' | 'local' | 'combined'
}

export const useCombinedPoolData = () => {
  const { pools: onchainPools, metrics, isLoading: onchainLoading, error: onchainError, refreshContractData } = useRealSmartContract()
  const { pools: localPools } = usePoolContext()
  const [combinedPools, setCombinedPools] = useState<CombinedPool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Combine on-chain and local pool data
  const combinePoolData = useCallback(() => {
    console.log('🔄 Combining pool data...')
    console.log(`📊 On-chain pools: ${onchainPools.length}`)
    console.log(`💾 Local pools: ${localPools.length}`)

    const combined: CombinedPool[] = []
    const processedAddresses = new Set<string>()

    // First, add all on-chain pools
    onchainPools.forEach(onchainPool => {
      const poolKey = onchainPool.poolAddress.toString()
      processedAddresses.add(poolKey)
      
      // Try to find matching local pool for additional data
      const matchingLocalPool = localPools.find(localPool => 
        localPool.poolAddress === poolKey || 
        localPool.mint === onchainPool.tokenMint.toString()
      )

      const combinedPool: CombinedPool = {
        ...onchainPool,
        tokenName: matchingLocalPool?.name || onchainPool.tokenName || 'Unknown Token',
        tokenSymbol: matchingLocalPool?.symbol || onchainPool.tokenSymbol || 'UNKNOWN',
        description: matchingLocalPool?.description || `Pool for ${onchainPool.tokenMint.toString().slice(0, 8)}...`,
        progress: matchingLocalPool?.progress || 0,
        price: matchingLocalPool?.price || 0.000001,
        change24h: matchingLocalPool?.change24h || 0,
        volume24h: matchingLocalPool?.volume24h || '$0',
        marketCap: matchingLocalPool?.marketCap || '$0',
        participants: matchingLocalPool?.participants || 1,
        migrationStatus: matchingLocalPool?.migrationStatus || 'active',
        source: matchingLocalPool ? 'combined' : 'onchain'
      }

      combined.push(combinedPool)
      console.log(`✅ Added on-chain pool: ${combinedPool.tokenName} (${combinedPool.tokenSymbol})`)
    })

    // Then, add local pools that don't exist on-chain yet
    localPools.forEach(localPool => {
      const poolKey = localPool.poolAddress
      if (!processedAddresses.has(poolKey)) {
        processedAddresses.add(poolKey)
        
        // Create a combined pool from local data
        const combinedPool: CombinedPool = {
          poolAddress: new PublicKey(localPool.poolAddress),
          poolSigner: new PublicKey(localPool.poolAddress), // Placeholder
          tokenMint: new PublicKey(localPool.mint),
          quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
          memeVault: new PublicKey(localPool.poolAddress), // Placeholder
          quoteVault: new PublicKey(localPool.poolAddress), // Placeholder
          targetConfig: new PublicKey(localPool.targetConfig || localPool.poolAddress),
          tokenName: localPool.name,
          tokenSymbol: localPool.symbol,
          isActive: localPool.migrationStatus === 'active',
          solBalance: 0, // Will be updated when on-chain
          tokenBalance: localPool.targetAmount || 1000000,
          totalSupply: localPool.targetAmount || 1000000,
          migrationThreshold: 80,
          createdAt: Date.now() / 1000,
          creator: new PublicKey(localPool.createdBy),
          description: localPool.description,
          progress: localPool.progress || 0,
          price: localPool.price || 0.000001,
          change24h: localPool.change24h || 0,
          volume24h: localPool.volume24h || '$0',
          marketCap: localPool.marketCap || '$0',
          participants: localPool.participants || 1,
          migrationStatus: localPool.migrationStatus || 'active',
          source: 'local'
        }

        combined.push(combinedPool)
        console.log(`✅ Added local pool: ${combinedPool.tokenName} (${combinedPool.tokenSymbol})`)
      }
    })

    // Sort by creation time (newest first)
    combined.sort((a, b) => b.createdAt - a.createdAt)

    console.log(`🎉 Combined ${combined.length} total pools`)
    return combined
  }, [onchainPools, localPools])

  // Update combined pools when either source changes
  useEffect(() => {
    const combined = combinePoolData()
    setCombinedPools(combined)
    setIsLoading(onchainLoading)
    setError(onchainError)
  }, [combinePoolData, onchainLoading, onchainError])

  // Get featured pools (first 6)
  const featuredPools = combinedPools.slice(0, 6)

  // Get pools by source
  const onchainOnlyPools = combinedPools.filter(pool => pool.source === 'onchain')
  const localOnlyPools = combinedPools.filter(pool => pool.source === 'local')
  const combinedPoolsData = combinedPools.filter(pool => pool.source === 'combined')

  return {
    pools: combinedPools,
    featuredPools,
    onchainOnlyPools,
    localOnlyPools,
    combinedPoolsData,
    metrics,
    isLoading,
    error,
    refreshContractData,
    totalPools: combinedPools.length,
    onchainPoolsCount: onchainPools.length,
    localPoolsCount: localPools.length
  }
} 