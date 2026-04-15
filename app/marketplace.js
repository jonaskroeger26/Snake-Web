import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import idl from '../target/idl/skr_marketplace.json';
import { getCnftProofBundle } from './cnft-das.js';

export const SKR_MINT = new PublicKey('SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3');
export const PROGRAM_ID = new PublicKey(idl.address);

export function makeWalletAdapter({ connect, disconnect, getPublicKey, signTransaction }) {
  return {
    publicKey: getPublicKey(),
    async signTransaction(tx) {
      const res = await signTransaction(tx);
      // Some adapters return Uint8Array (serialized tx). Normalize to Transaction.
      if (res instanceof Transaction) return res;
      if (res?.serialize && typeof res.serialize === 'function') return res;
      if (res instanceof Uint8Array) return Transaction.from(res);
      if (res?.transaction && res.transaction instanceof Uint8Array) return Transaction.from(res.transaction);
      return tx;
    },
    async signAllTransactions(txs) {
      const out = [];
      for (const t of txs) out.push(await this.signTransaction(t));
      return out;
    },
    async connect() {
      await connect?.();
      this.publicKey = getPublicKey();
      return this.publicKey;
    },
    async disconnect() {
      await disconnect?.();
      this.publicKey = null;
    },
  };
}

export function createMarketplaceClient({ rpcUrl, wallet }) {
  const connection = new Connection(rpcUrl, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  const configPda = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0];

  async function fetchConfig() {
    try {
      return await program.account.config.fetch(configPda);
    } catch {
      return null;
    }
  }

  async function fetchListings() {
    const [nfts, cnfts] = await Promise.all([
      program.account.listingNft.all().catch(() => []),
      program.account.listingCnft.all().catch(() => []),
    ]);
    return { nfts, cnfts };
  }

  async function createNftListing({ mint, price }) {
    const seller = provider.wallet.publicKey;
    const nftMint = new PublicKey(mint);

    const listingPda = PublicKey.findProgramAddressSync([Buffer.from('listing_nft'), nftMint.toBuffer()], PROGRAM_ID)[0];
    const sellerNftAta = getAssociatedTokenAddressSync(nftMint, seller);
    const escrowNftAta = getAssociatedTokenAddressSync(nftMint, listingPda, true);

    return await program.methods
      .createListingNft(new anchor.BN(price))
      .accounts({
        config: configPda,
        listing: listingPda,
        nftMint,
        sellerNftAta,
        escrowNftAta,
        seller,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async function buyNftListing({ mint, seller }) {
    const buyer = provider.wallet.publicKey;
    const nftMint = new PublicKey(mint);
    const sellerPk = new PublicKey(seller);

    const listingPda = PublicKey.findProgramAddressSync([Buffer.from('listing_nft'), nftMint.toBuffer()], PROGRAM_ID)[0];
    const escrowNftAta = getAssociatedTokenAddressSync(nftMint, listingPda, true);
    const buyerNftAta = getAssociatedTokenAddressSync(nftMint, buyer);

    const buyerSkrAta = getAssociatedTokenAddressSync(SKR_MINT, buyer);
    const sellerSkrAta = getAssociatedTokenAddressSync(SKR_MINT, sellerPk);

    // fee recipient is stored on-chain in config; still must be provided as account metas.
    const cfg = await fetchConfig();
    if (!cfg) throw new Error('Marketplace config not initialized');
    const feeRecipient = new PublicKey(cfg.feeRecipient);
    const feeSkrAta = getAssociatedTokenAddressSync(SKR_MINT, feeRecipient);

    return await program.methods
      .buyListingNft()
      .accounts({
        config: configPda,
        listing: listingPda,
        nftMint,
        buyer,
        buyerNftAta,
        seller: sellerPk,
        sellerSkrAta,
        skrMint: SKR_MINT,
        buyerSkrAta,
        feeSkrAta,
        feeRecipient,
        escrowNftAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async function loadCnftBundle(assetId) {
    return await getCnftProofBundle(assetId);
  }

  return {
    program,
    provider,
    configPda,
    fetchConfig,
    fetchListings,
    createNftListing,
    buyNftListing,
    loadCnftBundle,
  };
}

