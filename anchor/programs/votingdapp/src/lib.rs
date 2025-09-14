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
        poll_account.poll_option_index = 0;
        Ok(())
    }

    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        poll_id: u64,
        candidate: String,
    ) -> Result<()> {
        let candidate_account = &mut ctx.accounts.candidate_account;
        let poll_account = &mut ctx.accounts.poll_account;
        candidate_account.candidate_name = candidate;
        candidate_account.poll_id = poll_id;
        poll_account.poll_option_index += 1;
        Ok(())
    }

    pub fn vote(
        ctx: Context<Vote>, 
        poll_id: u64, 
        _candidate: String
    ) -> Result<()> {
        let poll_account = &ctx.accounts.poll_account;
        let candidate_account = &mut ctx.accounts.candidate_account;
        let voter_account = &mut ctx.accounts.voter_account;
        let current_time = Clock::get()?.unix_timestamp;
        if current_time > (poll_account.poll_voting_end as i64) {
            return Err(ErrorCode::VotingEnded.into());
        }
        if current_time <= (poll_account.poll_voting_start as i64) {
            return Err(ErrorCode::VotingNotStarted.into());
        }
        voter_account.poll_id = poll_id;
        voter_account.voter_pubkey = ctx.accounts.signer.key();
        voter_account.chosen_candidate = candidate_account.key();
        voter_account.timestamp = current_time;
        candidate_account.candidate_votes += 1;
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
        init,
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
pub struct CandidateAccount {
    pub poll_id: u64,
    #[max_len(20)]
    pub candidate_name: String,
    pub candidate_votes: u64,
}
#[derive(Accounts)]
#[instruction(poll_id: u64, candidate: String)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"poll".as_ref(), poll_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + CandidateAccount::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate.as_ref()],
        bump
    )]
    pub candidate_account: Account<'info, CandidateAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate: String)]
pub struct Vote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [b"poll".as_ref(), poll_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate.as_ref()],
        bump
    )]
    pub candidate_account: Account<'info, CandidateAccount>,
    #[account(
        init,
        payer = signer,
        space = 8 + VoterAccount::INIT_SPACE,
        seeds = [b"voter".as_ref(), poll_id.to_le_bytes().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub voter_account: Account<'info, VoterAccount>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct VoterAccount {
    pub voter_pubkey: Pubkey,       
    pub poll_id: u64,      
    pub chosen_candidate: Pubkey,   
    pub timestamp: i64,
}
#[error_code]
pub enum ErrorCode {
    #[msg("Voting has not started yet")]
    VotingNotStarted,
    #[msg("Voting has ended")]
    VotingEnded,
}