use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

declare_id!("3be5xtB1AUiCxQ3dPn8bEt95VrzzEEW2cJym2wXo4rnN");

#[program]
pub mod kids_vault {
    use super::*;

    /// Create a time-locked vault for a child. The creator deposits SOL; only the beneficiary can withdraw after unlock_timestamp.
    pub fn create_vault(
        ctx: Context<CreateVault>,
        amount_lamports: u64,
        unlock_timestamp: i64,
    ) -> Result<()> {
        require!(amount_lamports > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;
        vault.creator = ctx.accounts.creator.key();
        vault.beneficiary = ctx.accounts.beneficiary.key();
        vault.unlock_timestamp = unlock_timestamp;
        vault.bump = ctx.bumps.vault;

        // Transfer SOL from creator to the vault PDA
        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
            ),
            amount_lamports,
        )?;

        Ok(())
    }

    /// Withdraw vault funds. Only the beneficiary can call this, and only after unlock_timestamp has passed.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let clock = Clock::get()?;
        let vault = &ctx.accounts.vault;

        require!(
            clock.unix_timestamp >= vault.unlock_timestamp,
            VaultError::NotYetUnlocked
        );
        require!(
            ctx.accounts.beneficiary.key() == vault.beneficiary,
            VaultError::Unauthorized
        );

        let vault_info = ctx.accounts.vault.to_account_info();
        let beneficiary_info = ctx.accounts.beneficiary.to_account_info();
        let amount = vault_info.lamports();

        require!(amount > 0, VaultError::InsufficientBalance);

        **vault_info.try_borrow_mut_lamports()? -= amount;
        **beneficiary_info.try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    /// Parent display name (on-chain). Signed by parent wallet only.
    pub fn set_parent_display_name(
        ctx: Context<SetParentDisplayName>,
        display_name: [u8; 32],
    ) -> Result<()> {
        let profile = &mut ctx.accounts.parent_profile;
        profile.owner = ctx.accounts.parent.key();
        profile.display_name = display_name;
        profile.bump = ctx.bumps.parent_profile;
        Ok(())
    }

    /// Register a child on-chain: ties parent + child wallet + display name. One account per (parent, child_wallet).
    pub fn register_child(ctx: Context<RegisterChild>, child_name: [u8; 32]) -> Result<()> {
        let rec = &mut ctx.accounts.registered_child;
        rec.parent = ctx.accounts.parent.key();
        rec.beneficiary = ctx.accounts.beneficiary.key();
        rec.name = child_name;
        rec.registered_at = Clock::get()?.unix_timestamp;
        rec.bump = ctx.bumps.registered_child;
        Ok(())
    }

    /// Create an auto-save schedule: parent escrows SOL in a PDA; only `relayer` may call `execute_auto_save` on schedule.
    pub fn init_auto_save_schedule(
        ctx: Context<InitAutoSaveSchedule>,
        relayer: Pubkey,
        amount_per_period: u64,
        period_seconds: i64,
        vault_unlock_timestamp: i64,
        escrow_lamports: u64,
    ) -> Result<()> {
        require!(amount_per_period > 0, VaultError::InvalidAmount);
        require!(
            period_seconds >= 3_600 && period_seconds <= 366 * 24 * 3_600,
            VaultError::InvalidSchedulePeriod
        );

        let vault = &ctx.accounts.vault;
        require!(vault.creator == ctx.accounts.parent.key(), VaultError::Unauthorized);
        require!(
            vault.beneficiary == ctx.accounts.beneficiary.key(),
            VaultError::Unauthorized
        );
        require!(
            vault.unlock_timestamp == vault_unlock_timestamp,
            VaultError::VaultMismatch
        );

        let clock = Clock::get()?;
        let schedule = &mut ctx.accounts.schedule;
        schedule.parent = ctx.accounts.parent.key();
        schedule.beneficiary = ctx.accounts.beneficiary.key();
        schedule.relayer = relayer;
        schedule.amount_per_period = amount_per_period;
        schedule.period_seconds = period_seconds;
        schedule.next_execution_unix = clock
            .unix_timestamp
            .checked_add(period_seconds)
            .ok_or(VaultError::InvalidAmount)?;
        schedule.vault_unlock_timestamp = vault_unlock_timestamp;
        schedule.bump = ctx.bumps.schedule;
        schedule.active = 1;

        if escrow_lamports > 0 {
            let transfer_ix = system_program::Transfer {
                from: ctx.accounts.parent.to_account_info(),
                to: ctx.accounts.schedule.to_account_info(),
            };
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    transfer_ix,
                ),
                escrow_lamports,
            )?;
        }

        Ok(())
    }

    /// Top up escrow for an existing auto-save schedule.
    pub fn fund_auto_save_schedule(ctx: Context<FundAutoSaveSchedule>, lamports: u64) -> Result<()> {
        require!(lamports > 0, VaultError::InvalidAmount);
        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.parent.to_account_info(),
            to: ctx.accounts.schedule.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
            ),
            lamports,
        )?;
        Ok(())
    }

    /// Relayer-only: move one period's lamports from schedule PDA into the child's vault PDA.
    pub fn execute_auto_save(ctx: Context<ExecuteAutoSave>) -> Result<()> {
        require!(ctx.accounts.schedule.active != 0, VaultError::ScheduleNotActive);
        require!(
            ctx.accounts.relayer.key() == ctx.accounts.schedule.relayer,
            VaultError::WrongRelayer
        );

        let clock = Clock::get()?;
        let s = &ctx.accounts.schedule;
        require!(
            clock.unix_timestamp >= s.next_execution_unix,
            VaultError::NotYetDue
        );

        let vault = &ctx.accounts.vault;
        require!(
            vault.creator == s.parent && vault.beneficiary == s.beneficiary,
            VaultError::VaultMismatch
        );
        require!(
            vault.unlock_timestamp == s.vault_unlock_timestamp,
            VaultError::VaultMismatch
        );

        let amount = s.amount_per_period;
        let rent_min = Rent::get()?.minimum_balance(8 + AutoSaveSchedule::INIT_SPACE);
        let schedule_ai = ctx.accounts.schedule.to_account_info();
        let bal = schedule_ai.lamports();
        let need = amount
            .checked_add(rent_min)
            .ok_or(VaultError::InvalidAmount)?;
        require!(bal >= need, VaultError::InsufficientEscrow);

        let parent_key = s.parent;
        let ben_key = s.beneficiary;
        let bump = s.bump;
        let seeds = &[
            b"auto_save".as_ref(),
            parent_key.as_ref(),
            ben_key.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.schedule.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
                signer,
            ),
            amount,
        )?;

        let s_mut = &mut ctx.accounts.schedule;
        s_mut.next_execution_unix = s_mut
            .next_execution_unix
            .checked_add(s_mut.period_seconds)
            .ok_or(VaultError::InvalidAmount)?;

        Ok(())
    }

    /// Parent closes the schedule PDA and recovers remaining escrow + rent.
    pub fn cancel_auto_save_schedule(_ctx: Context<CancelAutoSaveSchedule>) -> Result<()> {
        Ok(())
    }

    /// Cancel the vault: only the creator can call this, and only before unlock. Sends all vault SOL back to the creator.
    pub fn cancel_vault(ctx: Context<CancelVault>) -> Result<()> {
        let clock = Clock::get()?;
        let vault = &ctx.accounts.vault;

        require!(ctx.accounts.creator.key() == vault.creator, VaultError::Unauthorized);
        require!(
            clock.unix_timestamp < vault.unlock_timestamp,
            VaultError::AlreadyUnlocked
        );

        Ok(())
    }

    // --- Token (e.g. wBTC) vaults ---

    /// Create a time-locked token vault. Creator deposits SPL tokens; only beneficiary can withdraw after unlock_timestamp.
    pub fn create_token_vault(
        ctx: Context<CreateTokenVault>,
        amount: u64,
        unlock_timestamp: i64,
    ) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);

        let token_vault = &mut ctx.accounts.token_vault;
        token_vault.creator = ctx.accounts.creator.key();
        token_vault.beneficiary = ctx.accounts.beneficiary.key();
        token_vault.mint = ctx.accounts.mint.key();
        token_vault.unlock_timestamp = unlock_timestamp;
        token_vault.bump = ctx.bumps.token_vault;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    /// Withdraw token vault. Only the beneficiary, and only after unlock_timestamp.
    pub fn withdraw_token_vault(ctx: Context<WithdrawTokenVault>) -> Result<()> {
        let clock = Clock::get()?;
        let token_vault = &ctx.accounts.token_vault;

        require!(
            clock.unix_timestamp >= token_vault.unlock_timestamp,
            VaultError::NotYetUnlocked
        );
        require!(
            ctx.accounts.beneficiary.key() == token_vault.beneficiary,
            VaultError::Unauthorized
        );

        let vault_balance = ctx.accounts.vault_token_account.amount;
        require!(vault_balance > 0, VaultError::InsufficientBalance);

        let seeds = &[
            b"token_vault",
            token_vault.creator.as_ref(),
            token_vault.beneficiary.as_ref(),
            token_vault.mint.as_ref(),
            &[token_vault.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.beneficiary_token_account.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, vault_balance)?;

        // Reclaim rent now that the vault is emptied.
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.vault_token_account.to_account_info(),
                destination: ctx.accounts.beneficiary.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
        token::close_account(cpi_ctx)?;

        Ok(())
    }

    /// Cancel token vault: only creator, before unlock. Sends tokens back to creator.
    pub fn cancel_token_vault(ctx: Context<CancelTokenVault>) -> Result<()> {
        let clock = Clock::get()?;
        let token_vault = &ctx.accounts.token_vault;

        require!(
            ctx.accounts.creator.key() == token_vault.creator,
            VaultError::Unauthorized
        );
        require!(
            clock.unix_timestamp < token_vault.unlock_timestamp,
            VaultError::AlreadyUnlocked
        );

        let amount = ctx.accounts.vault_token_account.amount;
        require!(amount > 0, VaultError::InsufficientBalance);

        let seeds = &[
            b"token_vault",
            token_vault.creator.as_ref(),
            token_vault.beneficiary.as_ref(),
            token_vault.mint.as_ref(),
            &[token_vault.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, amount)?;

        // Reclaim rent now that the vault is emptied.
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.vault_token_account.to_account_info(),
                destination: ctx.accounts.creator.to_account_info(),
                authority: ctx.accounts.token_vault.to_account_info(),
            },
            signer,
        );
        token::close_account(cpi_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"vault", creator.key().as_ref(), beneficiary.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: We only store this pubkey; beneficiary does not need to be a program account
    pub beneficiary: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetParentDisplayName<'info> {
    #[account(
        init_if_needed,
        payer = parent,
        space = 8 + 32 + 32 + 1,
        seeds = [b"parent_profile", parent.key().as_ref()],
        bump
    )]
    pub parent_profile: Account<'info, ParentProfile>,

    #[account(mut)]
    pub parent: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterChild<'info> {
    #[account(
        init,
        payer = parent,
        space = 8 + 32 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"registered_child", parent.key().as_ref(), beneficiary.key().as_ref()],
        bump
    )]
    pub registered_child: Account<'info, RegisteredChild>,

    #[account(mut)]
    pub parent: Signer<'info>,

    /// CHECK: pubkey stored as beneficiary (kid wallet)
    pub beneficiary: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct ParentProfile {
    pub owner: Pubkey,
    pub display_name: [u8; 32],
    pub bump: u8,
}

