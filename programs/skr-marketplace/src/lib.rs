use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

declare_id!("HbRyVNAr81scT4PC5XSpauGGrg2hgi34R255TBLMt3gt");

const MAX_FEE_BPS: u16 = 1_000; // 10%
pub const COMPRESSION_PROGRAM_ID: Pubkey = pubkey!("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
pub const NOOP_PROGRAM_ID: Pubkey = pubkey!("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

fn split_fee(amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    if amount == 0 || fee_bps == 0 {
        return Ok((amount, 0));
    }
    let fee = (amount as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(error!(MarketplaceError::MathOverflow))?
        / 10_000u128;
    let fee = fee as u64;
    let net = amount
        .checked_sub(fee)
        .ok_or(error!(MarketplaceError::InvalidAmount))?;
    Ok((net, fee))
}

#[program]
pub mod skr_marketplace {
    use super::*;

    pub fn init_config(ctx: Context<InitConfig>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, MarketplaceError::FeeTooHigh);
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.skr_mint = ctx.accounts.skr_mint.key();
        cfg.fee_bps = fee_bps;
        cfg.fee_recipient = ctx.accounts.fee_recipient.key();
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn set_fees(ctx: Context<SetFees>, fee_bps: u16, fee_recipient: Pubkey) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, MarketplaceError::FeeTooHigh);
        require_keys_eq!(ctx.accounts.admin.key(), ctx.accounts.config.admin, MarketplaceError::Unauthorized);
        ctx.accounts.config.fee_bps = fee_bps;
        ctx.accounts.config.fee_recipient = fee_recipient;
        Ok(())
    }

    // -------------------------
    // NFT fixed-price listings
    // -------------------------

    pub fn create_listing_nft(ctx: Context<CreateListingNft>, price: u64) -> Result<()> {
        require!(price > 0, MarketplaceError::InvalidAmount);
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.mint = ctx.accounts.nft_mint.key();
        listing.price = price;
        listing.bump = ctx.bumps.listing;
        listing.active = 1;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_nft_ata.to_account_info(),
                    to: ctx.accounts.escrow_nft_ata.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;
        Ok(())
    }

    pub fn cancel_listing_nft(ctx: Context<CancelListingNft>) -> Result<()> {
        require!(ctx.accounts.listing.active != 0, MarketplaceError::NotActive);
        require_keys_eq!(ctx.accounts.seller.key(), ctx.accounts.listing.seller, MarketplaceError::Unauthorized);

        let seeds: &[&[u8]] = &[
            b"listing_nft",
            ctx.accounts.listing.mint.as_ref(),
            &[ctx.accounts.listing.bump],
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_nft_ata.to_account_info(),
                    to: ctx.accounts.seller_nft_ata.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_nft_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer,
        ))?;

        ctx.accounts.listing.active = 0;
        Ok(())
    }

    pub fn buy_listing_nft(ctx: Context<BuyListingNft>) -> Result<()> {
        require!(ctx.accounts.listing.active != 0, MarketplaceError::NotActive);
        require!(ctx.accounts.listing.price > 0, MarketplaceError::InvalidAmount);

        // pay seller + fee recipient in SKR
        require_keys_eq!(ctx.accounts.skr_mint.key(), ctx.accounts.config.skr_mint, MarketplaceError::WrongMint);
        let (to_seller, fee) = split_fee(ctx.accounts.listing.price, ctx.accounts.config.fee_bps)?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_skr_ata.to_account_info(),
                    to: ctx.accounts.seller_skr_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            to_seller,
        )?;
        if fee > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer_skr_ata.to_account_info(),
                        to: ctx.accounts.fee_skr_ata.to_account_info(),
                        authority: ctx.accounts.buyer.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // release NFT from escrow
        let seeds: &[&[u8]] = &[
            b"listing_nft",
            ctx.accounts.listing.mint.as_ref(),
            &[ctx.accounts.listing.bump],
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_nft_ata.to_account_info(),
                    to: ctx.accounts.buyer_nft_ata.to_account_info(),
                    authority: ctx.accounts.listing.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_nft_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer,
        ))?;

        ctx.accounts.listing.active = 0;
        Ok(())
    }

    // -------------------------
    // NFT auctions
    // -------------------------

    pub fn create_auction_nft(
        ctx: Context<CreateAuctionNft>,
        end_ts: i64,
        min_bid: u64,
        min_increment: u64,
    ) -> Result<()> {
        require!(end_ts > Clock::get()?.unix_timestamp, MarketplaceError::BadEndTime);
        require!(min_bid > 0, MarketplaceError::InvalidAmount);
        let auction = &mut ctx.accounts.auction;
        auction.seller = ctx.accounts.seller.key();
        auction.mint = ctx.accounts.nft_mint.key();
        auction.end_ts = end_ts;
        auction.min_bid = min_bid;
        auction.min_increment = min_increment;
        auction.top_bidder = Pubkey::default();
        auction.top_bid = 0;
        auction.bump = ctx.bumps.auction;
        auction.active = 1;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_nft_ata.to_account_info(),
                    to: ctx.accounts.escrow_nft_ata.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;
        Ok(())
    }

    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
        require!(ctx.accounts.auction.active != 0, MarketplaceError::NotActive);
        require!(Clock::get()?.unix_timestamp < ctx.accounts.auction.end_ts, MarketplaceError::AuctionEnded);
        require_keys_eq!(ctx.accounts.skr_mint.key(), ctx.accounts.config.skr_mint, MarketplaceError::WrongMint);
        require!(amount >= ctx.accounts.auction.min_bid, MarketplaceError::BidTooLow);
        if ctx.accounts.auction.top_bid > 0 {
            require!(
                amount >= ctx.accounts.auction.top_bid.saturating_add(ctx.accounts.auction.min_increment),
                MarketplaceError::BidTooLow
            );
        }

        // move bidder funds into escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bidder_skr_ata.to_account_info(),
                    to: ctx.accounts.escrow_skr_ata.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            amount,
        )?;

        // refund previous top bidder from escrow if any
        if ctx.accounts.auction.top_bid > 0 {
            let prev_amount = ctx.accounts.auction.top_bid;
            let prev_bidder = ctx.accounts.auction.top_bidder;
            require_keys_eq!(prev_bidder, ctx.accounts.prev_top_bidder.key(), MarketplaceError::WrongPrevBidder);

            let seeds: &[&[u8]] = &[
                b"auction_nft",
                ctx.accounts.auction.mint.as_ref(),
                &[ctx.accounts.auction.bump],
            ];
            let signer = &[seeds];
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_skr_ata.to_account_info(),
                        to: ctx.accounts.prev_top_bidder_skr_ata.to_account_info(),
                        authority: ctx.accounts.auction.to_account_info(),
                    },
                    signer,
                ),
                prev_amount,
            )?;
        }

        ctx.accounts.auction.top_bidder = ctx.accounts.bidder.key();
        ctx.accounts.auction.top_bid = amount;
        Ok(())
    }

    pub fn finalize_auction_nft(ctx: Context<FinalizeAuctionNft>) -> Result<()> {
        require!(ctx.accounts.auction.active != 0, MarketplaceError::NotActive);
        require!(Clock::get()?.unix_timestamp >= ctx.accounts.auction.end_ts, MarketplaceError::AuctionNotEnded);
        require!(ctx.accounts.auction.top_bid > 0, MarketplaceError::NoBids);

        require_keys_eq!(ctx.accounts.skr_mint.key(), ctx.accounts.config.skr_mint, MarketplaceError::WrongMint);
        let (to_seller, fee) = split_fee(ctx.accounts.auction.top_bid, ctx.accounts.config.fee_bps)?;

        let seeds: &[&[u8]] = &[
            b"auction_nft",
            ctx.accounts.auction.mint.as_ref(),
            &[ctx.accounts.auction.bump],
        ];
        let signer = &[seeds];

        // pay seller and fee from escrow
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_skr_ata.to_account_info(),
                    to: ctx.accounts.seller_skr_ata.to_account_info(),
                    authority: ctx.accounts.auction.to_account_info(),
                },
                signer,
            ),
            to_seller,
        )?;
        if fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_skr_ata.to_account_info(),
                        to: ctx.accounts.fee_skr_ata.to_account_info(),
                        authority: ctx.accounts.auction.to_account_info(),
                    },
                    signer,
                ),
                fee,
            )?;
        }

        // transfer NFT to winner
        require_keys_eq!(ctx.accounts.winner.key(), ctx.accounts.auction.top_bidder, MarketplaceError::WrongWinner);
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_nft_ata.to_account_info(),
                    to: ctx.accounts.winner_nft_ata.to_account_info(),
                    authority: ctx.accounts.auction.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        // close escrow accounts
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_nft_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.auction.to_account_info(),
            },
            signer,
        ))?;
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_skr_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.auction.to_account_info(),
            },
            signer,
        ))?;

        ctx.accounts.auction.active = 0;
        Ok(())
    }

    pub fn cancel_auction_nft(ctx: Context<CancelAuctionNft>) -> Result<()> {
        require!(ctx.accounts.auction.active != 0, MarketplaceError::NotActive);
        require_keys_eq!(ctx.accounts.seller.key(), ctx.accounts.auction.seller, MarketplaceError::Unauthorized);
        require!(ctx.accounts.auction.top_bid == 0, MarketplaceError::HasBids);

        let seeds: &[&[u8]] = &[
            b"auction_nft",
            ctx.accounts.auction.mint.as_ref(),
            &[ctx.accounts.auction.bump],
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_nft_ata.to_account_info(),
                    to: ctx.accounts.seller_nft_ata.to_account_info(),
                    authority: ctx.accounts.auction.to_account_info(),
                },
                signer,
            ),
            1,
        )?;
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_nft_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.auction.to_account_info(),
            },
            signer,
        ))?;

        ctx.accounts.auction.active = 0;
        Ok(())
    }

    // -------------------------
    // cNFT fixed-price listings
    // -------------------------

    pub fn create_listing_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateListingCnft<'info>>,
        price: u64,
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.bubblegum_program.key(), mpl_bubblegum::ID, MarketplaceError::WrongBubblegumProgram);
        require_keys_eq!(ctx.accounts.compression_program.key(), COMPRESSION_PROGRAM_ID, MarketplaceError::WrongCompressionProgram);
        require_keys_eq!(ctx.accounts.log_wrapper.key(), NOOP_PROGRAM_ID, MarketplaceError::WrongNoopProgram);
        require!(price > 0, MarketplaceError::InvalidAmount);
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.merkle_tree = ctx.accounts.merkle_tree.key();
        listing.index = index;
        listing.nonce = nonce;
        listing.price = price;
        listing.bump = ctx.bumps.listing;
        listing.active = 1;

        // Delegate leaf to listing PDA so it can transfer on buy.
        let bubblegum_ai = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_ai = ctx.accounts.tree_config.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        let prev_delegate_ai = ctx.accounts.previous_leaf_delegate.to_account_info();
        let listing_ai = ctx.accounts.listing.to_account_info();
        let merkle_tree_ai = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_ai = ctx.accounts.log_wrapper.to_account_info();
        let compression_ai = ctx.accounts.compression_program.to_account_info();
        let system_ai = ctx.accounts.system_program.to_account_info();

        let mut cpi = mpl_bubblegum::instructions::DelegateCpiBuilder::new(&bubblegum_ai);
        cpi.tree_config(&tree_config_ai)
            .leaf_owner(&seller_ai)
            .previous_leaf_delegate(&prev_delegate_ai)
            .new_leaf_delegate(&listing_ai)
            .merkle_tree(&merkle_tree_ai)
            .log_wrapper(&log_wrapper_ai)
            .compression_program(&compression_ai)
            .system_program(&system_ai)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
        for ai in ctx.remaining_accounts.iter() {
            cpi.add_remaining_account(ai, false, false);
        }
        cpi.invoke()?;

        Ok(())
    }

    pub fn cancel_listing_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, CancelListingCnft<'info>>,
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.bubblegum_program.key(), mpl_bubblegum::ID, MarketplaceError::WrongBubblegumProgram);
        require_keys_eq!(ctx.accounts.compression_program.key(), COMPRESSION_PROGRAM_ID, MarketplaceError::WrongCompressionProgram);
        require_keys_eq!(ctx.accounts.log_wrapper.key(), NOOP_PROGRAM_ID, MarketplaceError::WrongNoopProgram);
        require!(ctx.accounts.listing.active != 0, MarketplaceError::NotActive);
        require_keys_eq!(ctx.accounts.seller.key(), ctx.accounts.listing.seller, MarketplaceError::Unauthorized);

        // Re-delegate back to owner (effectively revoke listing PDA).
        let bubblegum_ai = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_ai = ctx.accounts.tree_config.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        let listing_ai = ctx.accounts.listing.to_account_info();
        let merkle_tree_ai = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_ai = ctx.accounts.log_wrapper.to_account_info();
        let compression_ai = ctx.accounts.compression_program.to_account_info();
        let system_ai = ctx.accounts.system_program.to_account_info();

        let mut cpi = mpl_bubblegum::instructions::DelegateCpiBuilder::new(&bubblegum_ai);
        cpi.tree_config(&tree_config_ai)
            .leaf_owner(&seller_ai)
            .previous_leaf_delegate(&listing_ai)
            .new_leaf_delegate(&seller_ai)
            .merkle_tree(&merkle_tree_ai)
            .log_wrapper(&log_wrapper_ai)
            .compression_program(&compression_ai)
            .system_program(&system_ai)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
        for ai in ctx.remaining_accounts.iter() {
            cpi.add_remaining_account(ai, false, false);
        }
        cpi.invoke()?;

        ctx.accounts.listing.active = 0;
        Ok(())
    }

    pub fn buy_listing_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyListingCnft<'info>>,
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.bubblegum_program.key(), mpl_bubblegum::ID, MarketplaceError::WrongBubblegumProgram);
        require_keys_eq!(ctx.accounts.compression_program.key(), COMPRESSION_PROGRAM_ID, MarketplaceError::WrongCompressionProgram);
        require_keys_eq!(ctx.accounts.log_wrapper.key(), NOOP_PROGRAM_ID, MarketplaceError::WrongNoopProgram);
        require!(ctx.accounts.listing.active != 0, MarketplaceError::NotActive);
        require_keys_eq!(ctx.accounts.skr_mint.key(), ctx.accounts.config.skr_mint, MarketplaceError::WrongMint);

        let (to_seller, fee) = split_fee(ctx.accounts.listing.price, ctx.accounts.config.fee_bps)?;
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_skr_ata.to_account_info(),
                    to: ctx.accounts.seller_skr_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            to_seller,
        )?;
        if fee > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer_skr_ata.to_account_info(),
                        to: ctx.accounts.fee_skr_ata.to_account_info(),
                        authority: ctx.accounts.buyer.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Transfer leaf using listing PDA as delegate signer.
        let index_bytes = ctx.accounts.listing.index.to_le_bytes();
        let seeds: &[&[u8]] = &[
            b"listing_cnft",
            ctx.accounts.listing.merkle_tree.as_ref(),
            index_bytes.as_ref(),
            &[ctx.accounts.listing.bump],
        ];

        let bubblegum_ai = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_ai = ctx.accounts.tree_config.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        let listing_ai = ctx.accounts.listing.to_account_info();
        let buyer_ai = ctx.accounts.buyer.to_account_info();
        let merkle_tree_ai = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_ai = ctx.accounts.log_wrapper.to_account_info();
        let compression_ai = ctx.accounts.compression_program.to_account_info();
        let system_ai = ctx.accounts.system_program.to_account_info();

        let mut cpi = mpl_bubblegum::instructions::TransferCpiBuilder::new(&bubblegum_ai);
        cpi.tree_config(&tree_config_ai)
            .leaf_owner(&seller_ai, false)
            .leaf_delegate(&listing_ai, true)
            .new_leaf_owner(&buyer_ai)
            .merkle_tree(&merkle_tree_ai)
            .log_wrapper(&log_wrapper_ai)
            .compression_program(&compression_ai)
            .system_program(&system_ai)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);

        for ai in ctx.remaining_accounts.iter() {
            cpi.add_remaining_account(ai, false, false);
        }

        cpi.invoke_signed(&[seeds])?;

        ctx.accounts.listing.active = 0;
        Ok(())
    }

    // -------------------------
    // cNFT auctions
    // -------------------------

    pub fn create_auction_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateAuctionCnft<'info>>,
        end_ts: i64,
        min_bid: u64,
        min_increment: u64,
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.bubblegum_program.key(), mpl_bubblegum::ID, MarketplaceError::WrongBubblegumProgram);
        require_keys_eq!(ctx.accounts.compression_program.key(), COMPRESSION_PROGRAM_ID, MarketplaceError::WrongCompressionProgram);
        require_keys_eq!(ctx.accounts.log_wrapper.key(), NOOP_PROGRAM_ID, MarketplaceError::WrongNoopProgram);

        require!(end_ts > Clock::get()?.unix_timestamp, MarketplaceError::BadEndTime);
        require!(min_bid > 0, MarketplaceError::InvalidAmount);

        let auction = &mut ctx.accounts.auction;
        auction.seller = ctx.accounts.seller.key();
        auction.merkle_tree = ctx.accounts.merkle_tree.key();
        auction.index = index;
        auction.nonce = nonce;
        auction.end_ts = end_ts;
        auction.min_bid = min_bid;
        auction.min_increment = min_increment;
        auction.top_bidder = Pubkey::default();
        auction.top_bid = 0;
        auction.bump = ctx.bumps.auction;
        auction.active = 1;

        // delegate leaf to auction PDA
        let bubblegum_ai = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_ai = ctx.accounts.tree_config.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        let prev_delegate_ai = ctx.accounts.previous_leaf_delegate.to_account_info();
        let auction_ai = ctx.accounts.auction.to_account_info();
        let merkle_tree_ai = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_ai = ctx.accounts.log_wrapper.to_account_info();
        let compression_ai = ctx.accounts.compression_program.to_account_info();
        let system_ai = ctx.accounts.system_program.to_account_info();

        let mut cpi = mpl_bubblegum::instructions::DelegateCpiBuilder::new(&bubblegum_ai);
        cpi.tree_config(&tree_config_ai)
            .leaf_owner(&seller_ai)
            .previous_leaf_delegate(&prev_delegate_ai)
            .new_leaf_delegate(&auction_ai)
            .merkle_tree(&merkle_tree_ai)
            .log_wrapper(&log_wrapper_ai)
            .compression_program(&compression_ai)
            .system_program(&system_ai)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
        for ai in ctx.remaining_accounts.iter() {
            cpi.add_remaining_account(ai, false, false);
        }
        cpi.invoke()?;

        Ok(())
    }

    pub fn place_bid_cnft(ctx: Context<PlaceBidCnft>, amount: u64) -> Result<()> {
        require!(ctx.accounts.auction.active != 0, MarketplaceError::NotActive);
        require!(Clock::get()?.unix_timestamp < ctx.accounts.auction.end_ts, MarketplaceError::AuctionEnded);
        require_keys_eq!(ctx.accounts.skr_mint.key(), ctx.accounts.config.skr_mint, MarketplaceError::WrongMint);
        require!(amount >= ctx.accounts.auction.min_bid, MarketplaceError::BidTooLow);
        if ctx.accounts.auction.top_bid > 0 {
            require!(
                amount >= ctx.accounts.auction.top_bid.saturating_add(ctx.accounts.auction.min_increment),
                MarketplaceError::BidTooLow
            );
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bidder_skr_ata.to_account_info(),
                    to: ctx.accounts.escrow_skr_ata.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            amount,
        )?;

        if ctx.accounts.auction.top_bid > 0 {
            let prev_amount = ctx.accounts.auction.top_bid;
            let prev_bidder = ctx.accounts.auction.top_bidder;
            require_keys_eq!(prev_bidder, ctx.accounts.prev_top_bidder.key(), MarketplaceError::WrongPrevBidder);

            let index_bytes = ctx.accounts.auction.index.to_le_bytes();
            let seeds: &[&[u8]] = &[
                b"auction_cnft",
                ctx.accounts.auction.merkle_tree.as_ref(),
                index_bytes.as_ref(),
                &[ctx.accounts.auction.bump],
            ];
            let signer = &[seeds];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_skr_ata.to_account_info(),
                        to: ctx.accounts.prev_top_bidder_skr_ata.to_account_info(),
                        authority: ctx.accounts.auction.to_account_info(),
                    },
                    signer,
                ),
                prev_amount,
            )?;
        }

        ctx.accounts.auction.top_bidder = ctx.accounts.bidder.key();
        ctx.accounts.auction.top_bid = amount;
        Ok(())
    }

    pub fn finalize_auction_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, FinalizeAuctionCnft<'info>>,
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.bubblegum_program.key(), mpl_bubblegum::ID, MarketplaceError::WrongBubblegumProgram);
        require_keys_eq!(ctx.accounts.compression_program.key(), COMPRESSION_PROGRAM_ID, MarketplaceError::WrongCompressionProgram);
        require_keys_eq!(ctx.accounts.log_wrapper.key(), NOOP_PROGRAM_ID, MarketplaceError::WrongNoopProgram);

        require!(ctx.accounts.auction.active != 0, MarketplaceError::NotActive);
        require!(Clock::get()?.unix_timestamp >= ctx.accounts.auction.end_ts, MarketplaceError::AuctionNotEnded);
        require!(ctx.accounts.auction.top_bid > 0, MarketplaceError::NoBids);
        require_keys_eq!(ctx.accounts.skr_mint.key(), ctx.accounts.config.skr_mint, MarketplaceError::WrongMint);
        require_keys_eq!(ctx.accounts.winner.key(), ctx.accounts.auction.top_bidder, MarketplaceError::WrongWinner);

        let (to_seller, fee) = split_fee(ctx.accounts.auction.top_bid, ctx.accounts.config.fee_bps)?;

        let index_bytes = ctx.accounts.auction.index.to_le_bytes();
        let seeds: &[&[u8]] = &[
            b"auction_cnft",
            ctx.accounts.auction.merkle_tree.as_ref(),
            index_bytes.as_ref(),
            &[ctx.accounts.auction.bump],
        ];
        let signer = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_skr_ata.to_account_info(),
                    to: ctx.accounts.seller_skr_ata.to_account_info(),
                    authority: ctx.accounts.auction.to_account_info(),
                },
                signer,
            ),
            to_seller,
        )?;
        if fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_skr_ata.to_account_info(),
                        to: ctx.accounts.fee_skr_ata.to_account_info(),
                        authority: ctx.accounts.auction.to_account_info(),
                    },
                    signer,
                ),
                fee,
            )?;
        }

        let bubblegum_ai = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_ai = ctx.accounts.tree_config.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        let auction_ai = ctx.accounts.auction.to_account_info();
        let winner_ai = ctx.accounts.winner.to_account_info();
        let merkle_tree_ai = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_ai = ctx.accounts.log_wrapper.to_account_info();
        let compression_ai = ctx.accounts.compression_program.to_account_info();
        let system_ai = ctx.accounts.system_program.to_account_info();

        let mut cpi = mpl_bubblegum::instructions::TransferCpiBuilder::new(&bubblegum_ai);
        cpi.tree_config(&tree_config_ai)
            .leaf_owner(&seller_ai, false)
            .leaf_delegate(&auction_ai, true)
            .new_leaf_owner(&winner_ai)
            .merkle_tree(&merkle_tree_ai)
            .log_wrapper(&log_wrapper_ai)
            .compression_program(&compression_ai)
            .system_program(&system_ai)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
        for ai in ctx.remaining_accounts.iter() {
            cpi.add_remaining_account(ai, false, false);
        }
        cpi.invoke_signed(&[seeds])?;

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.escrow_skr_ata.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.auction.to_account_info(),
            },
            signer,
        ))?;

        ctx.accounts.auction.active = 0;
        Ok(())
    }

    pub fn cancel_auction_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, CancelAuctionCnft<'info>>,
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.bubblegum_program.key(), mpl_bubblegum::ID, MarketplaceError::WrongBubblegumProgram);
        require_keys_eq!(ctx.accounts.compression_program.key(), COMPRESSION_PROGRAM_ID, MarketplaceError::WrongCompressionProgram);
        require_keys_eq!(ctx.accounts.log_wrapper.key(), NOOP_PROGRAM_ID, MarketplaceError::WrongNoopProgram);

        require!(ctx.accounts.auction.active != 0, MarketplaceError::NotActive);
        require_keys_eq!(ctx.accounts.seller.key(), ctx.accounts.auction.seller, MarketplaceError::Unauthorized);
        require!(ctx.accounts.auction.top_bid == 0, MarketplaceError::HasBids);

        let bubblegum_ai = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_ai = ctx.accounts.tree_config.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        let auction_ai = ctx.accounts.auction.to_account_info();
        let merkle_tree_ai = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_ai = ctx.accounts.log_wrapper.to_account_info();
        let compression_ai = ctx.accounts.compression_program.to_account_info();
        let system_ai = ctx.accounts.system_program.to_account_info();

        let mut cpi = mpl_bubblegum::instructions::DelegateCpiBuilder::new(&bubblegum_ai);
        cpi.tree_config(&tree_config_ai)
            .leaf_owner(&seller_ai)
            .previous_leaf_delegate(&auction_ai)
            .new_leaf_delegate(&seller_ai)
            .merkle_tree(&merkle_tree_ai)
            .log_wrapper(&log_wrapper_ai)
            .compression_program(&compression_ai)
            .system_program(&system_ai)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
        for ai in ctx.remaining_accounts.iter() {
            cpi.add_remaining_account(ai, false, false);
        }
        cpi.invoke()?;

        ctx.accounts.auction.active = 0;
        Ok(())
    }
}

