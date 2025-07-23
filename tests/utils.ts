import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";

async function createMemeMint() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const user = provider.wallet;

  const sender = user;
  const payer = (sender as any).payer;

  const memeMintKeypair = Keypair.generate();
  // Step 4: CREATE the mint account on-chain!
  const memeMint = await createMint(
    provider.connection,
    payer, // Payer
    payer.publicKey, // Temporary mint authority
    null, // No freeze authority
    9, // Decimals
    memeMintKeypair, // Use our keypair
    undefined,
    TOKEN_PROGRAM_ID
  );

  return memeMint;
}

export { createMemeMint };
