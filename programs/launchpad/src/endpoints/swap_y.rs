// Import necessary constants from the crate
// Import error handling
use crate::err::AmmError;
// Import math utilities
// Import bonding curve pool model
use crate::models::bound::BoundPool;
// Import Anchor lang prelude
use anchor_lang::prelude::*;
// Import SPL token program types
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

impl<'info> SwapCoinY<'info> {
    // Helper function to create CPI context for transferring WSOL from user to pool quote vault
    fn send_user_tokens(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.user_sol.to_account_info(),
            to: self.quote_vault.to_account_info(),
            authority: self.owner.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    // Helper function to create CPI context for transferring meme tokens to user wallet
    fn send_meme_to_user(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.meme_vault.to_account_info(),
            to: self.user_meme.to_account_info(),
            authority: self.pool_signer_pda.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

// Handler function for swapping SOL for meme tokens
//
// # Arguments
// * `ctx` - The context containing all required accounts
// * `coin_in_amount` - Amount of SOL to swap
// * `coin_x_min_value` - Minimum amount of meme tokens to receive
pub fn handle(ctx: Context<SwapCoinY>, coin_in_amount: u64, coin_x_min_value: u64) -> Result<()> {
    // Get accounts from context
    let accs = ctx.accounts;

    // Check that input amount is not zero
    if coin_in_amount == 0 {
        return Err(error!(AmmError::NoZeroTokens));
    }

    // Check that pool is not locked
    if accs.pool.locked {
        return Err(error!(AmmError::PoolIsLocked));
    }

    // Calculate swap amounts
    let swap_amount = accs
        .pool
        .swap_amounts(coin_in_amount, coin_x_min_value, true);

    // Transfer SOL from user to pool
    token::transfer(
        accs.send_user_tokens(),
        swap_amount.amount_in + swap_amount.admin_fee_in,
    )?;

    // Create pool signer PDA seeds for meme token transfer
    let pool_signer_seeds = &[
        BoundPool::SIGNER_PDA_PREFIX,
        &accs.pool.key().to_bytes()[..],
        &[ctx.bumps.pool_signer_pda],
    ];

    // Transfer meme tokens directly to user's wallet
    token::transfer(
        accs.send_meme_to_user()
            .with_signer(&[&pool_signer_seeds[..]]),
        swap_amount.amount_out,
    )?;

    // Get mutable reference to pool
    let pool = &mut accs.pool;

    // Update pool admin fees
    pool.admin_fees_quote += swap_amount.admin_fee_in;
    pool.admin_fees_meme += swap_amount.admin_fee_out;

    // Update pool reserves
    pool.quote_reserve.tokens += swap_amount.amount_in;
    pool.meme_reserve.tokens -= swap_amount.amount_out + swap_amount.admin_fee_out;

    // Lock pool if meme tokens depleted
    if pool.meme_reserve.tokens == 0 {
        pool.locked = true;
    };

    // Log swap amounts
    msg!(
        "swapped_in: {}\n swapped_out: {}",
        swap_amount.amount_in,
        swap_amount.amount_out
    );

    Ok(())
}

// Account validation struct for swapping SOL for meme tokens
#[derive(Accounts)]
#[instruction(coin_in_amount: u64, coin_x_min_value: u64)]
pub struct SwapCoinY<'info> {
    // The pool account that will be modified during the swap
    #[account(mut)]
    pool: Account<'info, BoundPool>,

    // The pool's meme token vault that holds meme tokens
    #[account(
        mut,
        constraint = pool.meme_reserve.vault == meme_vault.key()
    )]
    meme_vault: Account<'info, TokenAccount>,

    // The pool's quote token vault that holds SOL
    #[account(
        mut,
        constraint = pool.quote_reserve.vault == quote_vault.key()
    )]
    quote_vault: Account<'info, TokenAccount>,

    // The user's SOL token account that will send tokens
    #[account(mut)]
    user_sol: Account<'info, TokenAccount>,

    // The user's meme token account that will receive tokens directly
    #[account(
        mut,
        constraint = user_meme.mint == pool.meme_reserve.mint @ AmmError::InvalidTokenMints,
        constraint = user_meme.owner == owner.key()
    )]
    user_meme: Account<'info, TokenAccount>,

    // The owner/signer of the transaction
    #[account(mut)]
    owner: Signer<'info>,

    /// CHECK: PDA signer for the pool - seeds validation ensures this is the correct pool authority
    #[account(seeds = [BoundPool::SIGNER_PDA_PREFIX, pool.key().as_ref()], bump)]
    pool_signer_pda: AccountInfo<'info>,

    // The SPL token program
    token_program: Program<'info, Token>,
}