// Note: PDA signer seeds are inlined near each `invoke_signed` for clarity and correctness.

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub skr_mint: Account<'info, Mint>,
    /// CHECK: fee recipient can be any pubkey
    pub fee_recipient: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetFees<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
#[instruction(price: u64)]
pub struct CreateListingNft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = seller,
        space = 8 + ListingNft::INIT_SPACE,
        seeds = [b"listing_nft", nft_mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, ListingNft>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
    )]
    pub seller_nft_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = listing,
    )]
    pub escrow_nft_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListingNft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"listing_nft", listing.mint.as_ref()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, ListingNft>,
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
    )]
    pub seller_nft_ata: Account<'info, TokenAccount>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = listing,
    )]
    pub escrow_nft_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyListingNft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"listing_nft", listing.mint.as_ref()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, ListingNft>,
    pub nft_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_nft_ata: Account<'info, TokenAccount>,
    /// CHECK: seller is stored in listing; must be writable for closing escrow ATA
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = skr_mint,
        associated_token::authority = seller,
    )]
    pub seller_skr_ata: Account<'info, TokenAccount>,
    pub skr_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = skr_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_skr_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = skr_mint,
        associated_token::authority = fee_recipient,
    )]
    pub fee_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: must equal config.fee_recipient
    #[account(constraint = fee_recipient.key() == config.fee_recipient @ MarketplaceError::WrongFeeRecipient)]
    pub fee_recipient: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = listing,
    )]
    pub escrow_nft_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateAuctionNft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = seller,
        space = 8 + AuctionNft::INIT_SPACE,
        seeds = [b"auction_nft", nft_mint.key().as_ref()],
        bump
    )]
    pub auction: Account<'info, AuctionNft>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
    )]
    pub seller_nft_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = auction,
    )]
    pub escrow_nft_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"auction_nft", auction.mint.as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, AuctionNft>,
    pub skr_mint: Account<'info, Mint>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = skr_mint,
        associated_token::authority = bidder,
    )]
    pub bidder_skr_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = bidder,
        associated_token::mint = skr_mint,
        associated_token::authority = auction,
    )]
    pub escrow_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: used only for refund validation
    pub prev_top_bidder: UncheckedAccount<'info>,
    /// CHECK: only used when refunding previous top bidder
    #[account(mut)]
    pub prev_top_bidder_skr_ata: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeAuctionNft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"auction_nft", auction.mint.as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, AuctionNft>,
    pub nft_mint: Account<'info, Mint>,
    pub skr_mint: Account<'info, Mint>,
    /// CHECK: seller is stored in auction; must be writable for closing escrow accounts
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    /// CHECK: winner must equal auction.top_bidder
    pub winner: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = winner,
    )]
    pub winner_nft_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = skr_mint,
        associated_token::authority = seller,
    )]
    pub seller_skr_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = skr_mint,
        associated_token::authority = fee_recipient,
    )]
    pub fee_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: must equal config.fee_recipient
    #[account(constraint = fee_recipient.key() == config.fee_recipient @ MarketplaceError::WrongFeeRecipient)]
    pub fee_recipient: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = auction,
    )]
    pub escrow_nft_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = skr_mint,
        associated_token::authority = auction,
    )]
    pub escrow_skr_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelAuctionNft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"auction_nft", auction.mint.as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, AuctionNft>,
    pub nft_mint: Account<'info, Mint>,
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
    )]
    pub seller_nft_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = auction,
    )]
    pub escrow_nft_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// -------------------------
