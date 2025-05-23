use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed}, // invoke_signed は現在使われていませんが、将来のために残してもOK
    system_instruction,
};
use std::fmt;

// プログラムIDを更新 (これはあなたのデプロイ済みIDに合わせてください)
declare_id!("38E1zgevXVshKemafYmkJF1YvDJqG2NVzeX4TCYS8TbL");

#[program]
pub mod sunpath {
    use super::*;

    pub fn initialize_program(
        ctx: Context<InitializeProgram>,
        admin: Pubkey,
        dao_treasury_address: Pubkey,
        governance_token_mint: Pubkey,
        minimum_reward_amount: u64,
        dao_fee_percentage: u8,
        denial_penalty_duration: i64,
        patroller_governance_token_amount: u64,
    ) -> Result<()> {
        msg!("--- initializeProgram instruction started ---");
        let config = &mut ctx.accounts.config;
        config.admin = admin;
        config.dao_treasury_address = dao_treasury_address;
        config.governance_token_mint = governance_token_mint;
        config.minimum_reward_amount = minimum_reward_amount;
        config.dao_fee_percentage = dao_fee_percentage;
        config.denial_penalty_duration = denial_penalty_duration;
        config.patroller_governance_token_amount = patroller_governance_token_amount;
        config.is_initialized = true;
        msg!(
            "Program initialized! Admin: {}, Denial penalty duration: {}",
            admin,
            denial_penalty_duration
        );
        msg!("--- initializeProgram instruction finished successfully ---");
        Ok(())
    }

    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        reward_amount: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        msg!("--- createTask instruction started ---");
        let task_account = &mut ctx.accounts.task_account;
        let consigner = &ctx.accounts.consigner;
        let system_program = &ctx.accounts.system_program;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        require!(
            reward_amount >= config.minimum_reward_amount,
            SunpathError::RewardAmountTooLow
        );

        let transfer_instruction = system_instruction::transfer(
            consigner.to_account_info().key,
            task_account.to_account_info().key,
            reward_amount,
        );

        invoke(
            &transfer_instruction,
            &[
                consigner.to_account_info(),
                task_account.to_account_info(),
                system_program.to_account_info(),
            ],
        )?;

        task_account.task_id = task_id;
        task_account.consigner_wallet = consigner.key();
        task_account.reward_amount_locked = reward_amount;
        task_account.creation_timestamp = clock.unix_timestamp;
        task_account.duration_seconds = duration_seconds;
        task_account.expiration_timestamp = clock
            .unix_timestamp
            .checked_add(duration_seconds)
            .ok_or(SunpathError::TimestampOverflow)?;
        task_account.status = TaskStatus::Open;
        task_account.status_update_timestamp = clock.unix_timestamp;
        task_account.is_initialized = true;

