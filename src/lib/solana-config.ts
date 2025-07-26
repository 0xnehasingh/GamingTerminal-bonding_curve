import { PublicKey, Connection } from '@solana/web3.js'
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'

// Load environment variables only in Node.js environment
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  try {
    const dotenv = require('dotenv')
    dotenv.config()
  } catch (error) {
    console.warn('dotenv not available in this environment')
  }
}

export const SMART_CONTRACT_ADDRESS = new PublicKey('ip6SLxttjbSrQggmM2SH5RZXhWKq3onmkzj3kExoceN')

export const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet'

// Multiple RPC endpoints for fallback
export const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT 
]

export const PRIMARY_RPC_ENDPOINT = RPC_ENDPOINTS[0]

// Metaplex Token Metadata Program ID
export const NEXT_PUBLIC_METAPLEX_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_METAPLEX_PROGRAM_ID 
)

// Connection with better rate limiting configuration
export const getConnection = (endpointIndex = 0) => {
  const endpoint = RPC_ENDPOINTS[endpointIndex] || PRIMARY_RPC_ENDPOINT
  
  return new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    disableRetryOnRateLimit: false, // Enable retry on rate limit
    httpHeaders: {
      'Content-Type': 'application/json',
    }
  })
}

// Connection factory that can switch endpoints on rate limiting
export const getConnectionWithFallback = () => {
  let currentEndpointIndex = 0
  
  const createConnection = () => {
    return getConnection(currentEndpointIndex)
  }
  
  const switchEndpoint = () => {
    currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length
    console.log(`🔄 Switching to RPC endpoint ${currentEndpointIndex + 1}: ${RPC_ENDPOINTS[currentEndpointIndex]}`)
    return createConnection()
  }
  
  return {
    createConnection,
    switchEndpoint,
    getCurrentEndpoint: () => RPC_ENDPOINTS[currentEndpointIndex]
  }
}

export const getProgram = (provider: AnchorProvider, idl: Idl) => {
  return new Program(idl, SMART_CONTRACT_ADDRESS, provider)
}

export const createProvider = (connection: Connection, wallet: any) => {
  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
}