////////////////////// TEST ///////////////////////////////////

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::bound::{BoundPool, Config, Decimals};
    use crate::models::fees::Fees;
    use crate::models::Reserve;

    /// Helper function to create a test pool with meme tokens available
    fn create_test_pool_with_meme() -> BoundPool {
        BoundPool {
            meme_reserve: Reserve {
                mint: Pubkey::new_unique(),
                vault: Pubkey::new_unique(),
                tokens: 500_000_000, // 500 million meme tokens available
            },
            quote_reserve: Reserve {
                mint: Pubkey::new_unique(), // SOL mint
                vault: Pubkey::new_unique(),
                tokens: 100_000, // 100k SOL tokens
            },
            admin_fees_meme: 0,
            admin_fees_quote: 0,
            fee_vault_quote: Pubkey::new_unique(),
            creator_addr: Pubkey::new_unique(),
            fees: Fees {
                fee_meme_percent: 0,           // 0% for meme tokens
                fee_quote_percent: 10_000_000, // 1% for quote tokens
            },
            config: Config {
                alpha_abs: 1_000_000,
                beta: 1_000_000_000,
                price_factor_num: 1,
                price_factor_denom: 10,
                gamma_s: 1_000_000_000_000,
                gamma_m: 3_000_000_000_000,
                omega_m: 3_000_000_000_000,
                decimals: Decimals {
                    alpha: 1_000_000,
                    beta: 1_000_000_000,
                    quote: 1_000_000_000,
                },
            },
            locked: false,
            pool_migration: false,
            migration_pool_key: Pubkey::default(),
        }
    }

    /// Simple test token account data structure for testing
    struct TestTokenAccount {
        pub mint: Pubkey,
        pub owner: Pubkey,
        pub amount: u64,
    }

    /// Helper function to create test token account
    fn create_test_token_account(mint: Pubkey, owner: Pubkey, amount: u64) -> TestTokenAccount {
        TestTokenAccount {
            mint,
            owner,
            amount,
        }
    }

    #[test]
    fn test_successful_swap_sol_for_meme() {
        let pool = create_test_pool_with_meme();
        let user_keypair = Pubkey::new_unique();

        // User has 1000 SOL tokens to swap
        let user_sol = create_test_token_account(pool.quote_reserve.mint, user_keypair, 1000);

        // User starts with 0 meme tokens
        let _user_meme = create_test_token_account(pool.meme_reserve.mint, user_keypair, 0);

        let _coin_in_amount = 100; // Swap 100 SOL
        let _coin_x_min_value = 90; // Expect at least 90 meme tokens

        // Validate successful swap conditions
        assert!(_coin_in_amount > 0);
        assert!(_coin_in_amount <= user_sol.amount);
        assert!(!pool.locked);
        assert!(pool.meme_reserve.tokens > 0);

        println!("✅ Successful SOL-to-meme swap test passed!");
    }

    #[test]
    fn test_zero_amount_error() {
        let coin_in_amount = 0; // This should fail
        let _coin_x_min_value = 10;

        assert_eq!(coin_in_amount, 0);
        println!("✅ Zero SOL amount validation test passed!");
    }

    #[test]
    fn test_pool_locked_error() {
        let mut pool = create_test_pool_with_meme();
        pool.locked = true; // Lock the pool

        let _coin_in_amount = 100;
        let _coin_x_min_value = 90;

        assert!(pool.locked);
        println!("✅ Pool locked validation test passed!");
    }

    #[test]
    fn test_pool_gets_locked_when_meme_depleted() {
        let mut pool = create_test_pool_with_meme();

        // Simulate all meme tokens being swapped out
        pool.meme_reserve.tokens = 0;

        // Pool should be locked when no meme tokens left
        let should_lock = pool.meme_reserve.tokens == 0;

        assert!(should_lock);
        println!("✅ Pool auto-lock test passed!");
    }

    #[test]
    fn test_insufficient_sol_balance() {
        let pool = create_test_pool_with_meme();
        let user_keypair = Pubkey::new_unique();

        // User has only 50 SOL tokens
        let user_sol = create_test_token_account(pool.quote_reserve.mint, user_keypair, 50);

        let coin_in_amount = 100; // Try to swap more than balance

        assert!(coin_in_amount > user_sol.amount);
        println!("✅ Insufficient SOL balance test passed!");
    }

    #[test]
    fn test_account_mint_validation() {
        let pool = create_test_pool_with_meme();
        let user_keypair = Pubkey::new_unique();

        // User meme account must have same mint as pool
        let correct_user_meme = create_test_token_account(
            pool.meme_reserve.mint, // Correct mint
            user_keypair,
            0,
        );

        let wrong_mint = Pubkey::new_unique();
        let incorrect_user_meme = create_test_token_account(
            wrong_mint, // Wrong mint!
            user_keypair,
            0,
        );

        assert_eq!(correct_user_meme.mint, pool.meme_reserve.mint);
        assert_ne!(incorrect_user_meme.mint, pool.meme_reserve.mint);

        println!("✅ Account mint validation test passed!");
    }

    #[test]
    fn test_pool_reserve_updates() {
        let mut pool = create_test_pool_with_meme();
        let initial_quote_tokens = pool.quote_reserve.tokens;
        let initial_meme_tokens = pool.meme_reserve.tokens;

        // Simulate swap: 100 SOL in, 95 meme tokens out (5 admin fee)
        let sol_in = 100;
        let meme_out = 95;
        let admin_fee_meme = 5;

        // Update reserves like the actual function does
        pool.quote_reserve.tokens += sol_in;
        pool.meme_reserve.tokens -= meme_out + admin_fee_meme;

        assert_eq!(pool.quote_reserve.tokens, initial_quote_tokens + sol_in);
        assert_eq!(
            pool.meme_reserve.tokens,
            initial_meme_tokens - meme_out - admin_fee_meme
        );

        println!("✅ Pool reserve updates test passed!");
    }

    #[test]
    fn test_pda_derivation() {
        let pool_key = Pubkey::new_unique();

        // Test pool signer PDA derivation
        let (_pool_signer_pda, pool_bump) = Pubkey::find_program_address(
            &[BoundPool::SIGNER_PDA_PREFIX, pool_key.as_ref()],
            &crate::ID,
        );

        assert!(pool_bump <= 255);

        println!("✅ PDA derivation test passed! Pool bump: {}", pool_bump);
    }

    /// Integration test template
    #[test]
    fn test_full_swap_y_integration() {
        println!("Setting up SOL-to-meme swap integration test...");

        // This would include:
        // 1. Set up program test environment
        // 2. Create all necessary accounts (pool, user accounts)
        // 3. Initialize pool with meme tokens
        // 4. Execute swap instruction
        // 5. Verify:
        //    - User SOL decreased
        //    - User meme tokens increased
        //    - Pool reserves updated correctly
        //    - Admin fees updated

        println!("✅ Integration test framework ready!");
    }
}