// cNFT listing accounts
// -------------------------

#[derive(Accounts)]
#[instruction(price: u64, root: [u8; 32], data_hash: [u8; 32], creator_hash: [u8; 32], nonce: u64, index: u32)]
pub struct CreateListingCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = seller,
        space = 8 + ListingCnft::INIT_SPACE,
        seeds = [b"listing_cnft", merkle_tree.key().as_ref(), index.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, ListingCnft>,
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: bubblegum TreeConfig PDA for this merkle_tree
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: must be current delegate (often leaf owner) so bubblegum can switch delegate
    pub previous_leaf_delegate: UncheckedAccount<'info>,
    /// CHECK: merkle tree account
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL noop (log wrapper) program (validated in handler)
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL account compression program (validated in handler)
    pub compression_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(root: [u8; 32], data_hash: [u8; 32], creator_hash: [u8; 32], nonce: u64, index: u32)]
pub struct CancelListingCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"listing_cnft", listing.merkle_tree.as_ref(), listing.index.to_le_bytes().as_ref()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, ListingCnft>,
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: bubblegum TreeConfig PDA for this merkle_tree
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: merkle tree account
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL noop (log wrapper) program (validated in handler)
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL account compression program (validated in handler)
    pub compression_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(root: [u8; 32], data_hash: [u8; 32], creator_hash: [u8; 32], nonce: u64, index: u32)]
