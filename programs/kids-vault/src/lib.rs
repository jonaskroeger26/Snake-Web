use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

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
    pub fn set_parent_display_name(ctx: Context<SetParentDisplayName>, name: [u8; 32]) -> Result<()> {
        let profile = &mut ctx.accounts.parent_profile;
        profile.owner = ctx.accounts.parent.key();
        profile.display_name = name;
        profile.bump = ctx.bumps.parent_profile;
        Ok(())
    }

    /// Register a child on-chain: ties parent + child wallet + display name. One account per (parent, child_wallet).
    pub fn register_child(ctx: Context<RegisterChild>, name: [u8; 32]) -> Result<()> {
        let rec = &mut ctx.accounts.registered_child;
        rec.parent = ctx.accounts.parent.key();
        rec.beneficiary = ctx.accounts.beneficiary.key();
        rec.name = name;
        rec.registered_at = Clock::get()?.unix_timestamp;
        rec.bump = ctx.bumps.registered_child;
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
        seeds = [
            b"token_vault",
            token_vault.creator.as_ref(),
            token_vault.beneficiary.as_ref(),
            token_vault.mint.as_ref()
        ],
        bump = token_vault.bump
    )]
    pub token_vault: Account<'info, TokenVault>,

    #[account(mut)]
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
        seeds = [
            b"token_vault",
            token_vault.creator.as_ref(),
            token_vault.beneficiary.as_ref(),
            token_vault.mint.as_ref()
        ],
        bump = token_vault.bump
    )]
    pub token_vault: Account<'info, TokenVault>,

    #[account(mut)]
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
}
