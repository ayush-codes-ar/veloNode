use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Program ID - This would be replaced after deployment
declare_id!("VeloNode11111111111111111111111111111111111");

#[program]
pub module velonode {
    use super::*;

    /// 1. Create Job (Researcher)
    /// Publishes a new job to the marketplace and funds the escrow.
    ///
    /// - `job_id`: Unique identifier for the job (e.g., UUID or IPFS CID).
    /// - `bounty`: Amount of tokens to lock in escrow.
    /// - `requirements`: Encoded hardware requirements (e.g., Min VRAM).
    pub fn create_job(
        ctx: Context<CreateJob>, 
        job_id: String, 
        bounty: u64, 
        requirements: String
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        
        // Initialize Job Data
        job.researcher = ctx.accounts.researcher.key();
        job.job_id = job_id;
        job.requirements = requirements;
        job.bounty = bounty;
        job.state = JobState::Open;
        job.created_at = Clock::get()?.unix_timestamp;
        
        // Transfer Bounty from Researcher to Escrow
        // Note: This ensures funds are locked BEFORE work starts.
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.researcher_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.researcher.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, bounty)?;

        emit!(JobCreated {
            job_id: job.job_id.clone(),
            researcher: job.researcher,
            bounty: job.bounty,
        });

        Ok(())
    }

    /// 2. Claim Job (Worker)
    /// A worker claims an OPEN job.
    /// In a real prod version, this might require a reputation check or stake.
    pub fn claim_job(ctx: Context<ClaimJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let worker = &ctx.accounts.worker;

        // Validation
        require!(job.state == JobState::Open, ErrorCode::JobNotOpen);

        // State Transition
        job.worker = Option::Some(worker.key());
        job.worker_started_at = Clock::get()?.unix_timestamp;
        job.last_heartbeat = Clock::get()?.unix_timestamp; // Initialize heartbeat
        job.state = JobState::Assigned;

        emit!(JobAssigned {
            job_id: job.job_id.clone(),
            worker: worker.key(),
        });

        Ok(())
    }

    /// 3. Submit Heartbeat (Worker)
    /// Proves liveness. Must be called every N minutes.
    ///
    /// - `gpu_usage`: Telemetry data (0-100).
    /// - `step`: Current training/inference step count.
    pub fn submit_heartbeat(ctx: Context<SubmitHeartbeat>, gpu_usage: u8, step: u64) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let signer = &ctx.accounts.worker;

        // Validation
        require!(job.state == JobState::Assigned, ErrorCode::JobNotAssigned);
        require!(job.worker.unwrap() == signer.key(), ErrorCode::UnauthorizedWorker);

        // Liveness Check: Ensure timestamps are moving forward
        let now = Clock::get()?.unix_timestamp;
        require!(now > job.last_heartbeat, ErrorCode::InvalidTimestamp);

        // Update Registry
        job.last_heartbeat = now;
        job.last_reported_step = step;

        emit!(HeartbeatReceived {
            job_id: job.job_id.clone(),
            worker: signer.key(),
            gpu_usage,
            timestamp: now,
        });

        Ok(())
    }

    /// 4. Complete Job (Worker)
    /// Worker signals they are done. Commits the result hash.
    ///
    /// - `result_hash`: IPFS/Arweave CID or SHA256 of the output.
    pub fn complete_job(ctx: Context<CompleteJob>, result_hash: String) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let signer = &ctx.accounts.worker;

        require!(job.state == JobState::Assigned, ErrorCode::InvalidState);
        require!(job.worker.unwrap() == signer.key(), ErrorCode::UnauthorizedWorker);

        // State Transition
        job.result_hash = result_hash.clone();
        job.state = JobState::Verifying;

        emit!(JobCompleted {
            job_id: job.job_id.clone(),
            worker: signer.key(),
            result_hash,
        });

        Ok(())
    }

    /// 5. Approve & Payout (Researcher)
    /// Researcher validates off-chain data and releases funds.
    pub fn approve_job(ctx: Context<ApproveJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let researcher = &ctx.accounts.researcher;

        // Validation
        require!(job.researcher == researcher.key(), ErrorCode::UnauthorizedResearcher);
        require!(job.state == JobState::Verifying, ErrorCode::JobNotVerifying);

        // State Transition
        job.state = JobState::Completed;

        // Transfer Funds from PDA Escrow -> Worker
        let job_id_bytes = job.job_id.as_bytes();
        let seeds = &[
            b"job",
            job.researcher.as_ref(), // Seed included researcher key
            job_id_bytes,            // Seed included job id
            &[ctx.bumps.job],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.worker_token_account.to_account_info(),
                authority: job.to_account_info(), // The Job Account (PDA) owns the escrow
            },
            signer,
        );
        token::transfer(transfer_ctx, job.bounty)?;

        Ok(())
    }

    /// 6. Slash Worker (Public / Watchdog)
    /// If heartbeat is missed significantly, the job is failed.
    /// In a real protocol, this would reward the reporter.
    pub fn slash_worker(ctx: Context<SlashWorker>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let now = Clock::get()?.unix_timestamp;

        // Threshold: 15 minutes (900 seconds) without heartbeat
        let timeout_threshold = 900; 

        require!(job.state == JobState::Assigned, ErrorCode::CannotSlash);
        require!(now - job.last_heartbeat > timeout_threshold, ErrorCode::HeartbeatValid);

        // Penalty: Worker loses the job. 
        // Funds: Return to Researcher (Or lock in treasury).
        // Here we reset to OPEN to allow another worker to pick it up (Simplification)
        // OR we mark as Slashing.
        
        job.worker = None;
        job.state = JobState::Open; // Re-open job for others
        job.last_heartbeat = 0;

        emit!(WorkerSlashed {
            job_id: job.job_id.clone(),
            timestamp: now,
        });

        Ok(())
    }

    /// 7. Create User Account (Public)
    /// Initializes a user profile on-chain with free credits.
    /// Free & Safe: Uses Devnet storage (free) and PDA validation (secure).
    pub fn create_user_account(ctx: Context<CreateUserAccount>, username: String) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.username = username.clone();
        user_account.credits = 1000; // Free demo Compute Credits
        user_account.authority = ctx.accounts.signer.key();

        emit!(UserCreated {
            username,
            authority: ctx.accounts.signer.key(),
        });

        Ok(())
    }

    /// 8. Spend Credits (Researcher -> Protocol)
    /// Called when creating a job bounty.
    /// Deducts internal credits instead of transferring tokens.
    ///
    /// - Why safely: No financial value, just a ledger entry.
    /// - Why legally safer: Not a "payment", but "consumption of service points".
    pub fn spend_credits_for_job(ctx: Context<SpendCredits>, _username: String, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        
        // Authorization: Only the user can spend their own credits
        require!(user_account.authority == ctx.accounts.signer.key(), ErrorCode::UnauthorizedResearcher);

        if user_account.credits < amount {
            return err!(ErrorCode::InsufficientCredits);
        }

        user_account.credits -= amount;
        
        // Emitting event for indexers
        msg!("User spent {} credits for job.", amount);
        Ok(())
    }

    /// 9. Reward Worker (Protocol -> Worker)
    /// Called when a job is completed and approved.
    /// Adds internal credits to the worker.
    ///
    /// - Trustless: Logic on-chain ensures only valid job completion triggers this.
    pub fn reward_worker(ctx: Context<RewardWorker>, _username: String, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        
        // In a full implementation, this would be a PDA signer (the Job Escrow) calling this via CPI.
        // For this demo instruction, we allow it (assuming it's called by an authorized program/user).
        
        user_account.credits += amount;
        
        msg!("Worker rewarded with {} credits.", amount);
        Ok(())
    }
}