        msg!("--- createTask instruction finished successfully ---");
        Ok(())
    }

    pub fn initialize_admin_counter(ctx: Context<InitializeAdminCounter>) -> Result<()> {
        msg!("--- initializeAdminCounter instruction started ---");
        let admin_action_counter = &mut ctx.accounts.admin_action_counter;
        let admin = &ctx.accounts.admin;
        admin_action_counter.admin = admin.key();
        admin_action_counter.accept_count = 0;
        admin_action_counter.reject_count = 0;
        msg!("--- initializeAdminCounter instruction finished successfully ---");
        Ok(())
    }

    pub fn accept_task(ctx: Context<AcceptTask>, recipient: Pubkey) -> Result<()> {
        msg!("--- acceptTask instruction started ---");
        let task_account = &mut ctx.accounts.task_account;
        let consigner_wallet_signer = &ctx.accounts.consigner_wallet;
        let admin_action_counter = &mut ctx.accounts.admin_action_counter;
        let clock = Clock::get()?;

        require_eq!(
            task_account.status,
            TaskStatus::Open,
            SunpathError::TaskNotOpen
        );
        require!(
            clock.unix_timestamp <= task_account.expiration_timestamp,
            SunpathError::TaskExpired
        );

        let amount_to_transfer = task_account.reward_amount_locked;

        let from_account_info = task_account.to_account_info();
        let to_account_info = ctx.accounts.recipient_account.to_account_info();

        **from_account_info.try_borrow_mut_lamports()? -= amount_to_transfer;
        **to_account_info.try_borrow_mut_lamports()? += amount_to_transfer;

        msg!(
            "Direct lamport transfer successful. Amount: {}",
            amount_to_transfer
        );

        task_account.status = TaskStatus::Approved;
        task_account.status_update_timestamp = clock.unix_timestamp;
        task_account.assigned_reporter = Some(recipient);

        admin_action_counter.accept_count = admin_action_counter
            .accept_count
            .checked_add(1)
            .ok_or(SunpathError::CounterOverflow)?;

        msg!(
            "Consigner accept_count for {}: {}",
            consigner_wallet_signer.key(),
            admin_action_counter.accept_count
        );
        msg!("--- acceptTask instruction finished successfully ---");
        Ok(())
    }

    pub fn reject_task(ctx: Context<RejectTask>) -> Result<()> {
        msg!("--- rejectTask instruction started ---");
        let task_account = &mut ctx.accounts.task_account;
        let consigner_wallet_signer = &ctx.accounts.consigner_wallet;
        let admin_action_counter = &mut ctx.accounts.admin_action_counter;
        let clock = Clock::get()?;

        require_eq!(
            task_account.status,
            TaskStatus::Open,
            SunpathError::TaskNotOpen
        );
        require!(
            clock.unix_timestamp <= task_account.expiration_timestamp,
            SunpathError::TaskExpired
        );

        task_account.status = TaskStatus::Rejected;
        task_account.status_update_timestamp = clock.unix_timestamp;

        admin_action_counter.reject_count = admin_action_counter
            .reject_count
            .checked_add(1)
            .ok_or(SunpathError::CounterOverflow)?;

        msg!(
            "Consigner reject_count for {}: {}",
            consigner_wallet_signer.key(),
            admin_action_counter.reject_count
        );
        msg!("--- rejectTask instruction finished successfully ---");
        Ok(())
    }

    // ✨✨✨ --- reclaim_task_funds に詳細ログを追加 --- ✨✨✨
    pub fn reclaim_task_funds(ctx: Context<ReclaimTaskFunds>) -> Result<()> {
        msg!("--- reclaimTaskFunds instruction started ---");
        let task_account = &mut ctx.accounts.task_account;
        let consigner = &ctx.accounts.consigner_wallet;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        msg!("Initial task_account.status: {:?}", task_account.status);
        msg!(
            "Initial task_account.reward_amount_locked: {}",
            task_account.reward_amount_locked
        );
        msg!(
            "Initial task_account.expiration_timestamp: {}",
            task_account.expiration_timestamp
        );
        msg!("Current clock.unix_timestamp: {}", clock.unix_timestamp);
        msg!(
            "Config denial_penalty_duration: {}",
            config.denial_penalty_duration
        );

        let mut can_reclaim = false;
        if task_account.status == TaskStatus::Rejected {
            let reclaim_allowed_at = task_account
                .status_update_timestamp
                .checked_add(config.denial_penalty_duration)
                .ok_or(SunpathError::TimestampOverflow)?;
            msg!(
                "Path: Checking for Rejected task. Reclaim allowed at: {}",
                reclaim_allowed_at
            );
            if clock.unix_timestamp >= reclaim_allowed_at {
                can_reclaim = true;
                msg!("Condition MET: Task is Rejected and penalty period passed.");
            } else {
                msg!("Condition NOT MET: Task is Rejected but denial lockup active.");
                return err!(SunpathError::DenialLockupActive);
            }
        } else if task_account.status == TaskStatus::Open
            && clock.unix_timestamp > task_account.expiration_timestamp
        {
            // --- ここに詳細ログを追加 ---
            msg!("Path: Checking for Open & Expired task.");
            msg!(
                "  task_account.status is Open: {}",
                task_account.status == TaskStatus::Open
            );
            msg!(
                "  clock.unix_timestamp ({}) > task_account.expiration_timestamp ({}): {}",
                clock.unix_timestamp,
                task_account.expiration_timestamp,
                clock.unix_timestamp > task_account.expiration_timestamp
            );
            // --- 詳細ログここまで ---
            can_reclaim = true; // この行は元のロジック通り、条件が満たされたらtrueにする
            msg!("Condition MET (or assumed MET for Open & Expired path): Task is Open and (clock > expiration).");
        } else {
            msg!("Path: No reclaim condition met based on status and timestamps. Current status: {:?}, Expiration: {}, Current Time: {}", 
                task_account.status, 
                task_account.expiration_timestamp,
                clock.unix_timestamp
            );
        }

        require!(can_reclaim, SunpathError::CannotReclaimFunds);
        msg!("Reclaim condition verified (can_reclaim is true).");

        let amount_to_reclaim = task_account.reward_amount_locked;
        msg!("Amount to reclaim: {}", amount_to_reclaim);

        let from_account_info = task_account.to_account_info();
        let to_account_info = consigner.to_account_info();

        **from_account_info.try_borrow_mut_lamports()? -= amount_to_reclaim;
        **to_account_info.try_borrow_mut_lamports()? += amount_to_reclaim;
        msg!(
            "Direct lamport reclaim successful. Amount: {}",
            amount_to_reclaim
        );

        msg!("Attempting to update task state to Reclaimed and zero out funds...");
        task_account.status = TaskStatus::Reclaimed;
        task_account.status_update_timestamp = clock.unix_timestamp;
        task_account.reward_amount_locked = 0;

        msg!(
            "State update attempt complete. New status: {:?}",
            task_account.status
        );
        msg!(
            "New reward_amount_locked: {}",
            task_account.reward_amount_locked
        );
        msg!("--- reclaimTaskFunds instruction finished successfully ---");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProgram<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::LEN,
        seeds = [b"config_v2"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct CreateTask<'info> {
    #[account(
        init,
        payer = consigner,
        space = 8 + TaskAccount::LEN,
        seeds = [b"task_account", consigner.key().as_ref(), &task_id.to_le_bytes()],
        bump
    )]
    pub task_account: Account<'info, TaskAccount>,
    #[account(mut)]
    pub consigner: Signer<'info>,
    #[account(seeds = [b"config_v2"], bump)]
    pub config: Account<'info, ProgramConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeAdminCounter<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + AdminActionCounter::LEN,
        seeds = [b"admin_counter", admin.key().as_ref()],
        bump
    )]
    pub admin_action_counter: Account<'info, AdminActionCounter>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptTask<'info> {
    #[account(
        mut,
        seeds = [b"task_account", task_account.consigner_wallet.as_ref(), &task_account.task_id.to_le_bytes()],
        bump,
        has_one = consigner_wallet @ SunpathError::NotTaskConsigner,
    )]
    pub task_account: Account<'info, TaskAccount>,
    #[account(mut)]
    pub consigner_wallet: Signer<'info>,
    /// CHECK: recipient account, SOL transferred here.
    #[account(mut)]
    pub recipient_account: AccountInfo<'info>,
    #[account(seeds = [b"config_v2"], bump)]
    pub config: Account<'info, ProgramConfig>,
    #[account(
        mut,
        seeds = [b"admin_counter", consigner_wallet.key().as_ref()],
        bump
    )]
    pub admin_action_counter: Account<'info, AdminActionCounter>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectTask<'info> {
    #[account(
        mut,
        seeds = [b"task_account", task_account.consigner_wallet.as_ref(), &task_account.task_id.to_le_bytes()],
        bump,
        has_one = consigner_wallet @ SunpathError::NotTaskConsigner,
    )]
    pub task_account: Account<'info, TaskAccount>,
    #[account(mut)]
    pub consigner_wallet: Signer<'info>,
    #[account(seeds = [b"config_v2"], bump)]
    pub config: Account<'info, ProgramConfig>,
    #[account(
        mut,
        seeds = [b"admin_counter", consigner_wallet.key().as_ref()],
        bump
    )]
    pub admin_action_counter: Account<'info, AdminActionCounter>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReclaimTaskFunds<'info> {
    #[account(
        mut,
        seeds = [b"task_account", task_account.consigner_wallet.as_ref(), &task_account.task_id.to_le_bytes()],
        bump,
        has_one = consigner_wallet @ SunpathError::NotConsigner,
    )]
    pub task_account: Account<'info, TaskAccount>,
    #[account(mut)]
    pub consigner_wallet: Signer<'info>,
    #[account(seeds = [b"config_v2"], bump)]
    pub config: Account<'info, ProgramConfig>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub dao_treasury_address: Pubkey,
    pub governance_token_mint: Pubkey,
    pub minimum_reward_amount: u64,
    pub dao_fee_percentage: u8,
    pub denial_penalty_duration: i64,
    pub patroller_governance_token_amount: u64,
    pub is_initialized: bool,
}

