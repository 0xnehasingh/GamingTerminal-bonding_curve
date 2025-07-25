import { Connection, PublicKey } from '@solana/web3.js'
import { SMART_CONTRACT_ADDRESS, RPC_ENDPOINTS } from './solana-config'

interface TestResult {
  testName: string
  success: boolean
  data?: any
  error?: string
  duration: number
}

interface PoolTestData {
  poolAddress: string
  accountSize: number
  tokenMint: string
  quoteMint: string
  hasValidMints: boolean
  tokenName?: string
  tokenSymbol?: string
  totalSupply?: number
  decimals?: number
}

export class SmartContractTester {
  private connection: Connection
  private results: TestResult[] = []

  constructor(endpointIndex = 0) {
    this.connection = new Connection(RPC_ENDPOINTS[endpointIndex], 'confirmed')
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Smart Contract Tests...')
    console.log('📍 Contract Address:', SMART_CONTRACT_ADDRESS.toString())
    console.log('🌐 RPC Endpoint:', this.connection.rpcEndpoint)
    console.log('')

    this.results = []

    // Run all tests
    await this.testContractExistence()
    await this.testProgramAccounts()
    await this.testPoolDataStructures()
    await this.testTokenMetadata()
    await this.testVaultBalances()
    await this.testTransactionHistory()

    return this.results
  }

  private async testContractExistence(): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Test 1: Contract Existence')
      
      const accountInfo = await this.connection.getAccountInfo(SMART_CONTRACT_ADDRESS)
      
      if (!accountInfo) {
        throw new Error('Contract not found')
      }

      if (!accountInfo.executable) {
        throw new Error('Account exists but is not executable')
      }

      const result: TestResult = {
        testName: 'Contract Existence',
        success: true,
        data: {
          executable: accountInfo.executable,
          owner: accountInfo.owner.toString(),
          lamports: accountInfo.lamports,
          dataLength: accountInfo.data.length
        },
        duration: Date.now() - startTime
      }

      console.log('✅ Contract exists and is executable')
      console.log('   - Owner:', accountInfo.owner.toString())
      console.log('   - Data length:', accountInfo.data.length, 'bytes')
      console.log('   - Lamports:', accountInfo.lamports)
      console.log('')

