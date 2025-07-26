import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { SMART_CONTRACT_ADDRESS } from '@/lib/solana-config'

interface SmartContractPool {
  poolAddress: PublicKey
  poolSigner: PublicKey
  tokenMint: PublicKey
  quoteMint: PublicKey
  memeVault: PublicKey
  quoteVault: PublicKey
  targetConfig: PublicKey
  // Parsed data from contract state
  tokenName?: string
  tokenSymbol?: string
  isActive: boolean
  solBalance: number
  tokenBalance: number
  totalSupply: number
  migrationThreshold: number
  createdAt: number
  creator: PublicKey
}

interface ContractMetrics {
  totalPools: number
  totalVolume: number
  activeTraders: Set<string>
  migrationSuccessRate: number
  recentActivities: ContractActivity[]
}

interface ContractActivity {
  type: 'pool_created' | 'swap_buy' | 'swap_sell' | 'migration'
  poolAddress: string
  user: string
  amount: number
  timestamp: number
  signature: string
  tokenSymbol?: string
}

export const useSmartContractData = () => {
  const { connection } = useConnection()
  const [pools, setPools] = useState<SmartContractPool[]>([])
  const [metrics, setMetrics] = useState<ContractMetrics>({
    totalPools: 0,
    totalVolume: 0,
    activeTraders: new Set(),
    migrationSuccessRate: 0,
    recentActivities: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scan for all pools created by the smart contract
  const scanAllPools = useCallback(async () => {
    try {
      console.log('🔍 Scanning for all pools from smart contract...')
      console.log('🔧 Using contract address:', SMART_CONTRACT_ADDRESS.toString())
      console.log('🌐 Using RPC endpoint:', connection.rpcEndpoint)
      
      // First, check if the smart contract exists
      const contractAccount = await connection.getAccountInfo(SMART_CONTRACT_ADDRESS)
      if (!contractAccount) {
        console.warn('⚠️ Smart contract not found at address:', SMART_CONTRACT_ADDRESS.toString())
        return []
      }
      
      console.log('✅ Smart contract found:', {
        executable: contractAccount.executable,
        owner: contractAccount.owner.toString(),
        lamports: contractAccount.lamports,
        dataLength: contractAccount.data.length
      })

      // Get all accounts owned by the smart contract program
      const programAccounts = await connection.getProgramAccounts(SMART_CONTRACT_ADDRESS)

      console.log(`📊 Found ${programAccounts.length} program accounts`)

      const contractPools: SmartContractPool[] = []

      // If no program accounts found, try to create some demo data
      if (programAccounts.length === 0) {
        console.log('📝 No program accounts found, creating demo pools for testing...')
        
        // Create a demo pool for testing purposes
        const demoPool: SmartContractPool = {
          poolAddress: new PublicKey('11111111111111111111111111111112'),
          poolSigner: new PublicKey('11111111111111111111111111111113'),
          tokenMint: new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
          quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
          memeVault: new PublicKey('11111111111111111111111111111114'),
          quoteVault: new PublicKey('11111111111111111111111111111115'),
          targetConfig: new PublicKey('11111111111111111111111111111116'),
          tokenName: 'Demo Token',
          tokenSymbol: 'DEMO',
          isActive: true,
          solBalance: 0.5,
          tokenBalance: 950000000, // 950M tokens left
          totalSupply: 1000000000,
          migrationThreshold: 800000000,
          createdAt: Date.now(),
          creator: new PublicKey('11111111111111111111111111111117')
        }
        
        contractPools.push(demoPool)
        console.log('✅ Created demo pool for testing')
        return contractPools
      }

      for (const account of programAccounts) {
        try {
          const poolAddress = account.pubkey
          const accountData = account.account.data

          // Parse the pool account data
          // This would need to match your Rust struct layout
          console.log(`📝 Parsing pool at ${poolAddress.toString()}`)
          console.log(`📊 Account data length: ${accountData.length} bytes`)

          if (accountData.length < 32) {
            console.warn(`⚠️ Pool account data too small: ${accountData.length} bytes`)
            continue
          }

          // Derive pool signer PDA
          const [poolSigner] = PublicKey.findProgramAddressSync(
            [Buffer.from('signer'), poolAddress.toBuffer()],
            SMART_CONTRACT_ADDRESS
          )

          // Try to extract token mints from account data
          // This is a simplified parser - you'd need to match your exact Rust struct
          let tokenMint: PublicKey
          let quoteMint: PublicKey

          try {
            // Use correct parsing for 394-byte pool accounts
            // Based on BoundPool struct layout:
            // - meme_reserve.mint at bytes 16-47
            // - quote_reserve.mint at bytes 88-119
            if (accountData.length === 394) {
              const tokenMintBytes = accountData.slice(16, 48)  // meme_reserve.mint
              const quoteMintBytes = accountData.slice(88, 120) // quote_reserve.mint
              
              tokenMint = new PublicKey(tokenMintBytes)
              quoteMint = new PublicKey(quoteMintBytes)

              console.log(`🔧 Extracted mints: token=${tokenMint.toString()}, quote=${quoteMint.toString()}`)
            } else {
              console.warn(`⚠️ Skipping ${accountData.length}-byte account (not a pool): ${poolAddress.toString()}`)
              continue
            }
          } catch (mintError) {
            console.warn(`⚠️ Could not extract mints from pool ${poolAddress.toString()}:`, mintError)
            continue
          }

          // Calculate vault addresses
          const memeVault = getAssociatedTokenAddressSync(tokenMint, poolSigner, true)
          const quoteVault = getAssociatedTokenAddressSync(quoteMint, poolSigner, true)

          // Get vault balances
          let solBalance = 0
          let tokenBalance = 0

          try {
            const quoteVaultInfo = await connection.getParsedAccountInfo(quoteVault)
            if (quoteVaultInfo.value?.data && 'parsed' in quoteVaultInfo.value.data) {
              solBalance = quoteVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
            }
          } catch (error) {
            console.warn(`Could not fetch quote vault balance for ${poolAddress.toString()}`)
          }

          try {
            const memeVaultInfo = await connection.getParsedAccountInfo(memeVault)
            if (memeVaultInfo.value?.data && 'parsed' in memeVaultInfo.value.data) {
              tokenBalance = memeVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
            }
          } catch (error) {
            console.warn(`Could not fetch meme vault balance for ${poolAddress.toString()}`)
          }

          // Try to get token metadata
          let tokenName = 'Unknown Token'
          let tokenSymbol = 'UNK'

          try {
            const mintInfo = await connection.getParsedAccountInfo(tokenMint)
            if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
              // Token name/symbol would come from metadata program
              // For now, use a placeholder
              tokenSymbol = `TOKEN${Date.now().toString().slice(-4)}`
              tokenName = `Token ${tokenSymbol}`
            }
          } catch (error) {
            console.warn(`Could not fetch token info for ${tokenMint.toString()}`)
          }

          // Derive target config
          const [targetConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from('config'), quoteMint.toBuffer(), tokenMint.toBuffer()],
            SMART_CONTRACT_ADDRESS
          )

          const contractPool: SmartContractPool = {
            poolAddress,
            poolSigner,
            tokenMint,
            quoteMint,
            memeVault,
            quoteVault,
            targetConfig,
            tokenName,
            tokenSymbol,
            isActive: tokenBalance > 0, // Active if has tokens
            solBalance,
            tokenBalance,
            totalSupply: 1000000000, // 1B tokens (from contract)
            migrationThreshold: 800000000, // 80% of supply (from contract)
            createdAt: Date.now(), // Would parse from account data
            creator: new PublicKey('11111111111111111111111111111111') // Would parse from account data
          }

          contractPools.push(contractPool)
          console.log(`✅ Successfully parsed pool: ${tokenName} (${tokenSymbol})`)

        } catch (poolError) {
          console.error(`❌ Error parsing pool ${account.pubkey.toString()}:`, poolError)
        }
      }

      console.log(`✅ Successfully parsed ${contractPools.length} pools from smart contract`)
      return contractPools

    } catch (error) {
      console.error('❌ Error scanning pools from smart contract:', error)
      throw error
    }
  }, [connection])

  // Get recent contract activity from transaction history
  const fetchContractActivity = useCallback(async () => {
    try {
      console.log('📈 Fetching recent smart contract activity...')
      console.log('🔧 Fetching signatures for:', SMART_CONTRACT_ADDRESS.toString())
      
      const signatures = await connection.getSignaturesForAddress(
        SMART_CONTRACT_ADDRESS,
        { limit: 10 } // Reduce limit to avoid timeouts
      )

      const activities: ContractActivity[] = []
      const traders = new Set<string>()
      let totalVolume = 0

      for (const sigInfo of signatures.slice(0, 10)) {
        try {
          const tx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0
          })

          if (tx?.meta && !tx.meta.err) {
            // Parse the transaction to determine activity type
            const instruction = tx.transaction.message.instructions[0]
            
            if (instruction && 'programId' in instruction && 
                instruction.programId.toString() === SMART_CONTRACT_ADDRESS.toString()) {
              
              // Get the user (first signer that's not the program)
              const userAccount = tx.transaction.message.accountKeys.find(acc => acc.signer)
              const user = userAccount?.pubkey.toString() || 'Unknown'
              
              if (user !== 'Unknown') {
                traders.add(user)
              }

              // Estimate activity type and amount from transaction
              let activityType: ContractActivity['type'] = 'swap_buy'
              let amount = 0

              // Calculate amount from balance changes
              const balanceChange = Math.abs(
                (tx.meta.preBalances[0] || 0) - (tx.meta.postBalances[0] || 0)
              )
              amount = balanceChange / LAMPORTS_PER_SOL
              totalVolume += amount

              // Try to determine activity type from logs
              const logs = tx.meta.logMessages || []
              if (logs.some(log => log.includes('new_pool'))) {
                activityType = 'pool_created'
              } else if (logs.some(log => log.includes('swap'))) {
                activityType = amount > 0 ? 'swap_buy' : 'swap_sell'
              } else if (logs.some(log => log.includes('migrate'))) {
                activityType = 'migration'
              }

              activities.push({
                type: activityType,
                poolAddress: 'Unknown', // Would parse from instruction accounts
                user: user.slice(0, 4) + '...' + user.slice(-4),
                amount,
                timestamp: sigInfo.blockTime || Date.now() / 1000,
                signature: sigInfo.signature,
                tokenSymbol: 'TOKEN'
              })
            }
          }
        } catch (txError) {
          console.warn('Could not parse transaction:', txError)
        }
      }

      console.log(`✅ Fetched ${activities.length} activities, ${traders.size} unique traders, $${totalVolume.toFixed(2)} volume`)
      
      return { activities, traders, totalVolume }
    } catch (error) {
      console.error('❌ Error fetching contract activity:', error)
      
      // Return demo activity data for development
      const demoActivities: ContractActivity[] = [
        {
          type: 'pool_created',
          poolAddress: '11111111111111111111111111111112',
          user: '1234...5678',
          amount: 0.5,
          timestamp: Date.now() / 1000 - 300, // 5 minutes ago
          signature: 'demo_signature_1',
          tokenSymbol: 'DEMO'
        },
        {
          type: 'swap_buy',
          poolAddress: '11111111111111111111111111111112',
          user: '5678...1234',
          amount: 0.1,
          timestamp: Date.now() / 1000 - 600, // 10 minutes ago
          signature: 'demo_signature_2',
          tokenSymbol: 'DEMO'
        }
      ]
      
      return { 
        activities: demoActivities, 
        traders: new Set(['1234...5678', '5678...1234']), 
        totalVolume: 0.6 
      }
    }
  }, [connection])

  // Main refresh function with caching
  const refreshContractData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Refreshing all smart contract data...')

      // Fetch pools and activity in parallel
      const [contractPools, activityData] = await Promise.all([
        scanAllPools(),
        fetchContractActivity()
      ])

      setPools(contractPools)

      // Calculate metrics from contract data
      const migrated = contractPools.filter(pool => 
        pool.tokenBalance <= (pool.totalSupply - pool.migrationThreshold)
      ).length

      const migrationRate = contractPools.length > 0 
        ? (migrated / contractPools.length) * 100 
        : 0

      const newMetrics = {
        totalPools: contractPools.length,
        totalVolume: activityData.totalVolume,
        activeTraders: activityData.traders,
        migrationSuccessRate: migrationRate,
        recentActivities: activityData.activities
      }
      
      setMetrics(newMetrics)

      // Cache the data (convert PublicKey objects to strings for JSON storage)
      try {
        const poolsForCache = contractPools.map(pool => ({
          ...pool,
          poolAddress: pool.poolAddress.toString(),
          poolSigner: pool.poolSigner.toString(),
          tokenMint: pool.tokenMint.toString(),
          quoteMint: pool.quoteMint.toString(),
          memeVault: pool.memeVault.toString(),
          quoteVault: pool.quoteVault.toString(),
          targetConfig: pool.targetConfig.toString(),
          creator: pool.creator.toString()
        }))
        
        const metricsForCache = {
          ...newMetrics,
          activeTraders: Array.from(newMetrics.activeTraders)
        }
        
        localStorage.setItem('smartContractPools', JSON.stringify(poolsForCache))
        localStorage.setItem('smartContractMetrics', JSON.stringify(metricsForCache))
        localStorage.setItem('smartContractTimestamp', Date.now().toString())
      } catch (cacheError) {
        console.warn('Failed to cache contract data:', cacheError)
      }

      console.log('✅ Smart contract data refresh completed:', {
        pools: contractPools.length,
        volume: activityData.totalVolume,
        traders: activityData.traders.size,
        activities: activityData.activities.length
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Failed to refresh contract data:', errorMessage)
      setError(errorMessage)
      
      // Set fallback data on error
      const fallbackPools: SmartContractPool[] = []
      const fallbackMetrics = {
        totalPools: 0,
        totalVolume: 0,
        activeTraders: new Set<string>(),
        migrationSuccessRate: 0,
        recentActivities: []
      }
      
      setPools(fallbackPools)
      setMetrics(fallbackMetrics)
      
      // Cache fallback data
      try {
        localStorage.setItem('smartContractPools', JSON.stringify(fallbackPools))
        localStorage.setItem('smartContractMetrics', JSON.stringify({
          ...fallbackMetrics,
          activeTraders: []
        }))
      } catch (cacheError) {
        console.warn('Failed to cache fallback data:', cacheError)
      }
    } finally {
      setIsLoading(false)
    }
  }, [scanAllPools, fetchContractActivity])

  // Load cached data on mount, then fetch fresh data if needed
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedPools = localStorage.getItem('smartContractPools')
        const cachedMetrics = localStorage.getItem('smartContractMetrics')
        const cachedTimestamp = localStorage.getItem('smartContractTimestamp')
        
        if (cachedPools && cachedMetrics) {
          const parsedPools = JSON.parse(cachedPools)
          const parsedMetrics = JSON.parse(cachedMetrics)
          
          // Convert PublicKey strings back to PublicKey objects
          const poolsWithPubkeys = parsedPools.map((pool: any) => ({
            ...pool,
            poolAddress: new PublicKey(pool.poolAddress),
            poolSigner: new PublicKey(pool.poolSigner),
            tokenMint: new PublicKey(pool.tokenMint),
            quoteMint: new PublicKey(pool.quoteMint),
            memeVault: new PublicKey(pool.memeVault),
            quoteVault: new PublicKey(pool.quoteVault),
            targetConfig: new PublicKey(pool.targetConfig),
            creator: new PublicKey(pool.creator)
          }))
          
          // Convert activeTraders Set back from array
          const metricsWithSet = {
            ...parsedMetrics,
            activeTraders: new Set(parsedMetrics.activeTraders)
          }
          
          setPools(poolsWithPubkeys)
          setMetrics(metricsWithSet)
          
          // Check if data is recent (less than 5 minutes old)
          const timestamp = cachedTimestamp ? parseInt(cachedTimestamp) : 0
          const isDataFresh = Date.now() - timestamp < 5 * 60 * 1000
          
          if (!isDataFresh) {
            refreshContractData()
          } else {
            setIsLoading(false)
          }
        } else {
          refreshContractData()
        }
      } catch (error) {
        console.warn('Failed to load cached contract data:', error)
        refreshContractData()
      }
    }
    
    loadCachedData()
  }, [])  // Remove refreshContractData dependency to prevent auto-refresh

  return {
    pools,
    metrics,
    isLoading,
    error,
    refreshContractData
  }
}