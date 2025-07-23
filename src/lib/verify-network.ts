import { Connection } from '@solana/web3.js'

export async function verifyNetworkConnection(connection: Connection) {
  try {
    console.log('🔗 Verifying network connection...')
    console.log('RPC Endpoint:', connection.rpcEndpoint)
    
    // Test basic connectivity
    const slot = await connection.getSlot()
    console.log('✅ Connected to network, current slot:', slot)
    
    // Check if it's devnet by looking at genesis hash or cluster nodes
    const genesisHash = await connection.getGenesisHash()
    console.log('Genesis Hash:', genesisHash)
    
    // Devnet genesis hash (this can change but helps identify network)
    const isLikelyDevnet = connection.rpcEndpoint.includes('devnet') || 
                          connection.rpcEndpoint.includes('api.devnet.solana.com')
    
    console.log('Is Devnet:', isLikelyDevnet)
    
    if (!isLikelyDevnet) {
      console.warn('⚠️ Warning: Not connected to devnet! Your wallet should be on devnet.')
      console.log('Expected: https://api.devnet.solana.com')
      console.log('Actual:', connection.rpcEndpoint)
    }
    
    return {
      connected: true,
      slot,
      genesisHash,
      isDevnet: isLikelyDevnet,
      endpoint: connection.rpcEndpoint
    }
  } catch (error) {
    console.error('❌ Network verification failed:', error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export function getNetworkInstructions() {
  return `
🔧 How to Switch to Solana Devnet:

For Phantom Wallet:
1. Open Phantom wallet
2. Click settings (gear icon)
3. Go to "Developer Settings"
4. Enable "Testnet Mode"
5. Select "Devnet" from network dropdown
6. Refresh the browser page

For Solflare Wallet:
1. Open Solflare wallet
2. Click the network dropdown (usually shows "Mainnet")
3. Select "Devnet"
4. Refresh the browser page

After switching:
1. Get devnet SOL from https://faucet.solana.com
2. Refresh this page
3. Try connecting your wallet again
`
}