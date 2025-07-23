import {
  NATIVE_MINT,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";

async function wrapSol(
  connection: Connection,
  wallet: Keypair,
  amountInSol: number
): Promise<PublicKey> {
  const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    NATIVE_MINT,
    wallet.publicKey
  );
  // Single transaction: transfer + sync
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: associatedTokenAccount.address,
      lamports: amountInSol * LAMPORTS_PER_SOL,
    }),
    createSyncNativeInstruction(associatedTokenAccount.address)
  );

  await sendAndConfirmTransaction(connection, tx, [wallet]);

  return associatedTokenAccount.address;
}
export { wrapSol, NATIVE_MINT, LAMPORTS_PER_SOL };