pub struct BuyListingCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"listing_cnft", listing.merkle_tree.as_ref(), listing.index.to_le_bytes().as_ref()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, ListingCnft>,
    pub skr_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = skr_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: seller wallet stored in listing
    pub seller: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = skr_mint,
        associated_token::authority = seller,
    )]
    pub seller_skr_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = skr_mint,
        associated_token::authority = fee_recipient,
    )]
    pub fee_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: must equal config.fee_recipient
    #[account(constraint = fee_recipient.key() == config.fee_recipient @ MarketplaceError::WrongFeeRecipient)]
    pub fee_recipient: UncheckedAccount<'info>,
    /// CHECK: bubblegum TreeConfig PDA for this merkle_tree
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: merkle tree account
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL noop (log wrapper) program (validated in handler)
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL account compression program (validated in handler)
    pub compression_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(
    end_ts: i64,
    min_bid: u64,
    min_increment: u64,
    root: [u8; 32],
    data_hash: [u8; 32],
    creator_hash: [u8; 32],
    nonce: u64,
    index: u32
)]
pub struct CreateAuctionCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = seller,
        space = 8 + AuctionCnft::INIT_SPACE,
        seeds = [b"auction_cnft", merkle_tree.key().as_ref(), index.to_le_bytes().as_ref()],
        bump
    )]
    pub auction: Account<'info, AuctionCnft>,
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: bubblegum TreeConfig PDA for this merkle_tree
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: must be current delegate (often leaf owner)
    pub previous_leaf_delegate: UncheckedAccount<'info>,
    /// CHECK: merkle tree account
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL noop (log wrapper) program (validated in handler)
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL account compression program (validated in handler)
    pub compression_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBidCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"auction_cnft", auction.merkle_tree.as_ref(), auction.index.to_le_bytes().as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, AuctionCnft>,
    pub skr_mint: Account<'info, Mint>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = skr_mint,
        associated_token::authority = bidder,
    )]
    pub bidder_skr_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = bidder,
        associated_token::mint = skr_mint,
        associated_token::authority = auction,
    )]
    pub escrow_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: used only for refund validation
    pub prev_top_bidder: UncheckedAccount<'info>,
    /// CHECK: only used when refunding previous top bidder
    #[account(mut)]
    pub prev_top_bidder_skr_ata: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(root: [u8; 32], data_hash: [u8; 32], creator_hash: [u8; 32], nonce: u64, index: u32)]