impl ProgramConfig {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 1 + 8 + 8 + 1;
}

#[account]
pub struct TaskAccount {
    pub task_id: u64,
    pub consigner_wallet: Pubkey,
    pub reward_amount_locked: u64,
    pub creation_timestamp: i64,
    pub duration_seconds: i64,
    pub expiration_timestamp: i64,
    pub status: TaskStatus,
    pub status_update_timestamp: i64,
    pub assigned_reporter: Option<Pubkey>,
    pub report_pda: Option<Pubkey>,
    pub is_initialized: bool,
}

impl TaskAccount {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1 + 8 + (1 + 32) + (1 + 32) + 1;
}

#[account]
#[derive(Default)]
pub struct AdminActionCounter {
    pub admin: Pubkey,
    pub accept_count: u64,
    pub reject_count: u64,
}

impl AdminActionCounter {
    pub const LEN: usize = 32 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum TaskStatus {
    Open,
    Approved,
    Rejected,
    Expired,
    Reclaimed,
}

impl fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[error_code]
pub enum SunpathError {
    #[msg("Reward amount is too low.")]
    RewardAmountTooLow,
    #[msg("Timestamp calculation resulted in an overflow.")]
    TimestampOverflow,
    #[msg("The signer is not the admin.")]
    NotAdmin,
    #[msg("The task is not in an open state for this operation.")]
    TaskNotOpen,
    #[msg("The task has already expired.")]
    TaskExpired,
    #[msg("The signer is not the consigner of this task.")]
    NotConsigner,
    #[msg("Funds cannot be reclaimed yet.")]
    CannotReclaimFunds,
    #[msg("Denial lockup period is still active.")]
    DenialLockupActive,
    #[msg("Counter overflow.")]
    CounterOverflow,
    #[msg("The signer is not the task consigner.")]
    NotTaskConsigner,
}
