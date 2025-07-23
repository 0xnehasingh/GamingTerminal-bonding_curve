use crate::consts::ANCHOR_DISCRIMINATOR;
use crate::models::target_config::TargetConfig;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

/// Handles the initialization of a target configuration.
/// This function creates a new target configuration account with the specified
/// target amount and associates it with the given token mint.
///
/// # Parameters
/// * `ctx` - The context containing all necessary accounts
/// * `token_target_amount` - The target amount of tokens (in lamports/smallest unit)
pub fn handle(ctx: Context<InitTargetConfig>, token_target_amount: u64) -> Result<()> {
    let target_config = &mut ctx.accounts.target_config;

    // Set the target amount (e.g., 100 SOL = 100_000_000_000 lamports)
    target_config.token_target_amount = token_target_amount;

    // Associate with the token mint (e.g., WSOL mint)
    target_config.token_mint = ctx.accounts.token_mint.key();

    // Associate with the meme mint (e.g., DOG mint)
    target_config.pair_token_mint = ctx.accounts.pair_token_mint.key();

    Ok(())
}

/// Represents the accounts required for initializing a target configuration.
///
/// This struct defines the accounts needed for the `init_target_config` instruction.
/// It includes the admin signer, the target config account to be created,
/// the token mint, and the system program.
#[derive(Accounts)]
pub struct InitTargetConfig<'info> {
    #[account(mut)]
    /// The creator account that pays for and signs the initialization
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = ANCHOR_DISCRIMINATOR + TargetConfig::INIT_SPACE,
        seeds = [TargetConfig::CONFIG_PREFIX, token_mint.key().as_ref(), pair_token_mint.key().as_ref()],
        bump
    )]
    /// The target configuration account being created
    pub target_config: Account<'info, TargetConfig>,

    /// The token mint this target config is associated with (e.g., WSOL)
    pub token_mint: Account<'info, Mint>,

    /// The meme mint this target config is associated with (e.g., DOG)
    pub pair_token_mint: Account<'info, Mint>,

    /// The system program for account creation
    pub system_program: Program<'info, System>,
}
