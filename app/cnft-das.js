/**
 * Minimal DAS + proof client for Bubblegum cNFT operations.
 *
 * Default behavior:
 * - Reads endpoint from `localStorage.DAS_RPC_URL` (preferred) or `window.__DAS_RPC_URL`.
 * - Reads API key from `localStorage.DAS_API_KEY` (optional, Helius-style).
 *
 * Expected provider compatibility:
 * - JSON-RPC methods: `getAsset` and `getAssetProof` (Helius DAS).
 */
import { PublicKey } from '@solana/web3.js';

function getDasEndpoint() {
  const fromWindow = typeof window !== 'undefined' ? window.__DAS_RPC_URL : null;
  const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('DAS_RPC_URL') : null;
  const apiKey = typeof localStorage !== 'undefined' ? localStorage.getItem('DAS_API_KEY') : null;

  let base = (fromStorage || fromWindow || '').trim();
  if (!base) return null;

  // Convenience: allow storing just the Helius API key.
  if (/^[A-Za-z0-9_\-]{20,}$/.test(base) && !base.includes('http')) {
    base = `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(base)}`;
  }

  if (apiKey && base.includes('helius-rpc.com') && !base.includes('api-key=')) {
    const join = base.includes('?') ? '&' : '?';
    base = `${base}${join}api-key=${encodeURIComponent(apiKey)}`;
  }

  return base;
}

async function jsonRpc(endpoint, method, params) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `DAS HTTP ${res.status}`);
  }
  if (body?.error) {
    throw new Error(body.error.message || 'DAS error');
  }
  return body.result;
}

export async function dasGetAsset(assetId) {
  const endpoint = getDasEndpoint();
  if (!endpoint) throw new Error('Missing DAS endpoint. Set localStorage.DAS_RPC_URL (and optional DAS_API_KEY).');
  return await jsonRpc(endpoint, 'getAsset', { id: assetId });
}

export async function dasGetAssetProof(assetId) {
  const endpoint = getDasEndpoint();
  if (!endpoint) throw new Error('Missing DAS endpoint. Set localStorage.DAS_RPC_URL (and optional DAS_API_KEY).');
  return await jsonRpc(endpoint, 'getAssetProof', { id: assetId });
}

function asU8_32FromBytesLike(x) {
  if (!x) throw new Error('Missing hash field');
  // Helius returns base58 strings for some hashes; some providers return arrays.
  if (typeof x === 'string') {
    const pk = new PublicKey(x);
    return Array.from(pk.toBytes());
  }
  if (Array.isArray(x) && x.length === 32) return x.map((n) => Number(n));
  if (x?.length === 32 && typeof x[0] === 'number') return Array.from(x);
  throw new Error('Unsupported hash format');
}

/**
 * Returns all Bubblegum transfer/delegate args + proof nodes.
 *
 * Output shape maps directly to the Anchor ix args:
 * - root, dataHash, creatorHash: number[32]
 * - nonce: bigint-safe JS number (u64) – callers should pass as BN in Anchor client
 * - index: number (u32)
 * - merkleTree: base58 pubkey string
 * - proof: base58 pubkey string[] (remaining accounts in that order)
 */
export async function getCnftProofBundle(assetId) {
  const [asset, proof] = await Promise.all([dasGetAsset(assetId), dasGetAssetProof(assetId)]);

  const merkleTree = asset?.compression?.tree || asset?.compression?.tree_id;
  const leafId = asset?.compression?.leaf_id;
  const leafIndex = asset?.compression?.leaf_index;
  const dataHash = asset?.compression?.data_hash;
  const creatorHash = asset?.compression?.creator_hash;

  if (!merkleTree) throw new Error('DAS asset missing compression.tree');
  if (leafId == null) throw new Error('DAS asset missing compression.leaf_id');
  if (!dataHash) throw new Error('DAS asset missing compression.data_hash');
  if (!creatorHash) throw new Error('DAS asset missing compression.creator_hash');

  const root = proof?.root;
  const path = proof?.proof || proof?.proofs;
  if (!root) throw new Error('DAS proof missing root');
  if (!Array.isArray(path) || path.length === 0) throw new Error('DAS proof missing proof nodes');

  return {
    merkleTree,
    root: asU8_32FromBytesLike(root),
    dataHash: asU8_32FromBytesLike(dataHash),
    creatorHash: asU8_32FromBytesLike(creatorHash),
    nonce: Number(leafId), // u64; convert to BN in Anchor client when constructing ix args
    index: Number(proof?.node_index ?? proof?.leaf_index ?? leafIndex),
    proof: path,
  };
}

