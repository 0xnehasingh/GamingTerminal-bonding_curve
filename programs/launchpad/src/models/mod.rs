pub mod bound;
pub mod fees;
pub mod target_config;

use anchor_lang::prelude::*;

extern crate std;

#[derive(
    AnchorDeserialize, AnchorSerialize, Copy, Clone, Debug, Eq, PartialEq, Default, InitSpace,
)]
pub struct Reserve {
    pub tokens: u64,
    pub mint: Pubkey,
    pub vault: Pubkey,
}

pub struct SwapAmount {
    pub amount_in: u64,
    pub amount_out: u64,
    pub admin_fee_in: u64,
    pub admin_fee_out: u64,
}
