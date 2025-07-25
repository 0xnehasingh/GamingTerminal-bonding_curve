import { PublicKey, Connection } from '@solana/web3.js'
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'

export const SMART_CONTRACT_ADDRESS = new PublicKey('ip6SLxttjbSrQggmM2SH5RZXhWKq3onmkzj3kExoceN')

export const SOLANA_NETWORK = 'devnet'
export const RPC_ENDPOINT = 'https://solana-devnet.g.alchemy.com/v2/_gJukT1qzcSLlw__r0xkTBLdaDTbYYrH'

export const getConnection = () => {
  return new Connection(RPC_ENDPOINT, 'confirmed')
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