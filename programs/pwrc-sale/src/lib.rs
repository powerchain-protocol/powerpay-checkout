use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("4snMyVjPbQMkZDQ6BKqrEv1HfJxVKwvpXvT2pB4QELiM");

#[program]
pub mod pwrc_sale {
    use super::*;

    pub fn initialize_sale(
        ctx: Context<InitializeSale>,
        pwrc_per_sol_gross: u64,
        min_lamports: u64,
        max_lamports: u64,
    ) -> Result<()> {
        require!(pwrc_per_sol_gross > 0, SaleError::InvalidRate);
        require!(ctx.accounts.pwrc_mint.decimals == 9, SaleError::InvalidDecimals);
        require!(min_lamports > 0, SaleError::InvalidLimits);
        require!(max_lamports >= min_lamports, SaleError::InvalidLimits);

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = ctx.accounts.treasury.key();
        config.pwrc_mint = ctx.accounts.pwrc_mint.key();
        config.pwrc_per_sol_gross = pwrc_per_sol_gross;
        config.min_lamports = min_lamports;
        config.max_lamports = max_lamports;
        config.enabled = false;
        config.bump = ctx.bumps.config;

        emit!(SaleUpdated {
            pwrc_per_sol_gross,
            min_lamports,
            max_lamports,
            enabled: false,
        });
        Ok(())
    }

    pub fn update_sale(
        ctx: Context<UpdateSale>,
        pwrc_per_sol_gross: u64,
        min_lamports: u64,
        max_lamports: u64,
        enabled: bool,
    ) -> Result<()> {
        require!(pwrc_per_sol_gross > 0, SaleError::InvalidRate);
        require!(min_lamports > 0, SaleError::InvalidLimits);
        require!(max_lamports >= min_lamports, SaleError::InvalidLimits);

        let config = &mut ctx.accounts.config;
        config.pwrc_per_sol_gross = pwrc_per_sol_gross;
        config.min_lamports = min_lamports;
        config.max_lamports = max_lamports;
        config.enabled = enabled;

        emit!(SaleUpdated {
            pwrc_per_sol_gross,
            min_lamports,
            max_lamports,
            enabled,
        });
        Ok(())
    }

    pub fn buy_pwrc(ctx: Context<BuyPwrc>, lamports: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.enabled, SaleError::SaleDisabled);
        require!(lamports >= config.min_lamports, SaleError::BelowMinimum);
        require!(lamports <= config.max_lamports, SaleError::AboveMaximum);

        // Because SOL and PWRC both use 9 decimals, raw PWRC units equal
        // lamports * whole-PWRC-per-SOL. Use u128 for overflow-safe math.
        let gross_raw_u128 = (lamports as u128)
            .checked_mul(config.pwrc_per_sol_gross as u128)
            .ok_or(SaleError::MathOverflow)?;
        require!(gross_raw_u128 <= u64::MAX as u128, SaleError::MathOverflow);
        let gross_raw = gross_raw_u128 as u64;
        require!(ctx.accounts.sale_vault.amount >= gross_raw, SaleError::InsufficientInventory);

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            lamports,
        )?;

        let bump = [config.bump];
        let signer_seeds: &[&[u8]] = &[b"sale", &bump];
        let signer = &[signer_seeds];
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.sale_vault.to_account_info(),
                    mint: ctx.accounts.pwrc_mint.to_account_info(),
                    to: ctx.accounts.buyer_pwrc.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            gross_raw,
            ctx.accounts.pwrc_mint.decimals,
        )?;

        emit!(Purchase {
            buyer: ctx.accounts.buyer.key(),
            reference: ctx.accounts.reference.key(),
            lamports,
            gross_pwrc_raw: gross_raw,
            treasury: ctx.accounts.treasury.key(),
        });
        Ok(())
    }

    pub fn withdraw_inventory(ctx: Context<WithdrawInventory>, amount_raw: u64) -> Result<()> {
        require!(amount_raw > 0, SaleError::InvalidAmount);
        require!(ctx.accounts.sale_vault.amount >= amount_raw, SaleError::InsufficientInventory);

        let bump = [ctx.accounts.config.bump];
        let signer_seeds: &[&[u8]] = &[b"sale", &bump];
        let signer = &[signer_seeds];
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.sale_vault.to_account_info(),
                    mint: ctx.accounts.pwrc_mint.to_account_info(),
                    to: ctx.accounts.authority_pwrc.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            amount_raw,
            ctx.accounts.pwrc_mint.decimals,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub treasury: SystemAccount<'info>,
    pub pwrc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + SaleConfig::LEN,
        seeds = [b"sale"],
        bump
    )]
    pub config: Account<'info, SaleConfig>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = pwrc_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub sale_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(address = anchor_spl::token_2022::ID @ SaleError::InvalidTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSale<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"sale"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, SaleConfig>,
}

#[derive(Accounts)]
pub struct BuyPwrc<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"sale"], bump = config.bump)]
    pub config: Account<'info, SaleConfig>,
    #[account(mut, constraint = treasury.key() == config.treasury @ SaleError::InvalidTreasury)]
    pub treasury: SystemAccount<'info>,
    #[account(constraint = pwrc_mint.key() == config.pwrc_mint @ SaleError::InvalidMint)]
    pub pwrc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = pwrc_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub sale_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = pwrc_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_pwrc: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Unique Solana Pay/order reference. It is not read or written by the program;
    /// its presence in the successful transaction lets the checkout discover the payment.
    pub reference: UncheckedAccount<'info>,
    #[account(address = anchor_spl::token_2022::ID @ SaleError::InvalidTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawInventory<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"sale"],
        bump = config.bump,
        has_one = authority,
        constraint = pwrc_mint.key() == config.pwrc_mint @ SaleError::InvalidMint
    )]
    pub config: Account<'info, SaleConfig>,
    pub pwrc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = pwrc_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub sale_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = pwrc_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program
    )]
    pub authority_pwrc: InterfaceAccount<'info, TokenAccount>,
    #[account(address = anchor_spl::token_2022::ID @ SaleError::InvalidTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SaleConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub pwrc_mint: Pubkey,
    pub pwrc_per_sol_gross: u64,
    pub min_lamports: u64,
    pub max_lamports: u64,
    pub enabled: bool,
    pub bump: u8,
}

impl SaleConfig {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1;
}

#[event]
pub struct Purchase {
    pub buyer: Pubkey,
    pub reference: Pubkey,
    pub lamports: u64,
    pub gross_pwrc_raw: u64,
    pub treasury: Pubkey,
}

#[event]
pub struct SaleUpdated {
    pub pwrc_per_sol_gross: u64,
    pub min_lamports: u64,
    pub max_lamports: u64,
    pub enabled: bool,
}

#[error_code]
pub enum SaleError {
    #[msg("The PWRC sale is currently disabled.")]
    SaleDisabled,
    #[msg("Purchase is below the configured minimum.")]
    BelowMinimum,
    #[msg("Purchase is above the configured maximum.")]
    AboveMaximum,
    #[msg("Invalid sale rate.")]
    InvalidRate,
    #[msg("Invalid purchase limits.")]
    InvalidLimits,
    #[msg("PWRC mint must use 9 decimals.")]
    InvalidDecimals,
    #[msg("Arithmetic overflow.")]
    MathOverflow,
    #[msg("Sale vault does not contain enough PWRC.")]
    InsufficientInventory,
    #[msg("Invalid treasury account.")]
    InvalidTreasury,
    #[msg("Invalid PWRC mint.")]
    InvalidMint,
    #[msg("PWRC must use the Token-2022 program.")]
    InvalidTokenProgram,
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
}
