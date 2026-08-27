use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::spl_token_2022::extension::transfer_fee::TransferFeeConfig,
    token_2022_extensions::transfer_fee::{self, TransferCheckedWithFee},
    token_interface::{get_mint_extension_data, Mint, TokenAccount, TokenInterface},
};

declare_id!("4snMyVjPbQMkZDQ6BKqrEv1HfJxVKwvpXvT2pB4QELiM");

/// Canonical PWRC Token-2022 mint on Solana.
/// Production sale instructions fail closed if any other mint is supplied.
pub const CANONICAL_PWRC_MINT: Pubkey = pubkey!("PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc");
pub const PWRC_DECIMALS: u8 = 9;
pub const REQUIRED_PWRC_TRANSFER_FEE_BPS: u16 = 200; // 2.00%
pub const BASIS_POINTS_DENOMINATOR: u16 = 10_000;

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
        require!(ctx.accounts.pwrc_mint.decimals == PWRC_DECIMALS, SaleError::InvalidDecimals);
        require!(min_lamports > 0, SaleError::InvalidLimits);
        require!(max_lamports >= min_lamports, SaleError::InvalidLimits);

        // The sale is intentionally coupled to the canonical PWRC Token-2022 mint
        // and its 2% transfer-fee extension. This prevents a look-alike mint or a
        // changed fee policy from being silently accepted by checkout.
        let fee_policy = read_pwrc_fee_policy(&ctx.accounts.pwrc_mint)?;

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
            pwrc_mint: config.pwrc_mint,
            pwrc_per_sol_gross,
            min_lamports,
            max_lamports,
            enabled: false,
            transfer_fee_bps: fee_policy.basis_points,
            transfer_fee_maximum_raw: fee_policy.maximum_fee_raw,
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

        // Re-validate the canonical mint and its active 2% transfer-fee policy
        // before any state transition, especially before enabling the sale.
        let fee_policy = read_pwrc_fee_policy(&ctx.accounts.pwrc_mint)?;

        let config = &mut ctx.accounts.config;
        config.pwrc_per_sol_gross = pwrc_per_sol_gross;
        config.min_lamports = min_lamports;
        config.max_lamports = max_lamports;
        config.enabled = enabled;

        emit!(SaleUpdated {
            pwrc_mint: config.pwrc_mint,
            pwrc_per_sol_gross,
            min_lamports,
            max_lamports,
            enabled,
            transfer_fee_bps: fee_policy.basis_points,
            transfer_fee_maximum_raw: fee_policy.maximum_fee_raw,
        });
        Ok(())
    }

    pub fn buy_pwrc(
        ctx: Context<BuyPwrc>,
        lamports: u64,
        expected_pwrc_per_sol_gross: u64,
        min_net_pwrc_raw: u64,
        expected_transfer_fee_bps: u16,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(config.enabled, SaleError::SaleDisabled);
        require!(lamports >= config.min_lamports, SaleError::BelowMinimum);
        require!(lamports <= config.max_lamports, SaleError::AboveMaximum);
        require!(
            expected_pwrc_per_sol_gross == config.pwrc_per_sol_gross,
            SaleError::QuoteRateChanged
        );
        require!(
            expected_transfer_fee_bps == REQUIRED_PWRC_TRANSFER_FEE_BPS,
            SaleError::QuoteFeeChanged
        );

        // SOL and PWRC both use 9 decimals. Therefore raw PWRC units are
        // lamports × whole-PWRC-per-SOL. u128 prevents intermediate overflow.
        let gross_raw_u128 = (lamports as u128)
            .checked_mul(config.pwrc_per_sol_gross as u128)
            .ok_or_else(|| error!(SaleError::MathOverflow))?;
        require!(gross_raw_u128 <= u64::MAX as u128, SaleError::MathOverflow);
        let gross_raw = gross_raw_u128 as u64;
        require!(ctx.accounts.sale_vault.amount >= gross_raw, SaleError::InsufficientInventory);

        // Re-read the mint extension at execution time. The transaction fails if
        // the active PWRC transfer fee is not exactly 200 bps. The expected fee is
        // supplied to TransferCheckedWithFee, so a fee-config race also fails closed.
        let fee_quote = quote_pwrc_transfer_fee(&ctx.accounts.pwrc_mint, gross_raw)?;
        require!(
            fee_quote.basis_points == expected_transfer_fee_bps,
            SaleError::QuoteFeeChanged
        );
        require!(fee_quote.net_raw >= min_net_pwrc_raw, SaleError::QuoteSlippageExceeded);

        // The buyer is the transaction fee payer in the client-built transaction,
        // so Solana's network fee is charged by the runtime in addition to this SOL
        // purchase amount. The program itself never invents or redirects that fee.
        anchor_lang::system_program::transfer(
            CpiContext::new(
                anchor_lang::system_program::ID,
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
        transfer_fee::transfer_checked_with_fee(
            CpiContext::new_with_signer(
                anchor_spl::token_2022::ID,
                TransferCheckedWithFee {
                    token_program_id: ctx.accounts.token_program.to_account_info(),
                    source: ctx.accounts.sale_vault.to_account_info(),
                    mint: ctx.accounts.pwrc_mint.to_account_info(),
                    destination: ctx.accounts.buyer_pwrc.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            gross_raw,
            ctx.accounts.pwrc_mint.decimals,
            fee_quote.fee_raw,
        )?;

        let clock = Clock::get()?;
        let receipt = &mut ctx.accounts.purchase_receipt;
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.reference = ctx.accounts.reference.key();
        receipt.lamports = lamports;
        receipt.gross_pwrc_raw = gross_raw;
        receipt.transfer_fee_bps = fee_quote.basis_points;
        receipt.transfer_fee_raw = fee_quote.fee_raw;
        receipt.net_pwrc_raw = fee_quote.net_raw;
        receipt.slot = clock.slot;
        receipt.bump = ctx.bumps.purchase_receipt;

        emit!(Purchase {
            buyer: ctx.accounts.buyer.key(),
            reference: ctx.accounts.reference.key(),
            lamports,
            gross_pwrc_raw: gross_raw,
            transfer_fee_bps: fee_quote.basis_points,
            transfer_fee_raw: fee_quote.fee_raw,
            net_pwrc_raw: fee_quote.net_raw,
            transfer_fee_maximum_raw: fee_quote.maximum_fee_raw,
            treasury: ctx.accounts.treasury.key(),
            pwrc_mint: ctx.accounts.pwrc_mint.key(),
        });
        Ok(())
    }

    pub fn withdraw_inventory(ctx: Context<WithdrawInventory>, amount_raw: u64) -> Result<()> {
        require!(amount_raw > 0, SaleError::InvalidAmount);
        require!(ctx.accounts.sale_vault.amount >= amount_raw, SaleError::InsufficientInventory);

        let fee_quote = quote_pwrc_transfer_fee(&ctx.accounts.pwrc_mint, amount_raw)?;
        let bump = [ctx.accounts.config.bump];
        let signer_seeds: &[&[u8]] = &[b"sale", &bump];
        let signer = &[signer_seeds];
        transfer_fee::transfer_checked_with_fee(
            CpiContext::new_with_signer(
                anchor_spl::token_2022::ID,
                TransferCheckedWithFee {
                    token_program_id: ctx.accounts.token_program.to_account_info(),
                    source: ctx.accounts.sale_vault.to_account_info(),
                    mint: ctx.accounts.pwrc_mint.to_account_info(),
                    destination: ctx.accounts.authority_pwrc.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer,
            ),
            amount_raw,
            ctx.accounts.pwrc_mint.decimals,
            fee_quote.fee_raw,
        )?;

        emit!(InventoryWithdrawn {
            authority: ctx.accounts.authority.key(),
            gross_pwrc_raw: amount_raw,
            transfer_fee_raw: fee_quote.fee_raw,
            net_pwrc_raw: fee_quote.net_raw,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub treasury: SystemAccount<'info>,
    #[account(address = CANONICAL_PWRC_MINT @ SaleError::InvalidMint)]
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
        has_one = authority,
        constraint = config.pwrc_mint == CANONICAL_PWRC_MINT @ SaleError::InvalidMint
    )]
    pub config: Account<'info, SaleConfig>,
    #[account(
        address = CANONICAL_PWRC_MINT @ SaleError::InvalidMint,
        constraint = pwrc_mint.key() == config.pwrc_mint @ SaleError::InvalidMint
    )]
    pub pwrc_mint: InterfaceAccount<'info, Mint>,
}

#[derive(Accounts)]
pub struct BuyPwrc<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"sale"],
        bump = config.bump,
        constraint = config.pwrc_mint == CANONICAL_PWRC_MINT @ SaleError::InvalidMint
    )]
    pub config: Account<'info, SaleConfig>,
    #[account(mut, constraint = treasury.key() == config.treasury @ SaleError::InvalidTreasury)]
    pub treasury: SystemAccount<'info>,
    #[account(
        address = CANONICAL_PWRC_MINT @ SaleError::InvalidMint,
        constraint = pwrc_mint.key() == config.pwrc_mint @ SaleError::InvalidMint
    )]
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
    /// CHECK: Unique Solana Pay/order reference. The program binds it to an immutable
    /// receipt PDA, so the same checkout reference cannot settle twice.
    pub reference: UncheckedAccount<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + PurchaseReceipt::LEN,
        seeds = [b"purchase", reference.key().as_ref()],
        bump
    )]
    pub purchase_receipt: Account<'info, PurchaseReceipt>,
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
        constraint = config.pwrc_mint == CANONICAL_PWRC_MINT @ SaleError::InvalidMint,
        constraint = pwrc_mint.key() == config.pwrc_mint @ SaleError::InvalidMint
    )]
    pub config: Account<'info, SaleConfig>,
    #[account(address = CANONICAL_PWRC_MINT @ SaleError::InvalidMint)]
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

