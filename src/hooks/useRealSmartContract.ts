import { useState, useEffect, useCallback } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { SMART_CONTRACT_ADDRESS, RPC_ENDPOINTS } from '@/lib/solana-config'

// Metaplex Metadata Program ID
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

export interface SmartContractPool {
  poolAddress: PublicKey
  poolSigner: PublicKey
  tokenMint: PublicKey
  quoteMint: PublicKey
  memeVault: PublicKey
  quoteVault: PublicKey
  targetConfig: PublicKey
  tokenName?: string
  tokenSymbol?: string
  imageUri?: string
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

// Utility function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Function to derive metadata PDA for a token mint
const getMetadataPDA = (mint: PublicKey): PublicKey => {
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )
  return metadataPDA
}

// Function to fetch token metadata from on-chain
const fetchTokenMetadata = async (connection: Connection, tokenMint: PublicKey): Promise<{ name: string, symbol: string, uri: string } | null> => {
  try {
    const metadataPDA = getMetadataPDA(tokenMint)
    console.log(`🔍 Fetching metadata from PDA: ${metadataPDA.toString()} for token: ${tokenMint.toString()}`)
    
    // Use a more direct approach to get the metadata account  
    const metadataAccount = await rateLimitedRequest((conn) => conn.getAccountInfo(metadataPDA))
    
    if (!metadataAccount) {
      console.log(`📝 No metadata account found for token: ${tokenMint.toString()}`)
      return null
    }

    if (!metadataAccount.data || metadataAccount.data.length === 0) {
      console.log(`📝 Metadata account exists but has no data for token: ${tokenMint.toString()}`)
      return null
    }

    console.log(`✅ Found metadata account with ${metadataAccount.data.length} bytes, owner: ${metadataAccount.owner.toString()}`)
    
    // Check if this is a Token Metadata program account
    if (metadataAccount.owner.toString() !== METADATA_PROGRAM_ID.toString()) {
      console.log(`⚠️ Metadata account is owned by ${metadataAccount.owner.toString()}, expected ${METADATA_PROGRAM_ID.toString()}`)
      return null
    }

    console.log(`✅ Confirmed this is a Metaplex Token Metadata account`)
    
    // Try to get the parsed version directly
    try {
      const parsedAttempt = await rateLimitedRequest(async (conn) => {
        try {
          // Try with confirmed commitment first
          const result = await conn.getParsedAccountInfo(metadataPDA, 'confirmed')
          if (result.value?.data && 'parsed' in result.value.data) {
            return result.value.data.parsed
          }
          return null
        } catch (e) {
          console.log(`Parse attempt failed:`, e.message)
          return null
        }
      })
      
      if (parsedAttempt) {
        console.log(`🎯 Successfully got parsed metadata:`, JSON.stringify(parsedAttempt, null, 2))
        
        // Handle the exact structure: { data: { name, symbol, uri } }
        if (parsedAttempt.data && parsedAttempt.data.name && parsedAttempt.data.symbol) {
          const { name, symbol, uri } = parsedAttempt.data
          console.log(`✅ Successfully extracted metadata: ${name} (${symbol})`)
          return { name, symbol, uri }
        }
        
        // Try alternative structures
        if (parsedAttempt.name && parsedAttempt.symbol) {
          const { name, symbol, uri } = parsedAttempt
          console.log(`✅ Successfully extracted metadata (alt): ${name} (${symbol})`)
          return { name, symbol, uri }
        }
      }
    } catch (parseError) {
      console.warn(`⚠️ Failed to parse metadata via getParsedAccountInfo:`, parseError)
    }
    
    // If we get here, we have a metadata account but couldn't parse it via standard methods
    console.log(`📊 Fallback: Trying manual parsing of ${metadataAccount.data.length} byte metadata account`)
    
    // Try to parse Metaplex metadata structure
    const data = metadataAccount.data
    
    if (data.length < 100) {
      console.warn(`⚠️ Metadata account too small: ${data.length} bytes`)
      return null
    }
    
    try {
      // Modern Metaplex Token Metadata structure (version 1.3+)
      // Structure: [discriminator(1)] + [update_authority(32)] + [mint(32)] + [data struct]
      let offset = 1 + 32 + 32 // Skip discriminator, update authority, mint
      
      // Read name length (4 bytes little endian)
      if (offset + 4 > data.length) {
        console.warn(`⚠️ Not enough data for name length at offset ${offset}`)
        return null
      }
      
      const nameLength = data.readUInt32LE(offset)
      offset += 4
      
      console.log(`📏 Name length: ${nameLength}`)
      
      if (nameLength > 200 || nameLength === 0) {
        console.warn(`⚠️ Invalid name length: ${nameLength}`)
        return null
      }
      
      if (offset + nameLength > data.length) {
        console.warn(`⚠️ Not enough data for name at offset ${offset}, length ${nameLength}`)
        return null
      }
      
      // Read name
      const nameBytes = data.slice(offset, offset + nameLength)
      const name = nameBytes.toString('utf8').replace(/\0/g, '').trim()
      offset += nameLength
      
      console.log(`📝 Parsed name: "${name}"`)
      
      // Read symbol length (4 bytes)
      if (offset + 4 > data.length) {
        console.warn(`⚠️ Not enough data for symbol length at offset ${offset}`)
        return null
      }
      
      const symbolLength = data.readUInt32LE(offset)
      offset += 4
      
      console.log(`📏 Symbol length: ${symbolLength}`)
      
      if (symbolLength > 50 || symbolLength === 0) {
        console.warn(`⚠️ Invalid symbol length: ${symbolLength}`)
        return null
      }
      
      if (offset + symbolLength > data.length) {
        console.warn(`⚠️ Not enough data for symbol at offset ${offset}, length ${symbolLength}`)
        return null
      }
      
      // Read symbol
      const symbolBytes = data.slice(offset, offset + symbolLength)
      const symbol = symbolBytes.toString('utf8').replace(/\0/g, '').trim()
      offset += symbolLength
      
      console.log(`📝 Parsed symbol: "${symbol}"`)
      
      // Read URI length (4 bytes)
      if (offset + 4 > data.length) {
        console.warn(`⚠️ Not enough data for URI length at offset ${offset}`)
        return null
      }
      
      const uriLength = data.readUInt32LE(offset)
      offset += 4
      
      console.log(`📏 URI length: ${uriLength}`)
      
      if (uriLength > 1000) {
        console.warn(`⚠️ URI length too large: ${uriLength}`)
        return null
      }
      
      let uri = ''
      if (uriLength > 0 && offset + uriLength <= data.length) {
        // Read URI
        const uriBytes = data.slice(offset, offset + uriLength)
        uri = uriBytes.toString('utf8').replace(/\0/g, '').trim()
        console.log(`📝 Parsed URI: "${uri}"`)
      }
      
      if (name && symbol) {
        console.log(`✅ Successfully manually parsed metadata for ${tokenMint.toString()}: ${name} (${symbol})`)
        return { name, symbol, uri }
      } else {
        console.warn(`⚠️ Empty name or symbol after parsing: name="${name}", symbol="${symbol}"`)
        return null
      }
      
    } catch (parseError) {
      console.warn(`⚠️ Failed to parse metadata structure:`, parseError)
      console.warn(`⚠️ Error details:`, parseError.message)
      return null
    }
    
  } catch (error) {
    console.warn(`⚠️ Failed to fetch metadata for ${tokenMint.toString()}:`, error)
    return null
  }
}