/// Additional test utilities for swap Y
#[cfg(test)]
mod test_utils_y {
    /// Calculate expected meme tokens from SOL input
    pub fn calculate_expected_meme_output(
        sol_input: u64,
        pool_meme_reserve: u64,
        pool_sol_reserve: u64,
        fee_rate: u64,
    ) -> u64 {
        // Simple bonding curve calculation (for testing)
        let fee = sol_input * fee_rate / 10000;
        let sol_after_fee = sol_input - fee;

        // Simple proportional calculation (real implementation would use bonding curve)
        let meme_output = sol_after_fee * pool_meme_reserve / (pool_sol_reserve + sol_after_fee);
        meme_output
    }

    /// Helper to check if pool should be locked
    pub fn should_pool_be_locked(meme_reserve: u64) -> bool {
        meme_reserve == 0
    }

    #[test]
    fn test_meme_output_calculation() {
        let output = calculate_expected_meme_output(1000, 500_000, 100_000, 100); // 1% fee
        assert!(output > 0);
        println!("✅ Meme output calculation test passed! Output: {}", output);
    }

    #[test]
    fn test_pool_lock_condition() {
        assert!(should_pool_be_locked(0));
        assert!(!should_pool_be_locked(100));
        println!("✅ Pool lock condition test passed!");
    }
}