#[account]
pub struct PurchaseReceipt {
    pub buyer: Pubkey,
    pub reference: Pubkey,
    pub lamports: u64,
    pub gross_pwrc_raw: u64,
    pub transfer_fee_bps: u16,
    pub transfer_fee_raw: u64,
    pub net_pwrc_raw: u64,
    pub slot: u64,
    pub bump: u8,
}

impl PurchaseReceipt {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 2 + 8 + 8 + 8 + 1;
}

#[derive(Clone, Copy)]
struct PwrcFeePolicy {
    basis_points: u16,
    maximum_fee_raw: u64,
}

#[derive(Clone, Copy)]
struct PwrcFeeQuote {
    basis_points: u16,
    maximum_fee_raw: u64,
    fee_raw: u64,
    net_raw: u64,
}

fn read_pwrc_fee_policy(mint: &InterfaceAccount<Mint>) -> Result<PwrcFeePolicy> {
    require_keys_eq!(mint.key(), CANONICAL_PWRC_MINT, SaleError::InvalidMint);
    require!(mint.decimals == PWRC_DECIMALS, SaleError::InvalidDecimals);

    let transfer_fee_config = get_mint_extension_data::<TransferFeeConfig>(&mint.to_account_info())
        .map_err(|_| error!(SaleError::MissingTransferFeeConfig))?;
    let epoch = Clock::get()?.epoch;
    let active_fee = transfer_fee_config.get_epoch_fee(epoch);
    let basis_points = u16::from(active_fee.transfer_fee_basis_points);
    let maximum_fee_raw = u64::from(active_fee.maximum_fee);

    require!(
        basis_points == REQUIRED_PWRC_TRANSFER_FEE_BPS,
        SaleError::InvalidTransferFee
    );

    Ok(PwrcFeePolicy {
        basis_points,
        maximum_fee_raw,
    })
}

