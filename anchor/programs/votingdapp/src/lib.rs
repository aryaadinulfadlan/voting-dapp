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
        ctx: Context<InitializePoll>,
        poll_id: u64,
        name: String,
        description: String,
        start_time: u64,
        end_time: u64,
    ) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;
        poll_account.poll_id = poll_id;
        poll_account.poll_name = name;
        poll_account.poll_description = description;
        poll_account.poll_voting_start = start_time;
        poll_account.poll_voting_end = end_time;
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

    pub fn vote(
        ctx: Context<Vote>,
        _candidate_name: String,
        _pool_id: u64
    ) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate;
        candidate.candidate_votes += 1;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct PollAccount{
    pub poll_id: u64,
    #[max_len(32)]
    pub poll_name: String,
    #[max_len(200)]
    pub poll_description: String,
    pub poll_voting_start: u64,
    pub poll_voting_end: u64,
    pub poll_option_index: u64,
}
#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + PollAccount::INIT_SPACE,
        seeds = [b"poll".as_ref(), poll_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
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

#[derive(Accounts)]
#[instruction(candidate_name: String, pool_id: u64)]
pub struct Vote<'info> {
    pub signer: Signer<'info>,
    #[account(
        seeds = [pool_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [pool_id.to_le_bytes().as_ref(), candidate_name.as_bytes()],
        bump,
    )]
    pub candidate: Account<'info, Candidate>,
}