      this.results.push(result)

    } catch (error) {
      const result: TestResult = {
        testName: 'Contract Existence',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      console.log('❌ Contract test failed:', result.error)
      console.log('')

      this.results.push(result)
    }
  }

  private async testProgramAccounts(): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Test 2: Program Accounts Discovery')
      
      // Test different account sizes
      const accountSizes = [80, 394, 200, 300, 400]
      const allAccounts: any[] = []

      for (const size of accountSizes) {
        try {
          const accounts = await this.connection.getProgramAccounts(SMART_CONTRACT_ADDRESS, {
            commitment: 'confirmed',
            filters: [{ dataSize: size }]
          })
          
          if (accounts.length > 0) {
            console.log(`   📊 Found ${accounts.length} accounts with size ${size} bytes`)
            allAccounts.push(...accounts)
          }
        } catch (error) {
          console.log(`   ⚠️ Error fetching ${size}-byte accounts:`, error instanceof Error ? error.message : 'Unknown error')
        }
      }

      const result: TestResult = {
        testName: 'Program Accounts Discovery',
        success: allAccounts.length > 0,
        data: {
          totalAccounts: allAccounts.length,
          accountSizes: [...new Set(allAccounts.map(acc => acc.account.data.length))].sort((a, b) => a - b)
        },
        duration: Date.now() - startTime
      }

      if (allAccounts.length > 0) {
        console.log('✅ Found program accounts')
        console.log('   - Total accounts:', allAccounts.length)
        console.log('   - Account sizes:', result.data.accountSizes)
      } else {
        console.log('⚠️ No program accounts found')
      }
      console.log('')

      this.results.push(result)

    } catch (error) {
      const result: TestResult = {
        testName: 'Program Accounts Discovery',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      console.log('❌ Program accounts test failed:', result.error)
      console.log('')

      this.results.push(result)
    }
  }

  private async testPoolDataStructures(): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Test 3: Pool Data Structure Analysis')
      
      // Get accounts with common pool sizes
      const poolAccounts = await this.connection.getProgramAccounts(SMART_CONTRACT_ADDRESS, {
        commitment: 'confirmed',
        filters: [
          { dataSize: 80 },  // Standard pool size
          { dataSize: 394 }  // Extended pool size
        ]
      })

      if (poolAccounts.length === 0) {
        throw new Error('No pool accounts found')
      }

      const poolData: PoolTestData[] = []

      for (const account of poolAccounts.slice(0, 5)) { // Test first 5 pools
        const accountData = account.account.data
        const poolAddress = account.pubkey.toString()

        console.log(`   📝 Analyzing pool: ${poolAddress}`)
        console.log(`   📊 Data length: ${accountData.length} bytes`)

        // Extract token mints for 394-byte pool accounts
        if (accountData.length === 394) {
          const tokenMintBytes = accountData.slice(16, 48)  // meme_reserve.mint
          const quoteMintBytes = accountData.slice(88, 120) // quote_reserve.mint

          try {
            const tokenMint = new PublicKey(tokenMintBytes)
            const quoteMint = new PublicKey(quoteMintBytes)

            const poolInfo: PoolTestData = {
              poolAddress,
              accountSize: accountData.length,
              tokenMint: tokenMint.toString(),
              quoteMint: quoteMint.toString(),
              hasValidMints: true
            }

            poolData.push(poolInfo)

            console.log(`   🪙 Token Mint: ${tokenMint.toString()}`)
            console.log(`   💰 Quote Mint: ${quoteMint.toString()}`)

            // Try to get token metadata
            try {
              const tokenInfo = await this.connection.getParsedAccountInfo(tokenMint)
              if (tokenInfo.value?.data && 'parsed' in tokenInfo.value.data) {
                const parsed = tokenInfo.value.data.parsed
                poolInfo.totalSupply = parsed.info.supply
                poolInfo.decimals = parsed.info.decimals
                
                console.log(`   📈 Total Supply: ${parsed.info.supply}`)
                console.log(`   🔢 Decimals: ${parsed.info.decimals}`)
              }
            } catch (error) {
              console.log(`   ⚠️ Could not fetch token metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }

          } catch (error) {
            console.log(`   ❌ Invalid mint addresses: ${error instanceof Error ? error.message : 'Unknown error'}`)
            poolData.push({
              poolAddress,
              accountSize: accountData.length,
              tokenMint: 'Invalid',
              quoteMint: 'Invalid',
              hasValidMints: false
            })
          }
        } else {
          console.log(`   ⚠️ Not a pool account: ${accountData.length} bytes (expected 394)`)
        }

        console.log('')
      }

      const result: TestResult = {
        testName: 'Pool Data Structure Analysis',
        success: poolData.some(pool => pool.hasValidMints),
        data: {
          totalPools: poolData.length,
          validPools: poolData.filter(pool => pool.hasValidMints).length,
          poolData
        },
        duration: Date.now() - startTime
      }

      console.log('✅ Pool structure analysis complete')
      console.log(`   - Valid pools: ${result.data.validPools}/${result.data.totalPools}`)
      console.log('')

      this.results.push(result)

    } catch (error) {
      const result: TestResult = {
        testName: 'Pool Data Structure Analysis',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      console.log('❌ Pool structure test failed:', result.error)
      console.log('')

      this.results.push(result)
    }
  }

  private async testTokenMetadata(): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Test 4: Token Metadata Fetching')
      
      // Get a sample pool to test token metadata
      const poolAccounts = await this.connection.getProgramAccounts(SMART_CONTRACT_ADDRESS, {
        commitment: 'confirmed',
        filters: [{ dataSize: 80 }]
      })

      if (poolAccounts.length === 0) {
        throw new Error('No pools available for metadata testing')
      }

      const samplePool = poolAccounts[0]
      const accountData = samplePool.account.data

      if (accountData.length < 72) {
        throw new Error('Sample pool data too small')
      }

      const tokenMintBytes = accountData.slice(8, 40)
      const tokenMint = new PublicKey(tokenMintBytes)

      console.log(`   🪙 Testing token: ${tokenMint.toString()}`)

      // Get token account info
      const tokenInfo = await this.connection.getParsedAccountInfo(tokenMint)
      
      if (!tokenInfo.value?.data || !('parsed' in tokenInfo.value.data)) {
        throw new Error('Token account not found or not parseable')
      }

      const parsed = tokenInfo.value.data.parsed
      
      console.log(`   📊 Token Info:`)
      console.log(`      - Supply: ${parsed.info.supply}`)
      console.log(`      - Decimals: ${parsed.info.decimals}`)
      console.log(`      - Mint Authority: ${parsed.info.mintAuthority || 'None'}`)
      console.log(`      - Freeze Authority: ${parsed.info.freezeAuthority || 'None'}`)

      // Try to get Metaplex metadata (if available)
      try {
        const metadataAddress = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
            tokenMint.toBuffer()
          ],
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
        )[0]

        const metadataInfo = await this.connection.getAccountInfo(metadataAddress)
        
        if (metadataInfo) {
          console.log(`   🏷️ Metaplex metadata found at: ${metadataAddress.toString()}`)
          console.log(`   📏 Metadata size: ${metadataInfo.data.length} bytes`)
        } else {
          console.log(`   ⚠️ No Metaplex metadata found`)
        }
      } catch (error) {
        console.log(`   ⚠️ Could not check Metaplex metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      const result: TestResult = {
        testName: 'Token Metadata Fetching',
        success: true,
        data: {
          tokenMint: tokenMint.toString(),
          supply: parsed.info.supply,
          decimals: parsed.info.decimals,
          mintAuthority: parsed.info.mintAuthority,
          freezeAuthority: parsed.info.freezeAuthority
        },
        duration: Date.now() - startTime
      }

      console.log('✅ Token metadata test complete')
      console.log('')

      this.results.push(result)

    } catch (error) {
      const result: TestResult = {
        testName: 'Token Metadata Fetching',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      console.log('❌ Token metadata test failed:', result.error)
      console.log('')

      this.results.push(result)
    }
  }

  private async testVaultBalances(): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Test 5: Vault Balance Fetching')
      
      // Get a sample pool
      const poolAccounts = await this.connection.getProgramAccounts(SMART_CONTRACT_ADDRESS, {
        commitment: 'confirmed',
        filters: [{ dataSize: 80 }]
      })

      if (poolAccounts.length === 0) {
        throw new Error('No pools available for vault testing')
      }

      const samplePool = poolAccounts[0]
      const accountData = samplePool.account.data

      if (accountData.length < 72) {
        throw new Error('Sample pool data too small')
      }

      const tokenMintBytes = accountData.slice(8, 40)
      const quoteMintBytes = accountData.slice(40, 72)

      const tokenMint = new PublicKey(tokenMintBytes)
      const quoteMint = new PublicKey(quoteMintBytes)

      console.log(`   🪙 Token: ${tokenMint.toString()}`)
      console.log(`   💰 Quote: ${quoteMint.toString()}`)

      // Derive pool signer PDA
      const [poolSigner] = PublicKey.findProgramAddressSync(
        [Buffer.from('signer'), samplePool.pubkey.toBuffer()],
        SMART_CONTRACT_ADDRESS
      )

      console.log(`   🔑 Pool Signer: ${poolSigner.toString()}`)

      // Calculate vault addresses
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
      const memeVault = getAssociatedTokenAddressSync(tokenMint, poolSigner, true)
      const quoteVault = getAssociatedTokenAddressSync(quoteMint, poolSigner, true)

      console.log(`   🏦 Meme Vault: ${memeVault.toString()}`)
      console.log(`   🏦 Quote Vault: ${quoteVault.toString()}`)

      // Check vault balances
      let memeBalance = 0
      let quoteBalance = 0

      try {
        const memeVaultInfo = await this.connection.getParsedAccountInfo(memeVault)
        if (memeVaultInfo.value?.data && 'parsed' in memeVaultInfo.value.data) {
          memeBalance = memeVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
          console.log(`   🪙 Meme Token Balance: ${memeBalance}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Could not fetch meme vault balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      try {
        const quoteVaultInfo = await this.connection.getParsedAccountInfo(quoteVault)
        if (quoteVaultInfo.value?.data && 'parsed' in quoteVaultInfo.value.data) {
          quoteBalance = quoteVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0
          console.log(`   💰 Quote Token Balance: ${quoteBalance}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Could not fetch quote vault balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      const result: TestResult = {
        testName: 'Vault Balance Fetching',
        success: true,
        data: {
          poolSigner: poolSigner.toString(),
          memeVault: memeVault.toString(),
          quoteVault: quoteVault.toString(),
          memeBalance,
          quoteBalance
        },
        duration: Date.now() - startTime
      }

      console.log('✅ Vault balance test complete')
      console.log('')

      this.results.push(result)

    } catch (error) {
      const result: TestResult = {
        testName: 'Vault Balance Fetching',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      console.log('❌ Vault balance test failed:', result.error)
      console.log('')

      this.results.push(result)
    }
  }

  private async testTransactionHistory(): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('🔍 Test 6: Transaction History')
      
      const signatures = await this.connection.getSignaturesForAddress(
        SMART_CONTRACT_ADDRESS,
        { limit: 10 }
      )

      console.log(`   📊 Found ${signatures.length} recent transactions`)

      if (signatures.length === 0) {
        console.log('   ℹ️ No transaction history found')
      } else {
        console.log('   📝 Recent transactions:')
        for (let i = 0; i < Math.min(5, signatures.length); i++) {
          const sig = signatures[i]
          console.log(`      ${i + 1}. ${sig.signature} (${sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'Unknown time'})`)
        }
      }

      const result: TestResult = {
        testName: 'Transaction History',
        success: true,
        data: {
          totalTransactions: signatures.length,
          recentSignatures: signatures.slice(0, 5).map(sig => sig.signature)
        },
        duration: Date.now() - startTime
      }

      console.log('✅ Transaction history test complete')
      console.log('')

      this.results.push(result)

    } catch (error) {
      const result: TestResult = {
        testName: 'Transaction History',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      console.log('❌ Transaction history test failed:', result.error)
      console.log('')

      this.results.push(result)
    }
  }

  printSummary(): void {
    console.log('📊 Test Summary')
    console.log('=' * 50)
    
    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log('')

    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${result.testName} (${result.duration}ms)`)
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })

    console.log('')
    console.log(`Overall Status: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  }
}

// Export a simple test runner
export async function runSmartContractTests(endpointIndex = 0): Promise<TestResult[]> {
  const tester = new SmartContractTester(endpointIndex)
  const results = await tester.runAllTests()
  tester.printSummary()
  return results
} 