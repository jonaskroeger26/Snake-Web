#!/usr/bin/env node
/**
 * Send the BPF Loader Upgradable "Close" instruction manually to reclaim SOL
 * from 2iAqUiT9... to 3R6Ft4...
 *
 * Run from repo root (so node_modules/@solana/web3.js is available):
 *   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY node scripts/send-close-buffer.js
 *
 * Uses keypair at KEYPAIR_PATH or ~/.config/solana/id.json as buffer authority (signer).
 */

import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUFFER_ADDRESS = "2iAqUiT9bHmkAU4QvUgkMR1AsfcYin38Xna834zzL7s3";
// Program whose ProgramData is 2iAqUiT9... (required when closing ProgramData, not Buffer).
const PROGRAM_ID = new PublicKey("67KYfnCHNioKkcwWrgJ7N17wCyJjf2VaGtTVd1gtpQAX");
// Where to send the ~1.28 SOL when buffer is closed. Default: your main wallet (id.json).
const RECIPIENT =
  process.env.RECIPIENT_ADDRESS || "3R6Ft4K2yYioguKNdxiuEJ2Vhsm2B3KmwBVCAzqtvnv5";
const BPF_LOADER_UPGRADEABLE_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

// UpgradeableLoaderInstruction::Close = 5
const CLOSE_DISCRIMINATOR = Buffer.from([5]);

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const keypairPath =
    process.env.KEYPAIR_PATH ||
    path.join(process.env.HOME || os.homedir(), ".config/solana/id.json");

  const connection = new Connection(rpcUrl, "confirmed");
  const bufferPubkey = new PublicKey(BUFFER_ADDRESS);
  const recipientPubkey = new PublicKey(RECIPIENT);

  // Load authority keypair
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const authority = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  // Fetch account and get authority from data (Buffer vs ProgramData have different layouts)
  const acc = await connection.getAccountInfo(bufferPubkey);
  if (!acc) {
    console.error("Account not found.");
    process.exit(1);
  }
  if (!acc.owner.equals(BPF_LOADER_UPGRADEABLE_ID)) {
    console.error("Account is not owned by BPF Loader Upgradable. Owner:", acc.owner.toBase58());
    process.exit(1);
  }
  const data = acc.data;
  if (data.length < 45) {
    console.error("Account data too short.");
    process.exit(1);
  }
  // UpgradeableLoaderState: 0=Uninitialized, 1=Buffer, 2=Program, 3=ProgramData (bincode enum = 1 byte)
  const state = data[0];
  let authorityFromAccount;
  if (state === 1) {
    // Buffer: 1 byte state + 1 byte Option tag + 32 bytes pubkey => authority at 5..37
    authorityFromAccount = new PublicKey(data.slice(5, 37));
  } else if (state === 3) {
    // ProgramData: 1 byte state + 8 bytes slot + 1 byte Option + 32 bytes pubkey => authority at 13..45
    authorityFromAccount = new PublicKey(data.slice(13, 45));
  } else {
    console.error("Account is not a Buffer or ProgramData (state byte:", state, ")");
    process.exit(1);
  }
  if (!authorityFromAccount.equals(authority.publicKey)) {
    console.error(
      "Your keypair is not the authority. Stored authority is:",
      authorityFromAccount.toBase58()
    );
    process.exit(1);
  }

  console.log("Closing", state === 3 ? "ProgramData" : "buffer", BUFFER_ADDRESS, "-> sending", acc.lamports / 1e9, "SOL to", RECIPIENT);

  const keys = [
    { pubkey: bufferPubkey, isSigner: false, isWritable: true },
    { pubkey: recipientPubkey, isSigner: false, isWritable: true },
    { pubkey: authority.publicKey, isSigner: true, isWritable: false },
  ];
  if (state === 3) {
    keys.push({ pubkey: PROGRAM_ID, isSigner: false, isWritable: true });
  }
  const ix = new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_ID,
    keys,
    data: CLOSE_DISCRIMINATOR,
  });

  const tx = new Transaction().add(ix);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;

  const sig = await connection.sendTransaction(tx, [authority], { skipPreflight: false });
  console.log("Transaction sent:", sig);
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  console.log("Confirmed. SOL has been sent to", RECIPIENT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
