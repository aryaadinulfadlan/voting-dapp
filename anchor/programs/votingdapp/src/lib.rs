#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[derive(Accounts)]
pub struct Initialize {}
#[program]
pub mod votingdapp {
    use super::*;

    pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
        msg!("GM!");
        Ok(())
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        pool_id: u64,
        description: String,
        pool_start: u64,
        pool_end: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.pool_id = pool_id;
        pool.description = description;
        pool.pool_start = pool_start;
        pool.pool_end = pool_end;
        pool.candidate_amount = 0;
        Ok(())
    }

    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        candidate_name: String,
        _pool_id: u64
    ) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate;
        let pool = &mut ctx.accounts.pool;
        pool.candidate_amount += 1;
        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0;
        Ok(())
    }

}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub pool_id: u64,
    #[max_len(200)]
    pub description: String,
    pub pool_start: u64,
    pub pool_end: u64,
    pub candidate_amount: u64,
}
// seeds = [b"pool".as_ref(), signer.key().as_ref()],
#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + Pool::INIT_SPACE,
        seeds = [pool_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Candidate {
    #[max_len(20)]
    pub candidate_name: String,
    pub candidate_votes: u64,
}
#[derive(Accounts)]
#[instruction(candidate_name: String, pool_id: u64)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [pool_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + Candidate::INIT_SPACE,
        seeds = [pool_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
        bump,
    )]
    pub candidate: Account<'info, Candidate>,
    pub system_program: Program<'info, System>,
}

