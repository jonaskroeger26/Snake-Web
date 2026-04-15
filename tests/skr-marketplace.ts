import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

function ataAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol = 2,
) {
  const sig = await connection.requestAirdrop(
    pubkey,
    sol * anchor.web3.LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction(sig, "confirmed");
}

describe("skr-marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idlPath = path.join(__dirname, "../target/idl/skr_marketplace.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new Program(idl, provider) as Program;

  const admin = provider.wallet as anchor.Wallet;
  const payerKp = admin.payer;

  const seller = Keypair.generate();
  const buyer = Keypair.generate();
  const feeRecipient = Keypair.generate();

  let skrMint: PublicKey;
  let configPda: PublicKey;

  before(async () => {
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId,
    );

    await airdrop(provider.connection, seller.publicKey, 2);
    await airdrop(provider.connection, buyer.publicKey, 2);

    // Create SKR mint (test mint) and mint to buyer.
    skrMint = await createMint(
      provider.connection,
      payerKp,
      admin.publicKey,
      null,
      6,
    );

    const buyerSkrAta = await createAssociatedTokenAccount(
      provider.connection,
      payerKp,
      skrMint,
      buyer.publicKey,
    );
    await mintTo(
      provider.connection,
      payerKp,
      skrMint,
      buyerSkrAta,
      payerKp,
      5_000_000_000n,
    );

    await program.methods
      .initConfig(250) // 2.5%
      .accounts({
        admin: admin.publicKey,
        skrMint,
        feeRecipient: feeRecipient.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("Creates and buys an NFT fixed-price listing (SKR)", async () => {
    // Create NFT mint and mint 1 to seller.
    const nftMint = await createMint(
      provider.connection,
      payerKp,
      seller.publicKey,
      null,
      0,
    );
    const sellerNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payerKp,
      nftMint,
      seller.publicKey,
    );
    await mintTo(
      provider.connection,
      payerKp,
      nftMint,
      sellerNftAta,
      seller,
      1n,
    );

    const [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing_nft"), nftMint.toBuffer()],
      program.programId,
    );
    const escrowNftAta = ataAddress(nftMint, listingPda);

    const price = new anchor.BN(1_000_000); // 1.0 in 6 decimals

    await program.methods
      .createListingNft(price)
      .accounts({
        config: configPda,
        listing: listingPda,
        nftMint,
        sellerNftAta,
        escrowNftAta,
        seller: seller.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const listing = await program.account.listingNft.fetch(listingPda);
    assert.equal(listing.active, 1);
    assert.equal(listing.price.toString(), price.toString());

    const buyerNftAta = ataAddress(nftMint, buyer.publicKey);
    const buyerSkrAta = ataAddress(skrMint, buyer.publicKey);
    const sellerSkrAta = ataAddress(skrMint, seller.publicKey);
    const feeSkrAta = ataAddress(skrMint, feeRecipient.publicKey);

    await program.methods
      .buyListingNft()
      .accounts({
        config: configPda,
        listing: listingPda,
        nftMint,
        buyer: buyer.publicKey,
        buyerNftAta,
        seller: seller.publicKey,
        sellerSkrAta,
        skrMint,
        buyerSkrAta,
        feeSkrAta,
        feeRecipient: feeRecipient.publicKey,
        escrowNftAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const listingAfter = await program.account.listingNft.fetch(listingPda);
    assert.equal(listingAfter.active, 0);

    const buyerNft = await getAccount(provider.connection, buyerNftAta);
    assert.equal(buyerNft.amount, 1n);

    const sellerSkr = await getAccount(provider.connection, sellerSkrAta);
    const feeSkr = await getAccount(provider.connection, feeSkrAta);
    assert.isTrue(sellerSkr.amount > 0n);
    assert.isTrue(feeSkr.amount > 0n);
  });

  it("Creates, bids, and finalizes an NFT auction (SKR)", async () => {
    const nftMint = await createMint(
      provider.connection,
      payerKp,
      seller.publicKey,
      null,
      0,
    );
    const sellerNftAta = await createAssociatedTokenAccount(
      provider.connection,
      payerKp,
      nftMint,
      seller.publicKey,
    );
    await mintTo(
      provider.connection,
      payerKp,
      nftMint,
      sellerNftAta,
      seller,
      1n,
    );

    const [auctionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("auction_nft"), nftMint.toBuffer()],
      program.programId,
    );
    const escrowNftAta = ataAddress(nftMint, auctionPda);
    const escrowSkrAta = ataAddress(skrMint, auctionPda);

    const now = Math.floor(Date.now() / 1000);
    const endTs = new anchor.BN(now + 2);

    await program.methods
      .createAuctionNft(endTs, new anchor.BN(1_000_000), new anchor.BN(100_000))
      .accounts({
        config: configPda,
        auction: auctionPda,
        nftMint,
        sellerNftAta,
        escrowNftAta,
        seller: seller.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const buyerSkrAta = ataAddress(skrMint, buyer.publicKey);
    const prevTopBidder = PublicKey.default;
    const prevTopBidderSkrAta = TOKEN_PROGRAM_ID; // unused for first bid; placeholder writable acct

    await program.methods
      .placeBid(new anchor.BN(1_200_000))
      .accounts({
        config: configPda,
        auction: auctionPda,
        skrMint,
        bidder: buyer.publicKey,
        bidderSkrAta: buyerSkrAta,
        escrowSkrAta,
        prevTopBidder,
        prevTopBidderSkrAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // wait until auction end
    await new Promise((r) => setTimeout(r, 2500));

    const winnerNftAta = ataAddress(nftMint, buyer.publicKey);
    const sellerSkrAta = ataAddress(skrMint, seller.publicKey);
    const feeSkrAta = ataAddress(skrMint, feeRecipient.publicKey);

    await program.methods
      .finalizeAuctionNft()
      .accounts({
        config: configPda,
        auction: auctionPda,
        nftMint,
        skrMint,
        seller: seller.publicKey,
        winner: buyer.publicKey,
        winnerNftAta,
        sellerSkrAta,
        feeSkrAta,
        feeRecipient: feeRecipient.publicKey,
        escrowNftAta,
        escrowSkrAta,
        payer: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const winnerNft = await getAccount(provider.connection, winnerNftAta);
    assert.equal(winnerNft.amount, 1n);
  });

  it("Scaffolds cNFT flows (proof + remaining accounts required)", async () => {
    // This test intentionally does NOT execute Bubblegum CPI.
    // It ensures the IDL is present and methods exist for client integration.
    assert.ok(program.methods.createListingCnft);
    assert.ok(program.methods.buyListingCnft);
    assert.ok(program.methods.createAuctionCnft);
    assert.ok(program.methods.finalizeAuctionCnft);
  });
});