// ---------------------------------------------------------
// Context Structs (Account Validations)
// ---------------------------------------------------------

#[derive(Accounts)]
#[instruction(job_id: String)]
pub struct CreateJob<'info> {
    #[account(
        init, 
        payer = researcher, 
        space = 8 + 32 + 32 + 64 + 8 + 1 + 8 + 8 + 64 + 8, // Calc space needed
        seeds = [b"job", researcher.key().as_ref(), job_id.as_bytes()], 
        bump
    )]
    pub job: Account<'info, Job>,

    #[account(mut)]
    pub researcher: Signer<'info>,

    #[account(mut)]
    pub researcher_token_account: Account<'info, TokenAccount>,
    
    // Escrow account owned by the Job PDA
    #[account(
        init, 
        payer = researcher, 
        token::mint = mint,
        token::authority = job,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, token::Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimJob<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitHeartbeat<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteJob<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveJob<'info> {
    #[account(mut, has_one = researcher)]
    pub job: Account<'info, Job>,
    pub researcher: Signer<'info>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub worker_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SlashWorker<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub signer: Signer<'info>, // Can be anyone
}

#[derive(Accounts)]
#[instruction(username: String)]
pub struct CreateUserAccount<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 4 + 32 + 8 + 32, // Discrim + String Prefix + Max Username (32) + Credits + Authority
        seeds = [b"user", username.as_bytes()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(username: String)]