fn quote_pwrc_transfer_fee(mint: &InterfaceAccount<Mint>, amount_raw: u64) -> Result<PwrcFeeQuote> {
    let policy = read_pwrc_fee_policy(mint)?;
    let transfer_fee_config = get_mint_extension_data::<TransferFeeConfig>(&mint.to_account_info())
        .map_err(|_| error!(SaleError::MissingTransferFeeConfig))?;
    let epoch = Clock::get()?.epoch;
    let fee_raw = transfer_fee_config
        .calculate_epoch_fee(epoch, amount_raw)
        .ok_or_else(|| error!(SaleError::MathOverflow))?;
    let net_raw = amount_raw
        .checked_sub(fee_raw)
        .ok_or_else(|| error!(SaleError::MathOverflow))?;

    Ok(PwrcFeeQuote {
        basis_points: policy.basis_points,
        maximum_fee_raw: policy.maximum_fee_raw,
        fee_raw,
        net_raw,
    })
}

#[event]
pub struct Purchase {
    pub buyer: Pubkey,
    pub reference: Pubkey,
    pub lamports: u64,
    pub gross_pwrc_raw: u64,
    pub transfer_fee_bps: u16,
    pub transfer_fee_raw: u64,
    pub net_pwrc_raw: u64,
    pub transfer_fee_maximum_raw: u64,
    pub treasury: Pubkey,
    pub pwrc_mint: Pubkey,
}

#[event]
pub struct InventoryWithdrawn {
    pub authority: Pubkey,
    pub gross_pwrc_raw: u64,
    pub transfer_fee_raw: u64,
    pub net_pwrc_raw: u64,
}

#[event]
pub struct SaleUpdated {
    pub pwrc_mint: Pubkey,
    pub pwrc_per_sol_gross: u64,
    pub min_lamports: u64,
    pub max_lamports: u64,
    pub enabled: bool,
    pub transfer_fee_bps: u16,
    pub transfer_fee_maximum_raw: u64,
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
    #[msg("Invalid PWRC mint. The canonical Token-2022 mint is required.")]
    InvalidMint,
    #[msg("PWRC must use the Token-2022 program.")]
    InvalidTokenProgram,
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("PWRC mint is missing the Token-2022 TransferFeeConfig extension.")]
    MissingTransferFeeConfig,
    #[msg("PWRC active transfer fee must be exactly 200 basis points (2%).")]
    InvalidTransferFee,
    #[msg("The executable PWRC/SOL rate changed after quote review. Refresh the quote.")]
    QuoteRateChanged,
    #[msg("The PWRC transfer-fee policy changed after quote review. Refresh the quote.")]
    QuoteFeeChanged,
    #[msg("The net PWRC output is below the signed minimum. Refresh the quote.")]
    QuoteSlippageExceeded,
}
