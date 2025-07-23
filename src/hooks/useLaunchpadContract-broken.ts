import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, Keypair, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { useMemo } from 'react'
import { SMART_CONTRACT_ADDRESS, createProvider } from '@/lib/solana-config'
import launchpadIdl from '@/lib/launchpad-real-idl.json'

export const useLaunchpadContract = () => {
  const { connection } = useConnection()
  const wallet = useWallet()

  const provider = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey) {
      console.log('❌ Provider: Wallet not connected or no public key')
      return null
    }
    
    try {
      const prov = createProvider(connection, wallet)
      console.log('✅ Provider created successfully')
      return prov
    } catch (error) {
      console.error('❌ Provider creation failed:', error)
      return null
    }
  }, [connection, wallet.connected, wallet.publicKey])

  const program = useMemo(() => {
    if (!provider) {
      console.log('❌ Program: No provider available')
      return null
    }
    
    try {
      // Try to create program with simplified IDL
      const simplifiedIdl = {
        ...launchpadIdl,
        metadata: {
          address: SMART_CONTRACT_ADDRESS.toString()
        }
      }
      
      console.log('🔧 Attempting program initialization with IDL:', simplifiedIdl.name)
      const prog = new Program(simplifiedIdl as any, SMART_CONTRACT_ADDRESS, provider)
      console.log('✅ Program initialized successfully with address:', SMART_CONTRACT_ADDRESS.toString())
      return prog
    } catch (error) {
      console.error('❌ Program initialization failed:', error)
      console.log('🔄 Trying fallback approach without IDL validation...')
      
      // Fallback: Create a minimal program that can still make basic calls
      try {
        const minimalIdl = {
          version: "0.1.0",
          name: "launchpad", 
          instructions: [],
          accounts: [],
          metadata: {
            address: SMART_CONTRACT_ADDRESS.toString()
          }
        }
        
        const fallbackProg = new Program(minimalIdl as any, SMART_CONTRACT_ADDRESS, provider)
        console.log('⚠️ Using fallback program initialization')
        return fallbackProg
      } catch (fallbackError) {
        console.error('❌ Fallback program initialization also failed:', fallbackError)
        return null
      }
    }
  }, [provider])

  const connected = useMemo(() => {
    const isConnected = !!wallet.connected && !!wallet.publicKey && !!program
    
    // Debug logging
    console.log('🔍 Wallet Connection Debug:', {
      walletConnected: !!wallet.connected,
      hasPublicKey: !!wallet.publicKey,
      publicKey: wallet.publicKey?.toString(),
      hasProgram: !!program,
      finalConnected: isConnected,
      network: 'devnet'
    })
    
    return isConnected
  }, [wallet.connected, wallet.publicKey, program])

  // Create a new token mint
  const createTokenMint = async (decimals: number = 6) => {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    console.log('Creating new token mint...')
    
    const mintKeypair = Keypair.generate()
    
    const mint = await createMint(
      connection,
      wallet as any,
      wallet.publicKey,
      wallet.publicKey,
      decimals,
      mintKeypair
    )

    console.log('Created mint:', mint.toString())
    return mint
  }

  const createPool = async (tokenTargetAmount: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    console.log('Creating pool with target amount:', tokenTargetAmount)

    try {
      // Create a new token mint for the meme coin
      const pairTokenMint = await createTokenMint(6)
      
      // Use WSOL as the base token (SOL)
      const tokenMint = new PublicKey('So11111111111111111111111111111111111111112') // WSOL mint

      // Derive the target config PDA
      const [targetConfig] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('target_config'),
          tokenMint.toBuffer(),
          pairTokenMint.toBuffer()
        ],
        SMART_CONTRACT_ADDRESS
      )

      console.log('Target config PDA:', targetConfig.toString())
      console.log('Token mint (WSOL):', tokenMint.toString())
      console.log('Pair token mint (meme):', pairTokenMint.toString())

      const tx = await program.methods
        .initTargetConfig(new BN(tokenTargetAmount))
        .accounts({
          creator: wallet.publicKey,
          targetConfig,
          tokenMint,
          pairTokenMint,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Target config created with signature:', tx)

      return {
        signature: tx,
        targetConfig,
        pairTokenMint,
        tokenMint
      }
    } catch (error) {
      console.error('Error creating target config:', error)
      throw error
    }
  }

  const newPool = async (tokenMint: PublicKey, pairTokenMint: PublicKey) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    console.log('Creating new pool for mints:', {
      tokenMint: tokenMint.toString(),
      pairTokenMint: pairTokenMint.toString()
    })

    try {
      // Derive the pool PDA
      const [pool] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
          tokenMint.toBuffer(),
          pairTokenMint.toBuffer()
        ],
        SMART_CONTRACT_ADDRESS
      )

      console.log('Pool PDA:', pool.toString())

      const tx = await program.methods
        .newPool()
        .accounts({
          creator: wallet.publicKey,
          pool,
          tokenMint,
          pairTokenMint,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Pool created with signature:', tx)

      return {
        signature: tx,
        pool,
        tokenMint,
        pairTokenMint
      }
    } catch (error) {
      console.error('Error creating pool:', error)
      throw error
    }
  }

  const createMetadata = async (
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string
  ) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    console.log('Creating metadata for mint:', mint.toString())

    try {
      // Use Metaplex metadata program
      const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      
      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )

      const tx = await program.methods
        .createMetadata(name, symbol, uri)
        .accounts({
          creator: wallet.publicKey,
          metadata,
          mint,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Metadata created with signature:', tx)

      return {
        signature: tx,
        metadata
      }
    } catch (error) {
      console.error('Error creating metadata:', error)
      throw error
    }
  }

  const swapTokensForSol = async (
    pool: PublicKey,
    tokenMint: PublicKey,
    coinInAmount: number,
    coinYMinValue: number
  ) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    console.log('Swapping tokens for SOL:', {
      pool: pool.toString(),
      tokenMint: tokenMint.toString(),
      coinInAmount,
      coinYMinValue
    })

    try {
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      )

      // Get pool's token account  
      const poolTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        pool,
        true // allowOwnerOffCurve
      )

      const tx = await program.methods
        .swapX(new BN(coinInAmount), new BN(coinYMinValue))
        .accounts({
          user: wallet.publicKey,
          pool,
          userTokenAccount,
          poolTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Swap completed with signature:', tx)

      return {
        signature: tx
      }
    } catch (error) {
      console.error('Error swapping tokens for SOL:', error)
      throw error
    }
  }

  const swapSolForTokens = async (
    pool: PublicKey,
    tokenMint: PublicKey,
    coinInAmount: number,
    coinXMinValue: number
  ) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    console.log('Swapping SOL for tokens:', {
      pool: pool.toString(),
      tokenMint: tokenMint.toString(),
      coinInAmount,
      coinXMinValue
    })

    try {
      // Get or create user's token account
      let userTokenAccount: PublicKey
      try {
        userTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          wallet.publicKey
        )
        
        // Check if account exists, if not create it
        const accountInfo = await connection.getAccountInfo(userTokenAccount)
        if (!accountInfo) {
          console.log('Creating associated token account...')
          await createAssociatedTokenAccount(
            connection,
            wallet as any,
            tokenMint,
            wallet.publicKey
          )
        }
      } catch (error) {
        console.log('Creating associated token account...')
        userTokenAccount = await createAssociatedTokenAccount(
          connection,
          wallet as any,
          tokenMint,
          wallet.publicKey
        )
      }

      // Get pool's token account
      const poolTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        pool,
        true // allowOwnerOffCurve
      )

      const tx = await program.methods
        .swapY(new BN(coinInAmount), new BN(coinXMinValue))
        .accounts({
          user: wallet.publicKey,
          pool,
          userTokenAccount,
          poolTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Swap completed with signature:', tx)

      return {
        signature: tx
      }
    } catch (error) {
      console.error('Error swapping SOL for tokens:', error)
      throw error
    }
  }

  const getSwapPreview = async (
    pool: PublicKey,
    coinInAmount: number,
    isSwappingForSol: boolean
  ) => {
    if (!program) {
      throw new Error('Program not initialized')
    }

    console.log('Getting swap preview:', {
      pool: pool.toString(),
      coinInAmount,
      isSwappingForSol
    })

    try {
      const method = isSwappingForSol ? 'getSwapXAmt' : 'getSwapYAmt'
      const result = await program.methods[method](new BN(coinInAmount), new BN(0))
        .accounts({ pool })
        .simulate()

      return result
    } catch (error) {
      console.error('Error getting swap preview:', error)
      throw error
    }
  }

  const migrateToRaydium = async (pool: PublicKey) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    console.log('Migrating pool to Raydium:', pool.toString())

    try {
      const tx = await program.methods
        .migrateToRaydium()
        .accounts({
          creator: wallet.publicKey,
          pool,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Migration completed with signature:', tx)

      return {
        signature: tx
      }
    } catch (error) {
      console.error('Error migrating to Raydium:', error)
      throw error
    }
  }

  return {
    connected,
    program,
    createPool,
    newPool,
    createMetadata,
    swapTokensForSol,
    swapSolForTokens,
    getSwapPreview,
    migrateToRaydium,
    createTokenMint,
  }
}