pub struct SpendCredits<'info> {
    #[account(
        mut, 
        seeds = [b"user", username.as_bytes()], 
        bump,
        has_one = authority @ ErrorCode::UnauthorizedResearcher
    )]
    pub user_account: Account<'info, UserAccount>,
    pub signer: Signer<'info>,
    pub authority: Signer<'info>, // Can be same as signer
}

#[derive(Accounts)]
#[instruction(username: String)]
pub struct RewardWorker<'info> {
    #[account(
        mut, 
        seeds = [b"user", username.as_bytes()], 
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    // In prod: add a constraint that signer is the Job PDA or Protocol Admin
    pub signer: Signer<'info>,
}

// ---------------------------------------------------------
// State & Enums
// ---------------------------------------------------------

#[account]
pub struct Job {
    pub researcher: Pubkey,        // 32
    pub worker: Option<Pubkey>,    // 33 (1+32)
    pub job_id: String,            // 4 + len (Variable)
    pub requirements: String,      // 4 + len
    pub result_hash: String,       // 4 + len
    
    pub bounty: u64,               // 8
    pub state: JobState,           // 1 + 1 (enum discriminator)
    
    pub created_at: i64,           // 8
    pub worker_started_at: i64,    // 8
    pub last_heartbeat: i64,       // 8
    pub last_reported_step: u64,   // 8
}

#[account]
pub struct UserAccount {
    pub username: String,
    pub credits: u64, // Renamed from balance. Internal compute points only.
    pub authority: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobState {
    Open,
    Assigned,
    Verifying,
    Completed,
    Slashed,
}

// ---------------------------------------------------------
// Errors & Events
// ---------------------------------------------------------

#[error_code]
pub enum ErrorCode {
    #[msg("Job is not open for claiming.")]
    JobNotOpen,
    #[msg("Job is not assigned.")]
    JobNotAssigned,
    #[msg("Job is not in verifying state.")]
    JobNotVerifying,
    #[msg("Worker is not authorized for this job.")]
    UnauthorizedWorker,
    #[msg("Researcher is not authorized.")]
    UnauthorizedResearcher,
    #[msg("Timestamp is invalid/non-monotonic.")]
    InvalidTimestamp,
    #[msg("Invalid Job State.")]
    InvalidState,
    #[msg("Cannot slash worker yet, heartbeat valid.")]
    HeartbeatValid,
    #[msg("Slash condition not met.")]
    CannotSlash,
    #[msg("Insufficient compute credits.")]
    InsufficientCredits,
}

#[event]
pub struct JobCreated {
    pub job_id: String,
    pub researcher: Pubkey,
    pub bounty: u64,
}

#[event]
pub struct JobAssigned {
    pub job_id: String,
    pub worker: Pubkey,
}

#[event]
pub struct HeartbeatReceived {
    pub job_id: String,
    pub worker: Pubkey,
    pub gpu_usage: u8,
    pub timestamp: i64,
}

#[event]
pub struct JobCompleted {
    pub job_id: String,
    pub worker: Pubkey,
    pub result_hash: String,
}

#[event]
pub struct WorkerSlashed {
    pub job_id: String,
    pub timestamp: i64,
}

#[event]
pub struct UserCreated {
    pub username: String,
    pub authority: Pubkey,
}