#[account]
pub struct RegisteredChild {
    pub parent: Pubkey,
    pub beneficiary: Pubkey,
    pub name: [u8; 32],
    pub registered_at: i64,
    pub bump: u8,
    pub _reserved: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AutoSaveSchedule {
    pub parent: Pubkey,
    pub beneficiary: Pubkey,
    pub relayer: Pubkey,
    pub amount_per_period: u64,
    pub period_seconds: i64,
    pub next_execution_unix: i64,
    pub vault_unlock_timestamp: i64,
    pub bump: u8,
    pub active: u8,
}

#[derive(Accounts)]
#[instruction(
    relayer: Pubkey,
    amount_per_period: u64,
    period_seconds: i64,
    vault_unlock_timestamp: i64,
    escrow_lamports: u64
)]
pub struct InitAutoSaveSchedule<'info> {
    #[account(
        init,
        payer = parent,
        space = 8 + AutoSaveSchedule::INIT_SPACE,
        seeds = [b"auto_save", parent.key().as_ref(), beneficiary.key().as_ref()],
        bump
    )]
    pub schedule: Account<'info, AutoSaveSchedule>,

    #[account(
        mut,
        seeds = [b"vault", parent.key().as_ref(), beneficiary.key().as_ref()],
        bump = vault.bump,
        constraint = vault.beneficiary == beneficiary.key(),
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub parent: Signer<'info>,

    /// CHECK: must match vault.beneficiary (see constraint on vault)
    pub beneficiary: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundAutoSaveSchedule<'info> {
    #[account(
        mut,
        seeds = [b"auto_save", parent.key().as_ref(), beneficiary.key().as_ref()],
        bump = schedule.bump,
        constraint = schedule.parent == parent.key(),
    )]
    pub schedule: Account<'info, AutoSaveSchedule>,

    #[account(mut)]
    pub parent: Signer<'info>,

    /// CHECK: PDA seed only
    pub beneficiary: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteAutoSave<'info> {
    #[account(
        mut,
        seeds = [b"auto_save", schedule.parent.as_ref(), schedule.beneficiary.as_ref()],
        bump = schedule.bump,
    )]
    pub schedule: Account<'info, AutoSaveSchedule>,

    #[account(
        mut,
        seeds = [b"vault", vault.creator.as_ref(), vault.beneficiary.as_ref()],
        bump = vault.bump,
        constraint = vault.creator == schedule.parent && vault.beneficiary == schedule.beneficiary,
    )]
    pub vault: Account<'info, Vault>,

    pub relayer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelAutoSaveSchedule<'info> {
    #[account(
        mut,
        close = parent,
        seeds = [b"auto_save", parent.key().as_ref(), beneficiary.key().as_ref()],
        bump = schedule.bump,
        constraint = schedule.parent == parent.key(),
    )]
    pub schedule: Account<'info, AutoSaveSchedule>,

    #[account(mut)]
    pub parent: Signer<'info>,

    /// CHECK: PDA seed only
    pub beneficiary: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.creator.as_ref(), vault.beneficiary.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub beneficiary: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelVault<'info> {
    #[account(
        mut,
        close = creator,
        seeds = [b"vault", vault.creator.as_ref(), vault.beneficiary.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

#[account]
pub struct Vault {
    pub creator: Pubkey,
    pub beneficiary: Pubkey,
    pub unlock_timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct TokenVault {
    pub creator: Pubkey,
    pub beneficiary: Pubkey,
    pub mint: Pubkey,
    pub unlock_timestamp: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64)]
pub struct CreateTokenVault<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 32 + 8 + 1,
        seeds = [
            b"token_vault",
            creator.key().as_ref(),
            beneficiary.key().as_ref(),
            mint.key().as_ref()
        ],
        bump
    )]
    pub token_vault: Account<'info, TokenVault>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = token_vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == mint.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: We only store this pubkey
    pub beneficiary: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawTokenVault<'info> {
    #[account(
        mut,
        close = beneficiary,
        seeds = [
            b"token_vault",
            token_vault.creator.as_ref(),
            token_vault.beneficiary.as_ref(),
            token_vault.mint.as_ref()
        ],
        bump = token_vault.bump
    )]
    pub token_vault: Account<'info, TokenVault>,

    #[account(
        mut,
        constraint = vault_token_account.owner == token_vault.key(),
        constraint = vault_token_account.mint == token_vault.mint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = beneficiary_token_account.owner == beneficiary.key(),
        constraint = beneficiary_token_account.mint == token_vault.mint
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub beneficiary: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelTokenVault<'info> {
    #[account(
        mut,
        close = creator,
        seeds = [
            b"token_vault",
            token_vault.creator.as_ref(),
            token_vault.beneficiary.as_ref(),
            token_vault.mint.as_ref()
        ],
        bump = token_vault.bump
    )]
    pub token_vault: Account<'info, TokenVault>,

    #[account(
        mut,
        constraint = vault_token_account.owner == token_vault.key(),
        constraint = vault_token_account.mint == token_vault.mint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == token_vault.mint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum VaultError {
    #[msg("Vault cannot be withdrawn yet: unlock time has not passed.")]
    NotYetUnlocked,
    #[msg("Unauthorized.")]
    Unauthorized,
    #[msg("Insufficient balance in vault.")]
    InsufficientBalance,
    #[msg("Vault is already unlocked; beneficiary must use withdraw.")]
    AlreadyUnlocked,
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Schedule period must be between 1 hour and 366 days.")]
    InvalidSchedulePeriod,
    #[msg("Vault does not match schedule (creator, beneficiary, or unlock).")]
    VaultMismatch,
    #[msg("This auto-save schedule is inactive.")]
    ScheduleNotActive,
    #[msg("Next execution time has not been reached yet.")]
    NotYetDue,
    #[msg("Wrong relayer for this schedule.")]
    WrongRelayer,
    #[msg("Not enough SOL in the schedule escrow (including rent reserve).")]
    InsufficientEscrow,
}