// Demo data for when real blockchain data is unavailable
const generateDemoData = (): { pools: SmartContractPool[], metrics: ContractMetrics } => {
  console.log('🎭 Generating demo data due to rate limiting...')
  
  const demoPools: SmartContractPool[] = [
    {
      poolAddress: new PublicKey('11111111111111111111111111111111'),
      poolSigner: new PublicKey('22222222222222222222222222222222'),
      tokenMint: new PublicKey('33333333333333333333333333333333'),
      quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
      memeVault: new PublicKey('44444444444444444444444444444444'),
      quoteVault: new PublicKey('55555555555555555555555555555555'),
      targetConfig: new PublicKey('66666666666666666666666666666666'),
      tokenName: 'Demo Token 1',
      tokenSymbol: 'DEMO1',
      isActive: true,
      solBalance: 1.5,
      tokenBalance: 1000000,
      totalSupply: 10000000,
      migrationThreshold: 500000,
      createdAt: Date.now() / 1000 - 3600, // 1 hour ago
      creator: new PublicKey('77777777777777777777777777777777')
    },
    {
      poolAddress: new PublicKey('88888888888888888888888888888888'),
      poolSigner: new PublicKey('99999999999999999999999999999999'),
      tokenMint: new PublicKey('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
      memeVault: new PublicKey('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      quoteVault: new PublicKey('cccccccccccccccccccccccccccccccc'),
      targetConfig: new PublicKey('dddddddddddddddddddddddddddddddd'),
      tokenName: 'Demo Token 2',
      tokenSymbol: 'DEMO2',
      isActive: true,
      solBalance: 2.3,
      tokenBalance: 750000,
      totalSupply: 5000000,
      migrationThreshold: 250000,
      createdAt: Date.now() / 1000 - 7200, // 2 hours ago
      creator: new PublicKey('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    }
  ]

  const demoMetrics: ContractMetrics = {
    totalPools: demoPools.length,
    totalVolume: 15.7,
    activeTraders: new Set(['DemoUser1', 'DemoUser2', 'DemoUser3']),
    migrationSuccessRate: 75.0,
    recentActivities: [
      {
        type: 'swap_buy',
        poolAddress: demoPools[0].poolAddress.toString(),
        user: 'DemoUser1',
        amount: 0.5,
        timestamp: Date.now() / 1000 - 300,
        signature: 'demo_signature_1',
        tokenSymbol: 'DEMO1'
      },
      {
        type: 'pool_created',
        poolAddress: demoPools[1].poolAddress.toString(),
        user: 'DemoUser2',
        amount: 2.0,
        timestamp: Date.now() / 1000 - 1800,
        signature: 'demo_signature_2',
        tokenSymbol: 'DEMO2'
      }
    ]
  }

  return { pools: demoPools, metrics: demoMetrics }
}

// Enhanced rate limiting with RPC endpoint fallback
const rateLimitedRequest = async <T>(
  requestFn: (connection: Connection) => Promise<T>,
  retries = 5,
  baseDelay = 2000
): Promise<T> => {
  let currentEndpointIndex = 0
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const connection = new Connection(RPC_ENDPOINTS[currentEndpointIndex], 'confirmed')
      return await requestFn(connection)
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.status === 429 || 
          error?.message?.includes('getProgramAccounts is not available')) {
        
        // Try next RPC endpoint
        currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length
        
        const delayMs = baseDelay * Math.pow(2, attempt) // Exponential backoff
        console.log(`Rate limited or restricted. Switching to RPC ${currentEndpointIndex + 1} after ${delayMs}ms delay...`)
        await delay(delayMs)
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded across all RPC endpoints')
}

export const useRealSmartContract = () => {
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

  // Check if smart contract exists and is executable
  const checkSmartContract = useCallback(async () => {
    try {
      console.log('🔍 Checking smart contract accessibility...')
      console.log('📍 Contract address:', SMART_CONTRACT_ADDRESS.toString())
      console.log('🌐 RPC endpoint:', connection.rpcEndpoint)
      
      const contractAccount = await rateLimitedRequest((conn) =>
        conn.getAccountInfo(SMART_CONTRACT_ADDRESS)
      )
      
      if (!contractAccount) {
        throw new Error('Smart contract not found at specified address')
      }
      
      if (!contractAccount.executable) {
        throw new Error('Account exists but is not an executable program')
      }
      
      console.log('✅ Smart contract verified:', {
        executable: contractAccount.executable,
        owner: contractAccount.owner.toString(),
        lamports: contractAccount.lamports,
        dataLength: contractAccount.data.length
      })
      
      return true
    } catch (error) {
      console.error('❌ Smart contract check failed:', error)
      throw error
    }
  }, [connection])

  // Fetch all pools from smart contract program accounts
  const fetchRealPools = useCallback(async () => {
    console.log('🔍 Fetching real pools from smart contract...')
    
    try {
      // Get ALL program accounts owned by the smart contract (no limits)
      console.log('🔍 Fetching ALL pool accounts from smart contract...')
      
      // First, let's get ALL accounts without size filters to see what we have
      const allAccounts = await rateLimitedRequest((conn) =>
        conn.getProgramAccounts(SMART_CONTRACT_ADDRESS, {
          commitment: 'confirmed'
        })
      )
      
      console.log(`📊 Found ${allAccounts.length} total program accounts`)
      
      // Log all account sizes to understand the data structure
      const accountSizes = new Map<number, number>()
      allAccounts.forEach(account => {
        const size = account.account.data.length
        accountSizes.set(size, (accountSizes.get(size) || 0) + 1)
      })
      
      console.log('📏 Account size distribution:')
      Array.from(accountSizes.entries()).sort((a, b) => a[0] - b[0]).forEach(([size, count]) => {
        console.log(`   ${size} bytes: ${count} accounts`)
      })
      
      // Filter accounts by known sizes
      const programAccounts = allAccounts.filter(account => account.account.data.length === 80)
      const extendedAccounts = allAccounts.filter(account => account.account.data.length === 394)
      
      // Combine both account types to get ALL pools
      let allPoolAccounts = [...programAccounts, ...extendedAccounts]
      
      // Also check for pools with the correct seed structure
      console.log('🔍 Checking for pools with correct seed structure...')
      
              // Only process 394-byte accounts as they are the real pool accounts
        // 80-byte accounts are likely target configs or other data, not pools
        const verifiedPoolAccounts = allPoolAccounts.filter(account => {
          try {
            const data = account.account.data
            
            // Only accept 394-byte accounts as real pools
            if (data.length !== 394) {
              console.log(`⚠️ Skipping ${data.length}-byte account (not a pool): ${account.pubkey.toString()}`)
              return false
            }
            
            // Check if the data contains valid public keys at the expected positions for 394-byte pools
            const tokenMintBytes = data.slice(16, 48)  // meme_reserve.mint
            const quoteMintBytes = data.slice(88, 120) // quote_reserve.mint
            
            // Try to create PublicKey objects to verify they're valid
            const tokenMint = new PublicKey(tokenMintBytes)
            const quoteMint = new PublicKey(quoteMintBytes)
            
            // Log all potential pool accounts for debugging
            console.log(`🔍 Potential pool account: ${account.pubkey.toString()}`)
            console.log(`   Token mint: ${tokenMint.toString()}`)
            console.log(`   Quote mint: ${quoteMint.toString()}`)
            console.log(`   Data size: ${data.length} bytes`)
            
            // Verify these are valid public keys
            if (tokenMint && quoteMint) {
              console.log(`✅ Verified pool account: ${account.pubkey.toString()}`)
              return true
            }
            
            return false
          } catch (error) {
            console.log(`❌ Invalid pool account structure: ${account.pubkey.toString()} - ${error.message}`)
            return false
          }
        })
      
      console.log(`📊 Found ${verifiedPoolAccounts.length} verified pool accounts`)
      
      // Use verified pool accounts instead of all accounts
      allPoolAccounts = verifiedPoolAccounts
      
      console.log(`📊 Found ${allPoolAccounts.length} total pool accounts (${programAccounts.length} standard + ${extendedAccounts.length} extended)`)
      
      // Check if the specific pool we're looking for is in the list
      const targetPoolAddress = 'FWruJDYHvdGxN5CPwVMm3sZkhx5BvLcvdS5H1Bz2pWjy'
      const foundTargetPool = allPoolAccounts.find(account => account.pubkey.toString() === targetPoolAddress)
      
      if (foundTargetPool) {
        console.log(`🎯 Found target pool: ${targetPoolAddress}`)
        console.log(`📏 Target pool data size: ${foundTargetPool.account.data.length} bytes`)
      } else {
        console.log(`❌ Target pool not found: ${targetPoolAddress}`)
        console.log('💡 This could mean:')
        console.log('   - Pool is still being confirmed on blockchain')
        console.log('   - Pool has a different data structure')
        console.log('   - Pool was created in a different way')
      }
      
      if (allPoolAccounts.length === 0) {
        console.log('ℹ️ No pools found - smart contract has no program accounts yet')
        console.log('💡 This could mean:')
        console.log('   - The smart contract is new and no pools have been created yet')
        console.log('   - The data size filter might be incorrect')
        console.log('   - Rate limiting prevented proper data fetching')
        return []
      }
      
      const realPools: SmartContractPool[] = []
      
      for (let i = 0; i < allPoolAccounts.length; i++) {
        const account = allPoolAccounts[i]
        
        // Add delay between pool processing to avoid rate limiting
        if (i > 0) {
          await delay(200) // 200ms delay between pool processing
        }
        
        try {
          const poolAddress = account.pubkey
          const accountData = account.account.data
          
          console.log(`📝 Parsing pool at ${poolAddress.toString()}`)
          console.log(`📊 Account data length: ${accountData.length} bytes`)
          
          if (accountData.length < 72) {
            console.warn(`⚠️ Pool account data too small: ${accountData.length} bytes`)
            continue
          }
          
          // Extract token mint and quote mint from account data
          // Based on BoundPool struct layout:
          // - 8 bytes: Anchor discriminator
          // - meme_reserve: Reserve { tokens: u64, mint: Pubkey, vault: Pubkey } = 72 bytes
          // - quote_reserve: Reserve { tokens: u64, mint: Pubkey, vault: Pubkey } = 72 bytes
          // So token mints are at:
          // - Meme token mint: bytes 16-48 (after discriminator + tokens)
          // - Quote token mint: bytes 88-120 (after first reserve + second reserve tokens)
          let tokenMintBytes: Uint8Array, quoteMintBytes: Uint8Array
          
          if (accountData.length === 394) {
            // 394-byte pool account structure (real pools)
            console.log(`🔍 Parsing 394-byte pool account`)
            tokenMintBytes = accountData.slice(16, 48)  // meme_reserve.mint
            quoteMintBytes = accountData.slice(88, 120) // quote_reserve.mint
          } else {
            console.warn(`⚠️ Not a pool account: ${accountData.length} bytes (expected 394)`)
            continue
          }
          
          const tokenMint = new PublicKey(tokenMintBytes)
          const quoteMint = new PublicKey(quoteMintBytes)
          
          console.log(`🔧 Extracted mints: token=${tokenMint.toString()}, quote=${quoteMint.toString()}`)
          console.log(`🔍 Raw bytes - token: ${Array.from(tokenMintBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`)
          console.log(`🔍 Raw bytes - quote: ${Array.from(quoteMintBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`)
          
          // Check if this is our target token
          const targetTokenMint = '3yM2RBsuhvPbhonyS4u7f9uFQGRjmbsFt36awc5p9Uga'
          if (tokenMint.toString() === targetTokenMint) {
            console.log(`🎯 Found target token: ${targetTokenMint}`)
            console.log(`📝 Pool address: ${poolAddress.toString()}`)
            console.log(`📏 Account data size: ${accountData.length} bytes`)
          }
          
          // Fetch token metadata from on-chain
          let tokenName: string | undefined
          let tokenSymbol: string | undefined
          
          console.log(`🔍 Fetching metadata for token: ${tokenMint.toString()}`)
          try {
            const metadata = await fetchTokenMetadata(connection, tokenMint)
            if (metadata) {
              tokenName = metadata.name
              tokenSymbol = metadata.symbol
              console.log(`✅ Blockchain metadata found: ${tokenName} (${tokenSymbol})`)
            } else {
              console.log(`❌ No blockchain metadata found for token: ${tokenMint.toString()}`)
              console.log(`💡 This indicates:`)
              console.log(`   - Token metadata was never created during token minting`)
              console.log(`   - Metadata creation transaction failed`)
              console.log(`   - Token does not have proper metadata setup`)
              // No fallback names - let tokenName and tokenSymbol remain undefined
            }
          } catch (error) {
            console.error(`❌ Error fetching token metadata for ${tokenMint.toString()}:`, error)
            // No fallback names - let tokenName and tokenSymbol remain undefined
          }
          
          // Derive pool signer PDA
          const [poolSigner] = PublicKey.findProgramAddressSync(
            [Buffer.from('signer'), poolAddress.toBuffer()],
            SMART_CONTRACT_ADDRESS
          )
          
          // Calculate vault addresses
          const memeVault = getAssociatedTokenAddressSync(tokenMint, poolSigner, true)
          const quoteVault = getAssociatedTokenAddressSync(quoteMint, poolSigner, true)
          
          // Get actual vault balances from blockchain
          let solBalance = 0
          let tokenBalance = 0
          
          try {
            const quoteVaultInfo = await rateLimitedRequest((conn) =>
              conn.getParsedAccountInfo(quoteVault)
            )
            if (quoteVaultInfo.value?.data && 'parsed' in quoteVaultInfo.value.data) {
              solBalance = quoteVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
            }
            console.log(`💰 Real SOL balance: ${solBalance}`)
          } catch (error) {
            console.warn(`Could not fetch quote vault balance for ${poolAddress.toString()}`)
          }
          
          try {
            const memeVaultInfo = await rateLimitedRequest((conn) =>
              conn.getParsedAccountInfo(memeVault)
            )
            if (memeVaultInfo.value?.data && 'parsed' in memeVaultInfo.value.data) {
              tokenBalance = memeVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
            }
            console.log(`🪙 Real token balance: ${tokenBalance}`)
          } catch (error) {
            console.warn(`Could not fetch meme vault balance for ${poolAddress.toString()}`)
          }
          
          // Get token supply from mint
          let totalSupply = 0
          
          try {
            const mintInfo = await rateLimitedRequest((conn) =>
              conn.getParsedAccountInfo(tokenMint)
            )
            if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
              totalSupply = mintInfo.value.data.parsed.info.supply
            }
          } catch (error) {
            console.warn(`Could not fetch token info for ${tokenMint.toString()}`)
          }
          
          // Derive target config PDA
          const [targetConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from('config'), quoteMint.toBuffer(), tokenMint.toBuffer()],
            SMART_CONTRACT_ADDRESS
          )
          
          // Parse additional data from account buffer (adjust offsets for your struct)
          const isActive = tokenBalance > 0
          const migrationThreshold = Math.floor(totalSupply * 0.8) // 80% threshold
          const createdAt = Date.now() // Would parse from account data
          
          // Extract creator pubkey (adjust offset based on your struct)
          let creator: PublicKey
          try {
            creator = new PublicKey(Buffer.from(accountData.slice(72, 104)))
          } catch {
            creator = new PublicKey('11111111111111111111111111111111') // Fallback
          }
          
          const realPool: SmartContractPool = {
            poolAddress,
            poolSigner,
            tokenMint,
            quoteMint,
            memeVault,
            quoteVault,
            targetConfig,
            tokenName,
            tokenSymbol,
            isActive,
            solBalance,
            tokenBalance,
            totalSupply,
            migrationThreshold,
            createdAt,
            creator
          }
          
          realPools.push(realPool)
          console.log(`✅ Successfully parsed real pool: ${tokenName} (${tokenSymbol})`)
          
        } catch (poolError) {
          console.error(`❌ Error parsing pool ${account.pubkey.toString()}:`, poolError)
        }
      }
      
      console.log(`✅ Successfully parsed ${realPools.length} real pools from smart contract`)
      console.log(`📊 Total tokens found: ${realPools.length}`)
      
      if (realPools.length > 0) {
        console.log('🎯 Tokens found:')
        realPools.forEach((pool, index) => {
          console.log(`   ${index + 1}. ${pool.tokenName || 'Unknown'} (${pool.tokenSymbol || 'UNKNOWN'}) - ${pool.poolAddress.toString().slice(0, 8)}...`)
        })
      }
      
      return realPools
      
    } catch (error) {
      console.error('❌ Error fetching real pools from smart contract:', error)
      throw error
    }
  }, [connection])

  // Fetch real transaction activity from blockchain
  const fetchRealActivity = useCallback(async () => {
    console.log('📈 Fetching real smart contract activity...')
    
    try {
      const signatures = await rateLimitedRequest((conn) => 
        conn.getSignaturesForAddress(SMART_CONTRACT_ADDRESS, { limit: 50 })
      )
      
      console.log(`📊 Found ${signatures.length} transactions`)
      
      if (signatures.length === 0) {
        console.log('ℹ️ No transaction history found for smart contract')
        return { activities: [], traders: new Set(), totalVolume: 0 }
      }
      
      const activities: ContractActivity[] = []
      const traders = new Set<string>()
      let totalVolume = 0
      
      // Process transactions with rate limiting - only process first 10 to reduce load
      for (let i = 0; i < Math.min(10, signatures.length); i++) {
        const sigInfo = signatures[i]
        
        try {
          // Add delay between requests to avoid rate limiting
          if (i > 0) {
            await delay(500) // 500ms delay between requests
          }
          
          const tx = await rateLimitedRequest((conn) =>
            conn.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            })
          )
          
          if (tx?.meta && !tx.meta.err) {
            // Parse transaction to extract activity
            const instruction = tx.transaction.message.instructions[0]
            
            if (instruction && 'programId' in instruction && 
                instruction.programId.toString() === SMART_CONTRACT_ADDRESS.toString()) {
              
              // Get the user (transaction signer)
              const userAccount = tx.transaction.message.accountKeys.find(acc => acc.signer)
              const user = userAccount?.pubkey.toString() || 'Unknown'
              
              if (user !== 'Unknown') {
                traders.add(user)
              }
              
              // Calculate amount from balance changes
              const balanceChange = Math.abs(
                (tx.meta.preBalances[0] || 0) - (tx.meta.postBalances[0] || 0)
              )
              const amount = balanceChange / LAMPORTS_PER_SOL
              totalVolume += amount
              
              // Determine activity type from transaction logs
              const logs = tx.meta.logMessages || []
              let activityType: ContractActivity['type'] = 'swap_buy'
              
              if (logs.some(log => log.includes('CreatePool') || log.includes('InitializePool'))) {
                activityType = 'pool_created'
              } else if (logs.some(log => log.includes('SellTokens') || log.includes('SwapSell'))) {
                activityType = 'swap_sell'
              } else if (logs.some(log => log.includes('BuyTokens') || log.includes('SwapBuy'))) {
                activityType = 'swap_buy'
              } else if (logs.some(log => log.includes('MigratePool') || log.includes('Migration'))) {
                activityType = 'migration'
              }
              
              // Extract pool address from instruction accounts
              const poolAddress = 'accounts' in instruction && instruction.accounts?.[0]?.toString() || 'Unknown'
              
              activities.push({
                type: activityType,
                poolAddress,
                user: user.slice(0, 4) + '...' + user.slice(-4),
                amount,
                timestamp: sigInfo.blockTime || Date.now() / 1000,
                signature: sigInfo.signature,
                tokenSymbol: 'TOKEN' // Would extract from instruction data
              })
            }
          }
        } catch (txError) {
          console.warn('Could not parse transaction:', txError)
        }
      }
      
      console.log(`✅ Fetched ${activities.length} real activities, ${traders.size} unique traders, ${totalVolume.toFixed(4)} SOL volume`)
      
      return { activities, traders, totalVolume }
      
    } catch (error) {
      console.error('❌ Error fetching real contract activity:', error)
      throw error
    }
  }, [connection])

  // Main refresh function with fallback to demo data
  const refreshContractData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Attempting to fetch real smart contract data...')
      
      // First verify smart contract exists
      await checkSmartContract()
      
      // Fetch real pools and activity sequentially to avoid overwhelming the RPC
      console.log('🔄 Fetching pools first...')
      const realPools = await fetchRealPools()
      
      // Add delay between major requests
      await delay(2000) // Increased delay
      
      console.log('🔄 Fetching activity data...')
      const activityData = await fetchRealActivity()
      
      setPools(realPools)
      
      // Calculate metrics from real blockchain data
      const migrated = realPools.filter(pool => 
        pool.tokenBalance <= (pool.totalSupply - pool.migrationThreshold)
      ).length
      
      const migrationRate = realPools.length > 0 
        ? (migrated / realPools.length) * 100 
        : 0
      
      setMetrics({
        totalPools: realPools.length,
        totalVolume: activityData.totalVolume,
        activeTraders: activityData.traders as Set<string>,
        migrationSuccessRate: migrationRate,
        recentActivities: activityData.activities
      })
      
      console.log('✅ Real smart contract data refresh completed:', {
        pools: realPools.length,
        volume: activityData.totalVolume,
        traders: activityData.traders.size,
        activities: activityData.activities.length,
        migrationRate: migrationRate.toFixed(1) + '%'
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Failed to fetch real contract data, using demo data:', errorMessage)
      setError(`Rate limited - showing demo data: ${errorMessage}`)
      
      // Use demo data as fallback
      const demoData = generateDemoData()
      setPools(demoData.pools)
      setMetrics(demoData.metrics)
      
      console.log('🎭 Demo data loaded successfully:', {
        pools: demoData.pools.length,
        volume: demoData.metrics.totalVolume,
        traders: demoData.metrics.activeTraders.size,
        activities: demoData.metrics.recentActivities.length
      })
    } finally {
      setIsLoading(false)
    }
  }, [checkSmartContract, fetchRealPools, fetchRealActivity])

  // Auto-refresh every 2 minutes to avoid rate limiting
  useEffect(() => {
    refreshContractData()
    
    const interval = setInterval(refreshContractData, 120000) // 2 minutes instead of 30 seconds
    return () => clearInterval(interval)
  }, [refreshContractData])

  return {
    pools,
    metrics,
    isLoading,
    error,
    refreshContractData
  }
}