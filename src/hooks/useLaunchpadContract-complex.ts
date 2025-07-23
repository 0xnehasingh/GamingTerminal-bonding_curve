import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useMemo } from 'react'
import { SMART_CONTRACT_ADDRESS, createProvider } from '@/lib/solana-config'
import launchpadIdl from '@/lib/launchpad-idl.json'

type LaunchpadIDL = any;

export const useLaunchpadContract = () => {
  const { connection } = useConnection()
  const wallet = useWallet()

  const provider = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey) return null
    return createProvider(connection, wallet)
  }, [connection, wallet.connected, wallet.publicKey])

  const program = useMemo(() => {
    if (!provider) return null
    try {
      return new Program(launchpadIdl as any, SMART_CONTRACT_ADDRESS, provider)
    } catch (error) {
      console.error('Error initializing program:', error)
      return null
    }
  }, [provider])

  const createPool = async (tokenTargetAmount: number) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    try {
      // Derive necessary PDAs
      const [targetConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from('target_config')],
        SMART_CONTRACT_ADDRESS
      )

      // Initialize target config first
      const initTx = await program.methods
        .initTargetConfig(new BN(tokenTargetAmount))
        .accounts({
          targetConfig,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      return { signature: initTx, targetConfig }
    } catch (error) {
      console.error('Error creating pool:', error)
      throw error
    }
  }

  const newPool = async (mint: PublicKey) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    try {
      const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), mint.toBuffer()],
        SMART_CONTRACT_ADDRESS
      )

      const tx = await program.methods
        .newPool()
        .accounts({
          pool,
          mint,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      return { signature: tx, pool }
    } catch (error) {
      console.error('Error creating new pool:', error)
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

    try {
      const [metadata] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s') // Metaplex program ID
      )

      const tx = await program.methods
        .createMetadata(name, symbol, uri)
        .accounts({
          metadata,
          mint,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      return { signature: tx, metadata }
    } catch (error) {
      console.error('Error creating metadata:', error)
      throw error
    }
  }

  const swapTokensForSol = async (
    pool: PublicKey,
    mint: PublicKey,
    coinInAmount: number,
    coinYMinValue: number
  ) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    try {
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const tx = await program.methods
        .swapX(new BN(coinInAmount), new BN(coinYMinValue))
        .accounts({
          pool,
          mint,
          userTokenAccount,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()

      return { signature: tx }
    } catch (error) {
      console.error('Error swapping tokens for SOL:', error)
      throw error
    }
  }

  const swapSolForTokens = async (
    pool: PublicKey,
    mint: PublicKey,
    coinInAmount: number,
    coinXMinValue: number
  ) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    try {
      const [userTokenAccount] = PublicKey.findProgramAddressSync(
        [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const tx = await program.methods
        .swapY(new BN(coinInAmount), new BN(coinXMinValue))
        .accounts({
          pool,
          mint,
          userTokenAccount,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc()

      return { signature: tx }
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

  const migrateToRaydium = async (pool: PublicKey, mint: PublicKey) => {
    if (!program || !wallet.publicKey) {
      throw new Error('Wallet not connected or program not initialized')
    }

    try {
      const tx = await program.methods
        .migrateToRaydium()
        .accounts({
          pool,
          mint,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()

      return { signature: tx }
    } catch (error) {
      console.error('Error migrating to Raydium:', error)
      throw error
    }
  }

  return {
    program,
    connected: !!provider,
    createPool,
    newPool,
    createMetadata,
    swapTokensForSol,
    swapSolForTokens,
    getSwapPreview,
    migrateToRaydium,
  }
}