pub struct FinalizeAuctionCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"auction_cnft", auction.merkle_tree.as_ref(), auction.index.to_le_bytes().as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, AuctionCnft>,
    pub skr_mint: Account<'info, Mint>,
    /// CHECK: seller wallet stored in auction
    pub seller: UncheckedAccount<'info>,
    /// CHECK: winner must match auction.top_bidder
    pub winner: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = skr_mint,
        associated_token::authority = seller,
    )]
    pub seller_skr_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = skr_mint,
        associated_token::authority = fee_recipient,
    )]
    pub fee_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: must equal config.fee_recipient
    #[account(constraint = fee_recipient.key() == config.fee_recipient @ MarketplaceError::WrongFeeRecipient)]
    pub fee_recipient: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = skr_mint,
        associated_token::authority = auction,
    )]
    pub escrow_skr_ata: Account<'info, TokenAccount>,
    /// CHECK: bubblegum TreeConfig PDA for this merkle_tree
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: merkle tree account
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL noop (log wrapper) program (validated in handler)
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL account compression program (validated in handler)
    pub compression_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(root: [u8; 32], data_hash: [u8; 32], creator_hash: [u8; 32], nonce: u64, index: u32)]
pub struct CancelAuctionCnft<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"auction_cnft", auction.merkle_tree.as_ref(), auction.index.to_le_bytes().as_ref()],
        bump = auction.bump,
    )]
    pub auction: Account<'info, AuctionCnft>,
    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: bubblegum TreeConfig PDA for this merkle_tree
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: merkle tree account
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL noop (log wrapper) program (validated in handler)
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: SPL account compression program (validated in handler)
    pub compression_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub skr_mint: Pubkey,
    pub fee_recipient: Pubkey,
    pub fee_bps: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ListingNft {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub bump: u8,
    pub active: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AuctionNft {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub end_ts: i64,
    pub min_bid: u64,
    pub min_increment: u64,
    pub top_bidder: Pubkey,
    pub top_bid: u64,
    pub bump: u8,
    pub active: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ListingCnft {
    pub seller: Pubkey,
    pub merkle_tree: Pubkey,
    pub index: u32,
    pub nonce: u64,
    pub price: u64,
    pub bump: u8,
    pub active: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AuctionCnft {
    pub seller: Pubkey,
    pub merkle_tree: Pubkey,
    pub index: u32,
    pub nonce: u64,
    pub end_ts: i64,
    pub min_bid: u64,
    pub min_increment: u64,
    pub top_bidder: Pubkey,
    pub top_bid: u64,
    pub bump: u8,
    pub active: u8,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Fee bps too high")]
    FeeTooHigh,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Wrong payment mint")]
    WrongMint,
    #[msg("Wrong fee recipient")]
    WrongFeeRecipient,
    #[msg("Listing/auction not active")]
    NotActive,
    #[msg("Auction end time invalid")]
    BadEndTime,
    #[msg("Auction has ended")]
    AuctionEnded,
    #[msg("Auction not ended")]
    AuctionNotEnded,
    #[msg("Bid too low")]
    BidTooLow,
    #[msg("No bids placed")]
    NoBids,
    #[msg("Auction already has bids")]
    HasBids,
    #[msg("Previous top bidder mismatch")]
    WrongPrevBidder,
    #[msg("Winner mismatch")]
    WrongWinner,
    #[msg("Wrong Bubblegum program")]
    WrongBubblegumProgram,
    #[msg("Wrong account compression program")]
    WrongCompressionProgram,
    #[msg("Wrong noop (log wrapper) program")]
    WrongNoopProgram,
}

