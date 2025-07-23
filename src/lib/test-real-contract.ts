import { Connection, PublicKey } from '@solana/web3.js'
import { SMART_CONTRACT_ADDRESS, RPC_ENDPOINT } from './solana-config'

export async function testRealContract() {
  console.log('🧪 Testing Real Contract Integration...')
  console.log('Contract Address:', SMART_CONTRACT_ADDRESS.toString())
  console.log('RPC Endpoint:', RPC_ENDPOINT)
  
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')
    
    // Test 1: Check if contract exists
    console.log('\n1️⃣ Checking if contract exists...')
    const programInfo = await connection.getAccountInfo(SMART_CONTRACT_ADDRESS)
    
    if (programInfo) {
      console.log('✅ Contract found!')
      console.log('   Owner:', programInfo.owner.toString())
      console.log('   Executable:', programInfo.executable)
      console.log('   Data Length:', programInfo.data.length)
    } else {
      console.log('❌ Contract not found at address:', SMART_CONTRACT_ADDRESS.toString())
      console.log('   Make sure the contract is deployed to Solana devnet')
      return false
    }
    
    // Test 2: Check network connectivity
    console.log('\n2️⃣ Testing network connectivity...')
    const slot = await connection.getSlot()
    console.log('✅ Connected to Solana devnet')
    console.log('   Current slot:', slot)
    
    // Test 3: Check WSOL mint exists (used as base token)
    console.log('\n3️⃣ Checking WSOL mint...')
    const wsolMint = new PublicKey('So11111111111111111111111111111111111111112')
    const wsolInfo = await connection.getAccountInfo(wsolMint)
    
    if (wsolInfo) {
      console.log('✅ WSOL mint found')
    } else {
      console.log('❌ WSOL mint not found')
      return false
    }
    
    console.log('\n🎉 All tests passed! Contract integration is ready.')
    console.log('\n📋 Next Steps:')
    console.log('   1. Connect your wallet on the frontend')
    console.log('   2. Make sure you have some devnet SOL')
    console.log('   3. Try creating a pool')
    console.log('   4. Check browser console for transaction signatures')
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Usage instructions
export const USAGE_INSTRUCTIONS = `
🚀 Real Contract Integration is Active!

Your smart contract (${SMART_CONTRACT_ADDRESS.toString()}) is now integrated with the frontend.

HOW TO TEST:

1. 💰 Get Devnet SOL:
   - Visit https://faucet.solana.com
   - Enter your wallet address
   - Request devnet SOL

2. 🔗 Connect Your Wallet:
   - Go to http://localhost:3000/create
   - Connect Phantom or Solflare wallet
   - Make sure you're on Solana devnet

3. 🏊 Create a Pool:
   - Fill out the pool creation form
   - Click "Create Pool"
   - Approve the transactions in your wallet
   - Check browser console for transaction signatures

4. 💱 Test Trading:
   - Go to http://localhost:3000/trading
   - Try swapping between SOL and tokens
   - Each transaction will be real on devnet

WHAT HAPPENS:
- ✅ Real token mints are created
- ✅ Real pools are created on-chain
- ✅ Real transactions are submitted
- ✅ Transaction signatures are logged to console
- ✅ All interactions are with your deployed contract

TROUBLESHOOTING:
- If transactions fail, check you have enough devnet SOL
- If program errors occur, verify your contract is deployed correctly
- Check browser console for detailed error messages
`