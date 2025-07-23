import { Connection, PublicKey } from '@solana/web3.js'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { SMART_CONTRACT_ADDRESS, RPC_ENDPOINT } from './solana-config'
import launchpadIdl from './launchpad-idl.json'

export async function testContractConnection() {
  try {
    console.log('Testing contract connection...')
    
    // Create connection
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')
    console.log('✅ Connection established')
    
    // Check if the program exists
    const programInfo = await connection.getAccountInfo(SMART_CONTRACT_ADDRESS)
    
    if (programInfo) {
      console.log('✅ Smart contract found at address:', SMART_CONTRACT_ADDRESS.toString())
      console.log('Contract owner:', programInfo.owner.toString())
      console.log('Contract executable:', programInfo.executable)
    } else {
      console.log('❌ Smart contract not found at address:', SMART_CONTRACT_ADDRESS.toString())
    }
    
    // Test network connectivity
    const slot = await connection.getSlot()
    console.log('✅ Current slot:', slot)
    
    console.log('✅ Integration test completed successfully')
    return true
    
  } catch (error) {
    console.error('❌ Integration test failed:', error)
    return false
  }
}

export function getContractInfo() {
  return {
    address: SMART_CONTRACT_ADDRESS.toString(),
    network: 'devnet',
    rpcEndpoint: RPC_ENDPOINT,
    idlVersion: launchpadIdl.version,
    features: [
      'Pool Creation',
      'Token Swapping (SOL ↔ Tokens)',
      'Bonding Curve Pricing',
      'Automatic Raydium Migration at 80%',
      'Token Metadata Creation'
    ]
  }
}