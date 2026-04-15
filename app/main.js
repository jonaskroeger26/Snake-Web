/**
 * Creature Collect — web MVP: real map, GPS-only position, spawns, collection, location-trust anti-spoof.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMarketplaceClient, makeWalletAdapter, PROGRAM_ID, SKR_MINT } from './marketplace.js';

// --- Sound Engine (Web Audio synth — zero audio files) ---
const SFX = (() => {
  let ctx;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (freq, dur, type = 'sine', vol = 0.18, delay = 0) => {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + delay);
      o.stop(c.currentTime + delay + dur + 0.05);
    } catch {}
  };
  return {
    tap: () => tone(800, 0.04, 'square', 0.06),
    catchSuccess: () => { tone(523, 0.12, 'sine', 0.2); tone(659, 0.12, 'sine', 0.18, 0.1); tone(784, 0.2, 'sine', 0.22, 0.2); },
    catchRare: () => { tone(523, 0.1, 'sine', 0.22); tone(659, 0.1, 'sine', 0.2, 0.08); tone(784, 0.15, 'sine', 0.22, 0.16); tone(1047, 0.3, 'triangle', 0.18, 0.28); },
    catchFail: () => { tone(300, 0.15, 'sawtooth', 0.12); tone(220, 0.25, 'sawtooth', 0.1, 0.1); },
    combo: (n) => tone(600 + n * 80, 0.08, 'square', 0.1),
    levelUp: () => { tone(523, 0.1, 'sine', 0.2); tone(659, 0.08, 'sine', 0.2, 0.1); tone(784, 0.08, 'sine', 0.2, 0.18); tone(1047, 0.35, 'triangle', 0.25, 0.26); },
    itemUse: () => { tone(400, 0.08, 'sine', 0.12); tone(800, 0.15, 'sine', 0.14, 0.06); tone(1200, 0.12, 'triangle', 0.1, 0.14); },
    questDone: () => { tone(880, 0.12, 'sine', 0.18); tone(1100, 0.2, 'triangle', 0.16, 0.1); },
    dailyReward: () => { tone(440, 0.1, 'sine', 0.15); tone(554, 0.1, 'sine', 0.15, 0.1); tone(659, 0.1, 'sine', 0.15, 0.2); tone(880, 0.25, 'triangle', 0.2, 0.3); },
    hatch: () => { tone(350, 0.06, 'square', 0.1); tone(400, 0.06, 'square', 0.1, 0.1); tone(500, 0.06, 'square', 0.1, 0.2); tone(700, 0.12, 'sine', 0.2, 0.3); tone(1000, 0.3, 'triangle', 0.2, 0.4); },
    evolve: () => { for (let i = 0; i < 6; i++) tone(400 + i * 120, 0.12, 'sine', 0.15, i * 0.08); tone(1200, 0.4, 'triangle', 0.22, 0.5); },
    achievement: () => { tone(880, 0.15, 'sine', 0.2); tone(1100, 0.12, 'sine', 0.18, 0.12); tone(1320, 0.25, 'triangle', 0.2, 0.22); },
  };
})();

// --- Haptics (Capacitor or fallback) ---
const Haptic = (() => {
  const vib = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
  return {
    light: () => vib(10),
    medium: () => vib(25),
    heavy: () => vib(50),
    success: () => vib([15, 30, 25]),
    error: () => vib([40, 20, 40]),
    double: () => vib([20, 40, 20]),
  };
})();

// --- Catalog ---
const RARITY = { Common: 'Common', Rare: 'Rare', Epic: 'Epic', Legendary: 'Legendary' };
const BIOME = { City: 'City', Nature: 'Nature', Water: 'Water' };

function creaturePortraitUrl(id) {
  return `/creatures/${id}.png`;
}

const CREATURES = [
  { id: 'sproutle', name: 'Sproutle', rarity: RARITY.Common, biome: BIOME.Nature, w: 12 },
  { id: 'alleypup', name: 'Alleypup', rarity: RARITY.Common, biome: BIOME.City, w: 11 },
  { id: 'brookfin', name: 'Brookfin', rarity: RARITY.Common, biome: BIOME.Water, w: 10 },
  { id: 'pebblit', name: 'Pebblit', rarity: RARITY.Common, biome: BIOME.City, w: 10 },
  { id: 'mossnub', name: 'Mossnub', rarity: RARITY.Common, biome: BIOME.Nature, w: 10 },
  { id: 'pigeonix', name: 'Pigeonix', rarity: RARITY.Common, biome: BIOME.City, w: 9 },
  { id: 'reedle', name: 'Reedle', rarity: RARITY.Common, biome: BIOME.Water, w: 9 },
  { id: 'embermoth', name: 'Embermoth', rarity: RARITY.Common, biome: BIOME.City, w: 8 },
  { id: 'voltkit', name: 'Voltkit', rarity: RARITY.Common, biome: BIOME.City, w: 8 },
  { id: 'nightowl', name: 'Nightowl', rarity: RARITY.Common, biome: BIOME.Nature, w: 8 },
  { id: 'rustboar', name: 'Rustboar', rarity: RARITY.Common, biome: BIOME.City, w: 7 },
  { id: 'leaflit', name: 'Leaflit', rarity: RARITY.Common, biome: BIOME.Nature, w: 7 },
  { id: 'tidehorn', name: 'Tidehorn', rarity: RARITY.Rare, biome: BIOME.Water, w: 6 },
  { id: 'thorncat', name: 'Thorncat', rarity: RARITY.Rare, biome: BIOME.Nature, w: 6 },
  { id: 'glimmerbat', name: 'Glimmerbat', rarity: RARITY.Rare, biome: BIOME.City, w: 5 },
  { id: 'frostimp', name: 'Frostimp', rarity: RARITY.Rare, biome: BIOME.Nature, w: 5 },
  { id: 'cobaltfrog', name: 'Cobaltfrog', rarity: RARITY.Rare, biome: BIOME.Water, w: 5 },
  { id: 'stormlynx', name: 'Stormlynx', rarity: RARITY.Epic, biome: BIOME.Nature, w: 3 },
  { id: 'abyssray', name: 'Abyssray', rarity: RARITY.Epic, biome: BIOME.Water, w: 3 },
  { id: 'solwyrm', name: 'Solwyrm', rarity: RARITY.Legendary, biome: BIOME.City, w: 1 },
];

const CATCH_RATE = {
  [RARITY.Common]: 0.9,
  [RARITY.Rare]: 0.7,
  [RARITY.Epic]: 0.4,
  [RARITY.Legendary]: 0.15,
};

const STORAGE_KEY = 'creature_collect_web_v1';
const CAUGHT_SPAWN_KEY = 'creature_collect_spawn_ids_v1';
const WALK_KEY = 'creature_collect_walk_v1';
const GAME_KEY = 'creature_collect_game_v2';

// --- Items catalog ---
const ITEMS = {
  ultraBall: { id: 'ultraBall', name: 'Ultra Ball', desc: '+40% catch rate (1 use)', icon: '🎯' },
  rareScent: { id: 'rareScent', name: 'Rare Scent', desc: 'Next 3 catches guaranteed Rare+', icon: '💎' },
  xpBoost: { id: 'xpBoost', name: 'XP Boost', desc: '2x XP for 10 min', icon: '⚡' },
  lure: { id: 'lure', name: 'Lure Beacon', desc: '2x spawns nearby for 5 min', icon: '📡' },
  biomeShift: { id: 'biomeShift', name: 'Biome Shift', desc: 'Change local biome for 3 min', icon: '🌀' },
  radar: { id: 'radar', name: 'Radar Pulse', desc: 'Reveal all spawns within 1km', icon: '📡' },
};
const ITEM_IDS = Object.keys(ITEMS);

const XP_PER_CATCH = { [RARITY.Common]: 25, [RARITY.Rare]: 75, [RARITY.Epic]: 200, [RARITY.Legendary]: 500 };
const COMBO_TIMEOUT_MS = 180_000;
const COMBO_CATCH_BONUS = 0.10;
const COMBO_XP_BONUS = 0.25;

// --- Quest pool ---
const QUEST_POOL = [
  { id: 'catch3', desc: 'Catch 3 creatures', goal: 3, track: 'catches', xp: 80, item: 'ultraBall' },
  { id: 'catch5', desc: 'Catch 5 creatures', goal: 5, track: 'catches', xp: 150, item: 'rareScent' },
  { id: 'walk500', desc: 'Walk 500m', goal: 500, track: 'walkM', xp: 100, item: 'xpBoost' },
  { id: 'walk1k', desc: 'Walk 1 km', goal: 1000, track: 'walkM', xp: 180, item: 'lure' },
  { id: 'walk2k', desc: 'Walk 2 km', goal: 2000, track: 'walkM', xp: 250, item: 'radar' },
  { id: 'rareOrBetter', desc: 'Catch a Rare or better', goal: 1, track: 'rareCatches', xp: 120, item: 'rareScent' },
  { id: 'species2', desc: 'Catch 2 different species', goal: 2, track: 'uniqueSpecies', xp: 100, item: 'ultraBall' },
  { id: 'useItem', desc: 'Use an item', goal: 1, track: 'itemUses', xp: 60, item: 'xpBoost' },
  { id: 'biomes', desc: 'Catch from 2 different biomes', goal: 2, track: 'uniqueBiomes', xp: 140, item: 'biomeShift' },
];

const STREAK_REWARDS = [
  { items: { ultraBall: 1 }, xp: 0 },
  { items: { rareScent: 1 }, xp: 0 },
  { items: { ultraBall: 2 }, xp: 100 },
  { items: { lure: 1 }, xp: 0 },
  { items: { radar: 1 }, xp: 200 },
  { items: { rareScent: 2, biomeShift: 1 }, xp: 0 },
  { items: { ultraBall: 1, rareScent: 1, xpBoost: 1, lure: 1, biomeShift: 1, radar: 1 }, xp: 500 },
];

// --- Evolution chains ---
const EVOLUTIONS = [
  { from: 'sproutle', to: 'thornsprout', toName: 'Thornsprout', toRarity: RARITY.Rare, cost: 500, catches: 3 },
  { from: 'alleypup', to: 'steelhound', toName: 'Steelhound', toRarity: RARITY.Rare, cost: 500, catches: 3 },
  { from: 'brookfin', to: 'torrentfin', toName: 'Torrentfin', toRarity: RARITY.Rare, cost: 500, catches: 3 },
  { from: 'voltkit', to: 'thunderpaw', toName: 'Thunderpaw', toRarity: RARITY.Rare, cost: 600, catches: 3 },
  { from: 'thorncat', to: 'sabreclaw', toName: 'Sabreclaw', toRarity: RARITY.Epic, cost: 1500, catches: 3 },
  { from: 'cobaltfrog', to: 'azuretoad', toName: 'Azuretoad', toRarity: RARITY.Epic, cost: 1500, catches: 3 },
  { from: 'stormlynx', to: 'thunderlord', toName: 'Thunderlord', toRarity: RARITY.Legendary, cost: 5000, catches: 3 },
  { from: 'embermoth', to: 'infernowing', toName: 'Infernowing', toRarity: RARITY.Epic, cost: 2000, catches: 4 },
];

function getEvolution(creatureId) { return EVOLUTIONS.find(e => e.from === creatureId); }

// --- Egg tiers ---
const EGG_TIERS = [
  { km: 1, label: '1 km', rarities: [RARITY.Common] },
  { km: 3, label: '3 km', rarities: [RARITY.Common, RARITY.Rare] },
  { km: 5, label: '5 km', rarities: [RARITY.Rare, RARITY.Epic, RARITY.Legendary] },
];

// --- Achievements ---
const ACHIEVEMENTS = [
  { id: 'firstSteps', name: 'First Steps', desc: 'Walk 100m', icon: '👟' },
  { id: 'explorer', name: 'Explorer', desc: 'Walk 5km total', icon: '🗺️' },
  { id: 'marathon', name: 'Marathon', desc: 'Walk 25km total', icon: '🏃' },
  { id: 'collector', name: 'Collector', desc: 'Catch 10 unique species', icon: '📚' },
  { id: 'completionist', name: 'Completionist', desc: 'Catch all 20 species', icon: '🏆' },
  { id: 'comboKing', name: 'Combo King', desc: 'Hit a x5 combo', icon: '🔥' },
  { id: 'evolveOne', name: 'Evolver', desc: 'Evolve any creature', icon: '✨' },
  { id: 'streakMaster', name: 'Streak Master', desc: '7-day login streak', icon: '📅' },
  { id: 'hatcher', name: 'Hatcher', desc: 'Hatch 5 eggs', icon: '🥚' },
  { id: 'legendaryHunter', name: 'Legendary Hunter', desc: 'Catch a Legendary', icon: '⭐' },
];

// --- Solana Wallet ---
const SOL_RPC = 'https://api.mainnet-beta.solana.com';
const solConn = new Connection(SOL_RPC, 'confirmed');
const RECEIVER_WALLET = '5Daio4VwWzQqKFeQEiZ3iiE6HqTT6FGk5RwP28gTim9g';

const walletState = { connected: false, publicKey: null, balance: 0, provider: null };
let marketClient = null;

function getPhantomProvider() {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

async function connectWallet() {
  // Prefer in-app MWA adapter when available (Seeker / dapp-store wrapper).
  const mwa = window.__snakeWalletAdapter;
  const provider =
    mwa && typeof mwa.connect === 'function' && typeof mwa.signTransaction === 'function'
      ? mwa
      : getPhantomProvider();
  if (!provider) {
    showGenericToast('Install Phantom wallet or use Seeker wallet', '👻');
    window.open('https://phantom.app/', '_blank');
    return false;
  }
  try {
    const resp = await provider.connect();
    walletState.connected = true;
    walletState.publicKey = resp?.publicKey ? resp.publicKey : new PublicKey(resp);
    walletState.provider = provider;
    await refreshBalance();
    renderWalletUI();
    showGenericToast('Wallet connected!', '🔗');
    return true;
  } catch (e) {
    showGenericToast('Connection rejected', '❌');
    return false;
  }
}

async function disconnectWallet() {
  try { await walletState.provider?.disconnect(); } catch {}
  walletState.connected = false;
  walletState.publicKey = null;
  walletState.balance = 0;
  walletState.provider = null;
  renderWalletUI();
}

async function refreshBalance() {
  if (!walletState.publicKey) return;
  try {
    const bal = await solConn.getBalance(walletState.publicKey);
    walletState.balance = bal / LAMPORTS_PER_SOL;
  } catch { walletState.balance = 0; }
}

async function sendSol(lamports, memo) {
  if (!walletState.connected || !walletState.provider) {
    const ok = await connectWallet();
    if (!ok) return false;
  }
  try {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletState.publicKey,
        toPubkey: new PublicKey(RECEIVER_WALLET),
        lamports,
      })
    );
    tx.feePayer = walletState.publicKey;
    const { blockhash } = await solConn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    const signed = await walletState.provider.signTransaction(tx);
    const sig = await solConn.sendRawTransaction(signed.serialize());
    await solConn.confirmTransaction(sig, 'confirmed');
    await refreshBalance();
    renderWalletUI();
    SFX.achievement();
    Haptic.success();
    showGenericToast(memo || 'Payment confirmed!', '✅');
    return true;
  } catch (e) {
    showGenericToast(e.message?.slice(0, 60) || 'Transaction failed', '❌');
    return false;
  }
}

function renderWalletUI() {
  const btn = document.getElementById('walletConnectBtn');
  const info = document.getElementById('walletInfo');
  const balEl = document.getElementById('walletBalance');
  const addrEl = document.getElementById('walletAddr');
  if (!btn) return;
  if (walletState.connected) {
    btn.textContent = 'Disconnect';
    btn.classList.remove('btn--primary');
    btn.classList.add('btn--ghost');
    if (info) info.classList.remove('hidden');
    if (balEl) balEl.textContent = `${walletState.balance.toFixed(4)} SOL`;
    if (addrEl) {
      const pk = walletState.publicKey.toBase58();
      addrEl.textContent = pk.slice(0, 4) + '...' + pk.slice(-4);
    }
  } else {
    btn.textContent = 'Connect Wallet';
    btn.classList.add('btn--primary');
    btn.classList.remove('btn--ghost');
    if (info) info.classList.add('hidden');
  }
}

// -------------------------
// Marketplace UI
// -------------------------

function getWalletForAnchor() {
  const provider = walletState.provider;
  if (!provider || !walletState.publicKey) return null;
  return makeWalletAdapter({
    connect: () => provider.connect?.(),
    disconnect: () => provider.disconnect?.(),
    getPublicKey: () => walletState.publicKey,
    signTransaction: async (tx) => {
      if (typeof provider.signTransaction === 'function') return await provider.signTransaction(tx);
      throw new Error('Wallet cannot sign transactions');
    },
  });
}

async function ensureMarketClient() {
  if (!walletState.connected) {
    const ok = await connectWallet();
    if (!ok) throw new Error('Wallet not connected');
  }
  const wallet = getWalletForAnchor();
  if (!wallet) throw new Error('Wallet unavailable');
  if (!marketClient) {
    marketClient = createMarketplaceClient({ rpcUrl: SOL_RPC, wallet });
  } else {
    // keep provider wallet public key updated if user switched accounts
    marketClient.provider.wallet.publicKey = wallet.publicKey;
  }
  return marketClient;
}

async function renderMarket() {
  try {
    const programEl = document.getElementById('marketProgramId');
    const skrEl = document.getElementById('marketSkrMint');
    const feeEl = document.getElementById('marketFeeBps');
    const listingsEl = document.getElementById('marketListings');

    if (programEl) programEl.textContent = PROGRAM_ID.toBase58();
    if (skrEl) skrEl.textContent = SKR_MINT.toBase58();

    const client = await ensureMarketClient();
    const cfg = await client.fetchConfig();
    if (feeEl) feeEl.textContent = cfg ? `${cfg.feeBps} bps` : 'Not initialized';

    const refreshBtn = document.getElementById('marketRefreshBtn');
    const createBtn = document.getElementById('marketCreateListingBtn');
    const mintInput = document.getElementById('marketMintInput');
    const priceInput = document.getElementById('marketPriceInput');
    const assetInput = document.getElementById('marketAssetIdInput');
    const loadProofBtn = document.getElementById('marketLoadCnftProofBtn');
    const proofOut = document.getElementById('marketCnftProofOut');

    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener('click', () => renderMarket());
    }
    if (createBtn && !createBtn.__bound) {
      createBtn.__bound = true;
      createBtn.addEventListener('click', async () => {
        try {
          SFX.tap();
          const mint = String(mintInput?.value || '').trim();
          const price = String(priceInput?.value || '').trim();
          if (!mint || !price) throw new Error('Mint + price required');
          const sig = await client.createNftListing({ mint, price });
          showGenericToast(`Listed! ${String(sig).slice(0, 8)}…`, '✅');
          await renderMarket();
        } catch (e) {
          showGenericToast(e.message?.slice(0, 70) || 'Listing failed', '❌');
        }
      });
    }
    if (loadProofBtn && !loadProofBtn.__bound) {
      loadProofBtn.__bound = true;
      loadProofBtn.addEventListener('click', async () => {
        try {
          SFX.tap();
          const assetId = String(assetInput?.value || '').trim();
          if (!assetId) throw new Error('Asset id required');
          if (proofOut) proofOut.textContent = 'Loading proof…';
          const bundle = await client.loadCnftBundle(assetId);
          if (proofOut) {
            proofOut.textContent = `Tree ${bundle.merkleTree.slice(0, 4)}...${bundle.merkleTree.slice(-4)} · index ${bundle.index} · proof nodes ${bundle.proof.length}`;
          }
        } catch (e) {
          if (proofOut) proofOut.textContent = '—';
          showGenericToast(e.message?.slice(0, 70) || 'Proof load failed', '❌');
        }
      });
    }

    const { nfts, cnfts } = await client.fetchListings();
    if (!listingsEl) return;

    const rows = [];
    rows.push(`<strong>NFT listings</strong> (${nfts.length})`);
    for (const l of nfts) {
      const a = l.account;
      const mint = a.mint.toBase58();
      const seller = a.seller.toBase58();
      const price = a.price.toString();
      rows.push(
        `<div style="margin-top:8px; padding:10px; border:1px solid rgba(0,255,255,0.1); border-radius:10px;">
          <div><span class="muted">Mint</span> ${mint.slice(0, 4)}...${mint.slice(-4)}</div>
          <div><span class="muted">Seller</span> ${seller.slice(0, 4)}...${seller.slice(-4)}</div>
          <div><span class="muted">Price</span> ${price}</div>
          <button class="btn btn--primary btn--sm" data-buy-nft="${mint}" data-seller="${seller}" style="margin-top:8px;">Buy</button>
        </div>`
      );
    }

    rows.push(`<div style="margin-top:12px;"><strong>cNFT listings</strong> (${cnfts.length})</div>`);
    for (const l of cnfts) {
      const a = l.account;
      const tree = a.merkleTree.toBase58();
      const seller = a.seller.toBase58();
      const price = a.price.toString();
      rows.push(
        `<div style="margin-top:8px; padding:10px; border:1px solid rgba(0,255,255,0.1); border-radius:10px;">
          <div><span class="muted">Tree</span> ${tree.slice(0, 4)}...${tree.slice(-4)}</div>
          <div><span class="muted">Index</span> ${a.index}</div>
          <div><span class="muted">Seller</span> ${seller.slice(0, 4)}...${seller.slice(-4)}</div>
          <div><span class="muted">Price</span> ${price}</div>
          <div class="muted" style="margin-top:6px; font-size:12px;">Buy via cNFT asset id + proof bundle (use helper below).</div>
        </div>`
      );
    }

    listingsEl.innerHTML = rows.join('');

    // Bind buy buttons
    listingsEl.querySelectorAll('[data-buy-nft]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          SFX.tap();
          const mint = btn.getAttribute('data-buy-nft');
          const seller = btn.getAttribute('data-seller');
          const sig = await client.buyNftListing({ mint, seller });
          showGenericToast(`Bought! ${String(sig).slice(0, 8)}…`, '✅');
          await renderMarket();
        } catch (e) {
          showGenericToast(e.message?.slice(0, 70) || 'Buy failed', '❌');
        }
      });
    });
  } catch (e) {
    showGenericToast(e.message?.slice(0, 70) || 'Marketplace error', '❌');
  }
}

// --- Battle Pass ---
const BATTLE_PASS = {
  season: 1,
  name: 'Season 1: Neon Genesis',
  costLamports: 100_000_000,
  tiers: [
    { level: 1,  xpReq: 0,    free: { stardust: 50 },   premium: { item: 'ultraBall', qty: 3 } },
    { level: 2,  xpReq: 100,  free: { stardust: 75 },   premium: { item: 'rareScent', qty: 1 } },
    { level: 3,  xpReq: 250,  free: { stardust: 100 },  premium: { item: 'xpBoost', qty: 1 } },
    { level: 4,  xpReq: 400,  free: { stardust: 100 },  premium: { item: 'ultraBall', qty: 5 } },
    { level: 5,  xpReq: 600,  free: { item: 'ultraBall', qty: 2 },  premium: { item: 'lure', qty: 2 } },
    { level: 6,  xpReq: 850,  free: { stardust: 150 },  premium: { stardust: 500 } },
    { level: 7,  xpReq: 1100, free: { stardust: 150 },  premium: { item: 'rareScent', qty: 2 } },
    { level: 8,  xpReq: 1400, free: { item: 'ultraBall', qty: 1 },  premium: { item: 'radar', qty: 2 } },
    { level: 9,  xpReq: 1700, free: { stardust: 200 },  premium: { item: 'biomeShift', qty: 2 } },
    { level: 10, xpReq: 2000, free: { item: 'rareScent', qty: 1 },  premium: { stardust: 1000 } },
    { level: 11, xpReq: 2400, free: { stardust: 200 },  premium: { item: 'ultraBall', qty: 5 } },
    { level: 12, xpReq: 2800, free: { stardust: 250 },  premium: { item: 'xpBoost', qty: 2 } },
    { level: 13, xpReq: 3200, free: { item: 'ultraBall', qty: 2 },  premium: { item: 'lure', qty: 3 } },
    { level: 14, xpReq: 3600, free: { stardust: 250 },  premium: { item: 'rareScent', qty: 3 } },
    { level: 15, xpReq: 4000, free: { stardust: 300 },  premium: { stardust: 1500 } },
    { level: 16, xpReq: 4500, free: { stardust: 300 },  premium: { item: 'radar', qty: 3 } },
    { level: 17, xpReq: 5000, free: { item: 'ultraBall', qty: 3 },  premium: { item: 'biomeShift', qty: 3 } },
    { level: 18, xpReq: 5500, free: { stardust: 350 },  premium: { item: 'xpBoost', qty: 3 } },
    { level: 19, xpReq: 6000, free: { stardust: 350 },  premium: { item: 'lure', qty: 3 } },
    { level: 20, xpReq: 6500, free: { item: 'rareScent', qty: 1 },  premium: { stardust: 2000 } },
    { level: 21, xpReq: 7000, free: { stardust: 400 },  premium: { item: 'ultraBall', qty: 8 } },
    { level: 22, xpReq: 7500, free: { stardust: 400 },  premium: { item: 'rareScent', qty: 3 } },
    { level: 23, xpReq: 8000, free: { item: 'ultraBall', qty: 3 },  premium: { item: 'radar', qty: 4 } },
    { level: 24, xpReq: 8500, free: { stardust: 450 },  premium: { item: 'biomeShift', qty: 4 } },
    { level: 25, xpReq: 9000, free: { stardust: 500 },  premium: { stardust: 3000 } },
    { level: 26, xpReq: 9500, free: { stardust: 500 },  premium: { item: 'xpBoost', qty: 4 } },
    { level: 27, xpReq: 10000, free: { item: 'rareScent', qty: 2 },  premium: { item: 'lure', qty: 5 } },
    { level: 28, xpReq: 10500, free: { stardust: 600 },  premium: { item: 'rareScent', qty: 5 } },
    { level: 29, xpReq: 11000, free: { stardust: 700 },  premium: { stardust: 5000 } },
    { level: 30, xpReq: 12000, free: { stardust: 1000 }, premium: { stardust: 10000 } },
  ],
};

function getBPTotalXP() {
  let total = 0;
  for (let i = 0; i < game.level - 1; i++) total += xpForLevel(i + 1);
  total += game.xp;
  return total;
}

function getCurrentBPTier() {
  const totalXP = getBPTotalXP();
  let tier = 0;
  for (const t of BATTLE_PASS.tiers) {
    if (totalXP >= t.xpReq) tier = t.level;
  }
  return tier;
}

function claimBPReward(tierLevel, track) {
  const tier = BATTLE_PASS.tiers.find(t => t.level === tierLevel);
  if (!tier) return;
  const currentTier = getCurrentBPTier();
  if (tierLevel > currentTier) return;
  const bp = game.battlePass;
  if (track === 'free') {
    if (bp.claimedFree.includes(tierLevel)) return;
    grantBPReward(tier.free);
    bp.claimedFree.push(tierLevel);
  } else {
    if (!bp.premium) { showGenericToast('Upgrade to Premium first!', '🔒'); return; }
    if (bp.claimedPremium.includes(tierLevel)) return;
    grantBPReward(tier.premium);
    bp.claimedPremium.push(tierLevel);
  }
  saveGame();
  SFX.questDone();
  Haptic.success();
  renderBattlePass();
}

function grantBPReward(reward) {
  if (reward.stardust) { game.stardust += reward.stardust; }
  if (reward.item) { addItem(reward.item, reward.qty || 1); }
}

async function upgradeBattlePass() {
  if (game.battlePass.premium) { showGenericToast('Already upgraded!', '✅'); return; }
  const ok = await sendSol(BATTLE_PASS.costLamports, 'Battle Pass unlocked!');
  if (ok) {
    game.battlePass.premium = true;
    saveGame();
    renderBattlePass();
  }
}

// --- Shop Bundles ---
const SHOP_BUNDLES = [
  { id: 'starter', name: 'Starter Pack', price: 0.02, lamports: 20_000_000, items: { ultraBall: 5, rareScent: 2 }, icon: '🎯' },
  { id: 'explorer', name: 'Explorer Pack', price: 0.03, lamports: 30_000_000, items: { lure: 3, radar: 3 }, icon: '🗺️' },
  { id: 'mega', name: 'Mega Bundle', price: 0.08, lamports: 80_000_000, items: { ultraBall: 10, rareScent: 5, xpBoost: 5, lure: 5, biomeShift: 5, radar: 5 }, icon: '💎' },
];

async function buyBundle(bundleId) {
  const bundle = SHOP_BUNDLES.find(b => b.id === bundleId);
  if (!bundle) return;
  const ok = await sendSol(bundle.lamports, `${bundle.name} purchased!`);
  if (ok) {
    for (const [itemId, qty] of Object.entries(bundle.items)) {
      addItem(itemId, qty);
    }
    saveGame();
    renderItems();
    renderShop();
  }
}

const CELL_M = 250;
const REFRESH_S = 45;
const SCAN_RADIUS = 4;
const CATCH_RADIUS_M = 50;
const MIN_TRUST_TO_CATCH = 40;
const MAX_SPEED_MPS = 42;
const TELEPORT_M = 280;
const TELEPORT_S = 2.8;

// Distance tiers: rarity unlocks at distance from player
const TIER_THRESHOLDS = {
  [RARITY.Common]: 0,
  [RARITY.Rare]: 150,
  [RARITY.Epic]: 400,
  [RARITY.Legendary]: 700,
};

// Walk milestones (meters) that trigger bonus spawns
const WALK_MILESTONES = [250, 500, 1000, 2000, 5000, 10000];

// --- Geo helpers ---
function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const p1 = (aLat * Math.PI) / 180;
  const p2 = (bLat * Math.PI) / 180;
  const dp = ((bLat - aLat) * Math.PI) / 180;
  const dl = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getCell(lat, lng) {
  const latRad = (lat * Math.PI) / 180;
  const mx = lng * 111320 * Math.cos(latRad);
  const my = lat * 110540;
  return {
    cx: Math.floor(mx / CELL_M),
    cy: Math.floor(my / CELL_M),
  };
}

function cellCenterLatLng(cx, cy, refLat) {
  const centerX = (cx + 0.5) * CELL_M;
  const centerY = (cy + 0.5) * CELL_M;
  const lat = centerY / 110540;
  const latRad = (refLat * Math.PI) / 180;
  const lng = centerX / (111320 * Math.cos(latRad));
  return { lat, lng };
}

function offsetMeters(originLat, originLng, eastM, northM) {
  const dLat = northM / 110540;
  const dLng = eastM / (111320 * Math.cos((originLat * Math.PI) / 180));
  return { lat: originLat + dLat, lng: originLng + dLng };
}

function estimateBiome(cx, cy) {
  const v = Math.abs(cx * 73856093 ^ cy * 19349663) % 100;
  if (v < 15) return BIOME.Water;
  if (v < 55) return BIOME.City;
  return BIOME.Nature;
}

function cellSeed(cx, cy, bucket) {
  let h = 17;
  h = (h * 31 + cx) | 0;
  h = (h * 31 + cy) | 0;
  h = (h * 31 + (bucket & 0x7fffffff)) | 0;
  return h;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rollRarity(rng) {
  const roll = Math.floor(rng() * 100);
  if (roll < 70) return RARITY.Common;
  if (roll < 90) return RARITY.Rare;
  if (roll < 99) return RARITY.Epic;
  return RARITY.Legendary;
}

function pickCreature(rarity, biome, rng) {
  let pool = CREATURES.filter((c) => c.rarity === rarity && c.biome === biome);
  if (pool.length === 0) pool = CREATURES.filter((c) => c.rarity === rarity);
  if (pool.length === 0) pool = CREATURES;
  let total = 0;
  for (const c of pool) total += Math.max(1, c.w);
  let r = rng() * total;
  for (const c of pool) {
    r -= Math.max(1, c.w);
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

function nearbyCells(pcx, pcy, rad) {
  const out = [];
  for (let x = -rad; x <= rad; x++) {
    for (let y = -rad; y <= rad; y++) {
      out.push({ cx: pcx + x, cy: pcy + y });
    }
  }
  return out;
}

// --- Walk tracker ---
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadWalk() {
  try {
    const raw = localStorage.getItem(WALK_KEY);
    if (!raw) return { day: todayKey(), meters: 0, milestoneIdx: 0 };
    const d = JSON.parse(raw);
    if (d.day !== todayKey()) return { day: todayKey(), meters: 0, milestoneIdx: 0 };
    return d;
  } catch {
    return { day: todayKey(), meters: 0, milestoneIdx: 0 };
  }
}

function saveWalk(w) {
  localStorage.setItem(WALK_KEY, JSON.stringify(w));
}

let walkData = loadWalk();

// --- Game state (inventory, xp, quests, streak, combo) ---
function defaultGameState() {
  return {
    inventory: {},
    xp: 0,
    level: 1,
    streak: { lastDay: null, count: 0 },
    quests: { day: null, list: [], progress: {}, claimed: [] },
    combo: { count: 0, lastCatchTime: 0 },
    dailyRewardClaimed: null,
    activeEffects: {},
    questTracking: { catches: 0, rareCatches: 0, uniqueSpecies: [], uniqueBiomes: [], walkM: 0, itemUses: 0 },
    stardust: 0,
    catchCounts: {},
    evolved: [],
    firstCaughtDates: {},
    creatureCP: {},
    eggs: [],
    incubating: null,
    totalEggsHatched: 0,
    totalWalkMeters: 0,
    achievements: {},
    tutorialDone: false,
    battlePass: { premium: false, claimedFree: [], claimedPremium: [], season: 1 },
  };
}

function loadGame() {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return defaultGameState();
    const g = JSON.parse(raw);
    return { ...defaultGameState(), ...g };
  } catch { return defaultGameState(); }
}

function saveGame() { localStorage.setItem(GAME_KEY, JSON.stringify(game)); }

let game = loadGame();

// --- Inventory helpers ---
function addItem(itemId, count = 1) {
  game.inventory[itemId] = (game.inventory[itemId] || 0) + count;
  saveGame();
}

function removeItem(itemId, count = 1) {
  game.inventory[itemId] = Math.max(0, (game.inventory[itemId] || 0) - count);
  if (game.inventory[itemId] === 0) delete game.inventory[itemId];
  saveGame();
}

function itemCount(itemId) { return game.inventory[itemId] || 0; }

// --- XP / Level ---
function xpForLevel(lv) { return lv * lv * 100; }

function addXP(amount) {
  if (isEffectActive('xpBoost')) amount *= 2;
  const comboMult = 1 + game.combo.count * COMBO_XP_BONUS;
  amount = Math.round(amount * comboMult);
  game.xp += amount;
  const prevLevel = game.level;
  while (game.xp >= xpForLevel(game.level)) {
    game.xp -= xpForLevel(game.level);
    game.level++;
  }
  saveGame();
  updateXPUI();
  if (game.level > prevLevel) { SFX.levelUp(); Haptic.heavy(); showGenericToast(`Level ${game.level}!`, '🎉'); }
  return amount;
}

// --- Active effects ---
function activateEffect(effectId, durationMs) {
  game.activeEffects[effectId] = Date.now() + durationMs;
  saveGame();
}

function isEffectActive(effectId) {
  const until = game.activeEffects[effectId];
  return until && Date.now() < until;
}

// --- Item use ---
function useItem(itemId) {
  if (itemCount(itemId) <= 0) return false;
  removeItem(itemId);
  switch (itemId) {
    case 'ultraBall': activateEffect('ultraBall', 600_000); break;
    case 'rareScent': activateEffect('rareScent', 600_000); game.activeEffects.rareScentUses = 3; break;
    case 'xpBoost': activateEffect('xpBoost', 600_000); break;
    case 'lure': activateEffect('lure', 300_000); break;
    case 'biomeShift': activateEffect('biomeShift', 180_000); break;
    case 'radar': activateEffect('radar', 60_000); break;
  }
  trackQuestEvent('itemUses', 1);
  saveGame();
  renderItems();
  SFX.itemUse();
  Haptic.medium();
  showGenericToast(`${ITEMS[itemId].name} activated!`, ITEMS[itemId].icon);
  renderEffectHud();
  if (itemId === 'lure' || itemId === 'radar') {
    lastSpawnPos = null;
    if (trust.lastLat != null) renderSpawns(trust.lastLat, trust.lastLng);
  }
  return true;
}

// --- Loot drops on catch ---
function rollLoot(rarity) {
  const drops = [];
  const tier = rarity === RARITY.Legendary ? 4 : rarity === RARITY.Epic ? 3 : rarity === RARITY.Rare ? 2 : 1;
  const levelBonus = game.level * 0.02;
  const numRolls = tier >= 3 ? 2 : 1;
  for (let i = 0; i < numRolls; i++) {
    if (Math.random() < 0.35 + tier * 0.1 + levelBonus) {
      const pool = tier >= 3 ? ITEM_IDS : ITEM_IDS.filter(id => id !== 'radar');
      const pick = pool[Math.floor(Math.random() * pool.length)];
      drops.push(pick);
    }
  }
  return drops;
}

// --- Combo ---
function bumpCombo() {
  const now = Date.now();
  if (now - game.combo.lastCatchTime > COMBO_TIMEOUT_MS) {
    game.combo.count = 1;
  } else {
    game.combo.count++;
  }
  game.combo.lastCatchTime = now;
  saveGame();
  updateComboUI();
}

function resetCombo() {
  game.combo.count = 0;
  game.combo.lastCatchTime = 0;
  saveGame();
  updateComboUI();
}

function checkComboTimeout() {
  if (game.combo.count > 0 && Date.now() - game.combo.lastCatchTime > COMBO_TIMEOUT_MS) {
    resetCombo();
  }
}

// --- Quests ---
function questSeed() {
  const d = todayKey();
  let h = 0;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) | 0;
  return h;
}

function pickDailyQuests() {
  const rng = mulberry32(questSeed() >>> 0);
  const shuffled = [...QUEST_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3).map(q => ({ ...q }));
}

function ensureTodayQuests() {
  const today = todayKey();
  if (game.quests.day !== today) {
    game.quests = {
      day: today,
      list: pickDailyQuests(),
      progress: {},
      claimed: [],
    };
    game.questTracking = { catches: 0, rareCatches: 0, uniqueSpecies: [], uniqueBiomes: [], walkM: 0, itemUses: 0 };
    saveGame();
  }
}

function trackQuestEvent(trackKey, value) {
  const t = game.questTracking;
  if (trackKey === 'uniqueSpecies' || trackKey === 'uniqueBiomes') {
    if (!Array.isArray(t[trackKey])) t[trackKey] = [];
    if (!t[trackKey].includes(value)) t[trackKey].push(value);
  } else {
    t[trackKey] = (t[trackKey] || 0) + value;
  }
  saveGame();
  renderQuests();
}

function questProgress(quest) {
  const t = game.questTracking;
  const key = quest.track;
  if (key === 'uniqueSpecies' || key === 'uniqueBiomes') {
    return Array.isArray(t[key]) ? t[key].length : 0;
  }
  return t[key] || 0;
}

function isQuestComplete(quest) { return questProgress(quest) >= quest.goal; }

function claimQuest(idx) {
  if (game.quests.claimed.includes(idx)) return;
  const q = game.quests.list[idx];
  if (!q || !isQuestComplete(q)) return;
  game.quests.claimed.push(idx);
  addXP(q.xp);
  addItem(q.item);
  saveGame();
  renderQuests();
  addStardust(100);
  SFX.questDone();
  Haptic.success();
  showGenericToast(`Quest done! +${q.xp} XP, +1 ${ITEMS[q.item].name}`, '✅');
}

// --- Daily streak ---
function checkDailyStreak() {
  const today = todayKey();
  if (game.dailyRewardClaimed === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (game.streak.lastDay === yesterday) {
    game.streak.count++;
  } else if (game.streak.lastDay !== today) {
    game.streak.count = 1;
  }
  game.streak.lastDay = today;
  saveGame();
  SFX.dailyReward();
  checkAchievements();
  showDailyReward();
}

function claimDailyReward() {
  const today = todayKey();
  if (game.dailyRewardClaimed === today) return;
  const dayIdx = ((game.streak.count - 1) % 7);
  const reward = STREAK_REWARDS[dayIdx];
  for (const [itemId, count] of Object.entries(reward.items)) addItem(itemId, count);
  if (reward.xp) addXP(reward.xp);
  game.dailyRewardClaimed = today;
  saveGame();
  renderItems();
  updateXPUI();
}

// --- Stardust ---
function addStardust(amount) {
  game.stardust = (game.stardust || 0) + amount;
  saveGame();
}

// --- Egg system ---
function rollEgg(rarity) {
  let chance = 0.22;
  if (rarity === RARITY.Rare) chance = 0.30;
  else if (rarity === RARITY.Epic) chance = 0.40;
  else if (rarity === RARITY.Legendary) chance = 0.50;
  if (Math.random() > chance) return null;
  if ((game.eggs || []).length >= 6) return null;
  const tier = rarity === RARITY.Legendary || rarity === RARITY.Epic ? 2
    : rarity === RARITY.Rare ? 1 : 0;
  return { tier, km: EGG_TIERS[tier].km };
}

function addEgg(egg) {
  if (!egg) return;
  if (!game.eggs) game.eggs = [];
  if (game.eggs.length >= 6) return;
  game.eggs.push(egg);
  if (!game.incubating && game.eggs.length === 1) {
    game.incubating = { eggIdx: 0, walked: 0 };
  }
  saveGame();
}

function incubateWalk(meters) {
  if (!game.incubating) return;
  game.incubating.walked += meters;
  const egg = game.eggs[game.incubating.eggIdx];
  if (!egg) return;
  if (game.incubating.walked >= egg.km * 1000) {
    hatchEgg();
  }
  saveGame();
  updateEggHUD();
}

function hatchEgg() {
  if (!game.incubating) return;
  const egg = game.eggs[game.incubating.eggIdx];
  if (!egg) return;
  const tier = EGG_TIERS[egg.tier];
  const rar = tier.rarities[Math.floor(Math.random() * tier.rarities.length)];
  const biome = [BIOME.City, BIOME.Nature, BIOME.Water][Math.floor(Math.random() * 3)];
  const rng = () => Math.random();
  const creature = pickCreature(rar, biome, rng);
  const col = loadCollection();
  const isNew = !col.has(creature.id);
  col.add(creature.id);
  saveCollection(col);
  game.eggs.splice(game.incubating.eggIdx, 1);
  game.incubating = game.eggs.length > 0 ? { eggIdx: 0, walked: 0 } : null;
  game.totalEggsHatched = (game.totalEggsHatched || 0) + 1;
  addStardust(25);
  addXP(XP_PER_CATCH[rar] * (isNew ? 2 : 1));
  bumpCatchCount(creature.id);
  if (!game.firstCaughtDates[creature.id]) game.firstCaughtDates[creature.id] = todayKey();
  if (!game.creatureCP[creature.id]) game.creatureCP[creature.id] = 10 + Math.floor(Math.random() * 90);
  saveGame();
  SFX.hatch();
  Haptic.double();
  showHatchModal(creature, isNew);
  checkAchievements();
  renderCollection();
  updateEggHUD();
}

function startIncubating(idx) {
  if (game.incubating) return;
  if (!game.eggs || !game.eggs[idx]) return;
  game.incubating = { eggIdx: idx, walked: 0 };
  saveGame();
  updateEggHUD();
}

// --- Evolution ---
function canEvolve(creatureId) {
  const evo = getEvolution(creatureId);
  if (!evo) return false;
  if ((game.evolved || []).includes(creatureId)) return false;
  const catches = game.catchCounts?.[creatureId] || 0;
  return catches >= evo.catches && (game.stardust || 0) >= evo.cost;
}

function evolveCreature(creatureId) {
  const evo = getEvolution(creatureId);
  if (!evo || !canEvolve(creatureId)) return false;
  game.stardust -= evo.cost;
  if (!game.evolved) game.evolved = [];
  game.evolved.push(creatureId);
  const col = loadCollection();
  col.add(evo.to);
  saveCollection(col);
  if (!game.creatureCP[evo.to]) game.creatureCP[evo.to] = (game.creatureCP[creatureId] || 50) + 50 + Math.floor(Math.random() * 100);
  if (!game.firstCaughtDates[evo.to]) game.firstCaughtDates[evo.to] = todayKey();
  saveGame();
  SFX.evolve();
  Haptic.heavy();
  showGenericToast(`${evo.toName} evolved!`, '✨');
  checkAchievements();
  renderCollection();
  return true;
}

function bumpCatchCount(creatureId) {
  game.catchCounts = game.catchCounts || {};
  game.catchCounts[creatureId] = (game.catchCounts[creatureId] || 0) + 1;
  saveGame();
}

// --- Achievements ---
function checkAchievements() {
  const a = game.achievements || {};
  const col = loadCollection();
  const checks = {
    firstSteps: () => (game.totalWalkMeters || 0) >= 100,
    explorer: () => (game.totalWalkMeters || 0) >= 5000,
    marathon: () => (game.totalWalkMeters || 0) >= 25000,
    collector: () => col.size >= 10,
    completionist: () => col.size >= 20,
    comboKing: () => game.combo.count >= 5,
    evolveOne: () => (game.evolved || []).length > 0,
    streakMaster: () => (game.streak?.count || 0) >= 7,
    hatcher: () => (game.totalEggsHatched || 0) >= 5,
    legendaryHunter: () => {
      const legendaries = CREATURES.filter(c => c.rarity === RARITY.Legendary);
      return legendaries.some(c => col.has(c.id));
    },
  };
  let anyNew = false;
  for (const [id, check] of Object.entries(checks)) {
    if (!a[id] && check()) {
      a[id] = true;
      anyNew = true;
      const meta = ACHIEVEMENTS.find(x => x.id === id);
      if (meta) {
        SFX.achievement();
        Haptic.success();
        showGenericToast(`Achievement: ${meta.name}!`, meta.icon);
      }
    }
  }
  if (anyNew) {
    game.achievements = a;
    saveGame();
  }
}

function addWalkMeters(m) {
  if (m <= 0 || m > 200) return;
  walkData.meters += m;
  game.totalWalkMeters = (game.totalWalkMeters || 0) + m;
  addStardust(Math.round(m * 0.025));
  incubateWalk(m);
  const prev = walkData.milestoneIdx;
  while (
    walkData.milestoneIdx < WALK_MILESTONES.length &&
    walkData.meters >= WALK_MILESTONES[walkData.milestoneIdx]
  ) {
    walkData.milestoneIdx++;
  }
  if (walkData.milestoneIdx > prev) {
    showMilestoneToast(WALK_MILESTONES[walkData.milestoneIdx - 1]);
    addXP(100);
  }
  saveWalk(walkData);
  saveGame();
  updateWalkUI();
  trackQuestEvent('walkM', m);
  checkAchievements();
}

function formatDistance(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function nextMilestone() {
  if (walkData.milestoneIdx >= WALK_MILESTONES.length) return null;
  return WALK_MILESTONES[walkData.milestoneIdx];
}

function walkBonusSpawns() {
  return walkData.milestoneIdx;
}

// Rarity allowed based on distance from player
function allowedRarityAtDist(distM) {
  if (distM >= TIER_THRESHOLDS[RARITY.Legendary]) return RARITY.Legendary;
  if (distM >= TIER_THRESHOLDS[RARITY.Epic]) return RARITY.Epic;
  if (distM >= TIER_THRESHOLDS[RARITY.Rare]) return RARITY.Rare;
  return RARITY.Common;
}

function rollRarityForDist(rng, distM) {
  const maxR = allowedRarityAtDist(distM);
  const tiers = [RARITY.Common];
  if (maxR === RARITY.Rare || maxR === RARITY.Epic || maxR === RARITY.Legendary) tiers.push(RARITY.Rare);
  if (maxR === RARITY.Epic || maxR === RARITY.Legendary) tiers.push(RARITY.Epic);
  if (maxR === RARITY.Legendary) tiers.push(RARITY.Legendary);

  const roll = rng() * 100;
  if (tiers.includes(RARITY.Legendary) && roll < 2) return RARITY.Legendary;
  if (tiers.includes(RARITY.Epic) && roll < 10) return RARITY.Epic;
  if (tiers.includes(RARITY.Rare) && roll < 35) return RARITY.Rare;
  return RARITY.Common;
}

// --- Location trust (anti-spoof heuristics; not cryptographic) ---
function updateTrust(prev, lat, lng, accuracyM, nowMs) {
  let score = prev.score;
  const bits = [];

  if (prev.lastTime == null) {
    score = 90;
    if (accuracyM > 55) score -= Math.min(25, (accuracyM - 55) * 0.35);
    return {
      score: clamp(Math.round(score), 0, 100),
      lastLat: lat,
      lastLng: lng,
      lastTime: nowMs,
      canCatch: clamp(Math.round(score), 0, 100) >= MIN_TRUST_TO_CATCH,
      detail:
        accuracyM > 70
          ? 'First fix — wait for better accuracy if catches stay locked'
          : 'GPS lock acquired',
    };
  }

  const dt = (nowMs - prev.lastTime) / 1000;
  const dist = haversineM(prev.lastLat, prev.lastLng, lat, lng);

  if (dt > 0.1 && dt < 200) {
    const speed = dist / dt;
    if (speed > MAX_SPEED_MPS) {
      score -= 30;
      bits.push('speed limit');
    }
    if (dist > TELEPORT_M && dt < TELEPORT_S) {
      score -= 42;
      bits.push('position jump');
    }
  }

  if (accuracyM > 78) {
    score -= Math.min(18, (accuracyM - 78) * 0.45);
    bits.push('weak GPS');
  }

  if (dt > 2.5 && dist < 22 && accuracyM < 65) {
    score = Math.min(100, score + 4);
  }

  score = clamp(Math.round(score), 0, 100);
  const canCatch = score >= MIN_TRUST_TO_CATCH;
  let detail = 'Movement looks consistent';
  if (bits.length) detail = bits.join(' · ');

  return {
    score,
    lastLat: lat,
    lastLng: lng,
    lastTime: nowMs,
    canCatch,
    detail,
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function rarityClass(r) {
  const k = String(r).toLowerCase();
  return `marker-creature--${k}`;
}

// --- Collection ---
function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCollection(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function loadCaughtSpawnIds() {
  try {
    const raw = localStorage.getItem(CAUGHT_SPAWN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCaughtSpawnIds(set) {
  localStorage.setItem(CAUGHT_SPAWN_KEY, JSON.stringify([...set]));
}

// --- App state ---
let map;
let mapLocated = false;
let playerMarker;
let scanRadiusCircle;
let creatureLayer;
let trust = {
  score: 88,
  lastLat: null,
  lastLng: null,
  lastTime: null,
  lastAccuracy: null,
  canCatch: false,
  detail: '',
};
let activeSpawns = [];
let caughtSpawnIds = loadCaughtSpawnIds();
let spawnTimer;
let lastSpawnPos = null;
let watchId = null;
let pendingCatch = null;
let milestoneToastTimer = null;

const els = {
  gpsPill: document.getElementById('gpsPill'),
  gpsPillText: document.getElementById('gpsPillText'),
  locBanner: document.getElementById('locBanner'),
  refreshGpsBtn: document.getElementById('refreshGpsBtn'),
  recenterBtn: document.getElementById('recenterBtn'),
  sheetCollection: document.getElementById('sheetCollection'),
  sheetSettings: document.getElementById('sheetSettings'),
  sheetQuests: document.getElementById('sheetQuests'),
  sheetItems: document.getElementById('sheetItems'),
  sheetProfile: document.getElementById('sheetProfile'),
  collectionList: document.getElementById('collectionList'),
  collectionProgress: document.getElementById('collectionProgress'),
  questList: document.getElementById('questList'),
  itemGrid: document.getElementById('itemGrid'),
  trustBar: document.getElementById('trustBar'),
  trustDetail: document.getElementById('trustDetail'),
  permGate: document.getElementById('permGate'),
  grantLocationBtn: document.getElementById('grantLocationBtn'),
  permError: document.getElementById('permError'),
  catchModal: document.getElementById('catchModal'),
  catchHero: document.getElementById('catchHero'),
  catchCreatureArt: document.getElementById('catchCreatureArt'),
  catchTitle: document.getElementById('catchTitle'),
  catchMeta: document.getElementById('catchMeta'),
  catchBody: document.getElementById('catchBody'),
  catchTryBtn: document.getElementById('catchTryBtn'),
  catchCloseBtn: document.getElementById('catchCloseBtn'),
  walkDist: document.getElementById('walkDist'),
  walkGoal: document.getElementById('walkGoal'),
  milestoneToast: document.getElementById('milestoneToast'),
  milestoneText: document.getElementById('milestoneText'),
  xpBar: document.getElementById('xpBar'),
  xpText: document.getElementById('xpText'),
  comboOverlay: document.getElementById('comboOverlay'),
  comboCount: document.getElementById('comboCount'),
  dailyModal: document.getElementById('dailyModal'),
  dailyStreakCount: document.getElementById('dailyStreakCount'),
  dailyRewardList: document.getElementById('dailyRewardList'),
  dailyClaimBtn: document.getElementById('dailyClaimBtn'),
  profileLevel: document.getElementById('profileLevel'),
  profileXP: document.getElementById('profileXP'),
  profileTrustBar: document.getElementById('profileTrustBar'),
  profileTrustDetail: document.getElementById('profileTrustDetail'),
  profileStreak: document.getElementById('profileStreak'),
  profileStardust: document.getElementById('profileStardust'),
  profileAchievements: document.getElementById('profileAchievements'),
  eggHud: document.getElementById('eggHud'),
  eggHudText: document.getElementById('eggHudText'),
  eggHudBar: document.getElementById('eggHudBar'),
  effectHud: document.getElementById('effectHud'),
  hatchModal: document.getElementById('hatchModal'),
  hatchCreatureArt: document.getElementById('hatchCreatureArt'),
  hatchTitle: document.getElementById('hatchTitle'),
  hatchMeta: document.getElementById('hatchMeta'),
  hatchCloseBtn: document.getElementById('hatchCloseBtn'),
  detailModal: document.getElementById('detailModal'),
  detailArt: document.getElementById('detailArt'),
  detailName: document.getElementById('detailName'),
  detailMeta: document.getElementById('detailMeta'),
  detailCP: document.getElementById('detailCP'),
  detailCatches: document.getElementById('detailCatches'),
  detailDate: document.getElementById('detailDate'),
  detailEvolveBtn: document.getElementById('detailEvolveBtn'),
  detailEvolveInfo: document.getElementById('detailEvolveInfo'),
  detailCloseBtn: document.getElementById('detailCloseBtn'),
  splashScreen: document.getElementById('splashScreen'),
  tutorialOverlay: document.getElementById('tutorialOverlay'),
  tutorialText: document.getElementById('tutorialText'),
  tutorialNextBtn: document.getElementById('tutorialNextBtn'),
  sheetPass: document.getElementById('sheetPass'),
  sheetMarket: document.getElementById('sheetMarket'),
  bpTierList: document.getElementById('bpTierList'),
  bpUpgradeBtn: document.getElementById('bpUpgradeBtn'),
  bpProgressText: document.getElementById('bpProgressText'),
  bpProgressBar: document.getElementById('bpProgressBar'),
  shopGrid: document.getElementById('shopGrid'),
  walletConnectBtn: document.getElementById('walletConnectBtn'),
  walletInfo: document.getElementById('walletInfo'),
  walletBalance: document.getElementById('walletBalance'),
  walletAddr: document.getElementById('walletAddr'),
};

function setGpsPill() {
  const { score, canCatch, detail } = trust;
  const accStr = trust.lastAccuracy != null ? ` · ±${Math.round(trust.lastAccuracy)}m` : '';
  els.gpsPillText.textContent =
    trust.lastTime == null
      ? 'Waiting for GPS…'
      : canCatch
        ? `Trust ${score}% · catches on${accStr}`
        : `Trust ${score}% · catches locked${accStr}`;
  els.gpsPill.className = 'gps-pill';
  if (trust.lastTime == null) {
    els.gpsPill.classList.add('gps-pill--pending');
  } else if (canCatch && score >= 65) {
    els.gpsPill.classList.add('gps-pill--ok');
  } else if (canCatch) {
    els.gpsPill.classList.add('gps-pill--warn');
  } else {
    els.gpsPill.classList.add('gps-pill--bad');
  }
  els.trustBar.style.width = `${score}%`;
  els.trustDetail.textContent = detail || '—';
}

/** variant: 'warn' (default yellow), 'info' (blue), 'err' (red) */
function showLocBanner(msg, variant = 'warn') {
  if (!els.locBanner) return;
  els.locBanner.textContent = msg;
  els.locBanner.classList.remove('hidden', 'loc-banner--err', 'loc-banner--info');
  if (variant === 'err') els.locBanner.classList.add('loc-banner--err');
  else if (variant === 'info') els.locBanner.classList.add('loc-banner--info');
}

function hideLocBanner() {
  if (els.locBanner) els.locBanner.classList.add('hidden');
}

function isDesktopBrowser() {
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Hints when GPS accuracy is weak (browser/OS still uses device location APIs only). */
function buildLocationHint(accM, canCatch) {
  const parts = [];
  const r = Math.round(accM);
  if (accM > 2500) {
    parts.push(
      `Very rough fix (±${r} m), often IP-based — the pin can be far off. Try a phone on cellular, disable VPN, tap Refresh GPS.`
    );
  } else if (accM > 800) {
    parts.push(`Rough fix (±${r} m). If the pin is wrong, go outdoors or use a phone with GPS.`);
  } else if (isDesktopBrowser() && accM > 65) {
    parts.push(
      `On desktop, the browser usually uses Wi‑Fi (±${r} m), not GPS — wrong city/area is common. Use a phone for a real GPS pin.`
    );
  }
  if (!canCatch) {
    parts.push('Catches locked until location trust recovers (you still see the blue dot).');
  }
  if (parts.length === 0) return null;
  return parts.join(' ');
}

function pickHintVariant(accM) {
  if (accM > 800 || (isDesktopBrowser() && accM > 65)) return 'info';
  return 'warn';
}

/** Leaflet often measures 0×0 until layout settles — fixes blank or wrong map. */
function scheduleMapResize() {
  const run = () => {
    if (map) map.invalidateSize();
  };
  requestAnimationFrame(run);
  setTimeout(run, 100);
  setTimeout(run, 400);
}

function initMap() {
  map = L.map('map', { zoomControl: false, attributionControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  }).addTo(map);

  const avatarHtml = `<div class="player-avatar">
    <div class="player-avatar__pulse"></div>
    <div class="player-avatar__dot"></div>
  </div>`;
  scanRadiusCircle = L.circle([0, 0], {
    radius: CATCH_RADIUS_M,
    color: 'rgba(0,255,255,0.25)',
    fillColor: 'rgba(0,255,255,0.04)',
    fillOpacity: 1,
    weight: 1.5,
    dashArray: '6 4',
    interactive: false,
  }).addTo(map);

  playerMarker = L.marker([0, 0], {
    icon: L.divIcon({ className: 'player-divicon', html: avatarHtml, iconSize: [80, 80], iconAnchor: [40, 40] }),
    zIndexOffset: 9999,
  }).addTo(map);

  creatureLayer = L.layerGroup().addTo(map);

  setTimeout(() => map.invalidateSize(), 0);
}

function computeSpawnList(lat, lng) {
  const bucket = Math.floor(Date.now() / 1000 / REFRESH_S);
  const { cx: pcx, cy: pcy } = getCell(lat, lng);
  const lureActive = isEffectActive('lure');
  const radarActive = isEffectActive('radar');
  const scentActive = isEffectActive('rareScent');
  const biomeShiftActive = isEffectActive('biomeShift');
  const scanR = radarActive ? 8 : SCAN_RADIUS;
  const cells = nearbyCells(pcx, pcy, scanR);
  const list = [];
  const bonus = walkBonusSpawns();

  const biomeChoices = [BIOME.City, BIOME.Nature, BIOME.Water];

  for (const { cx, cy } of cells) {
    const seed = cellSeed(cx, cy, bucket);
    const rng = mulberry32(seed >>> 0);
    const center = cellCenterLatLng(cx, cy, lat);
    const distToPlayer = haversineM(lat, lng, center.lat, center.lng);

    let spawnChance;
    if (distToPlayer < 100) spawnChance = 0.25;
    else if (distToPlayer < 400) spawnChance = 0.35;
    else if (distToPlayer < 800) spawnChance = 0.50;
    else spawnChance = 0.60;

    spawnChance = Math.min(0.85, spawnChance + bonus * 0.05);
    if (lureActive) spawnChance = Math.min(0.95, spawnChance * 2);

    if (rng() > spawnChance) continue;

    const ox = (rng() * 2 - 1) * 100;
    const oy = (rng() * 2 - 1) * 100;
    const pos = offsetMeters(center.lat, center.lng, ox, oy);
    const actualDist = haversineM(lat, lng, pos.lat, pos.lng);
    const biome = biomeShiftActive
      ? biomeChoices[Math.floor(rng() * 3)]
      : estimateBiome(cx, cy);
    let rarity = rollRarityForDist(rng, actualDist);
    if (scentActive && rarity === RARITY.Common) {
      rarity = rng() < 0.7 ? RARITY.Rare : RARITY.Epic;
    }
    const def = pickCreature(rarity, biome, rng);
    const id = `${cx}_${cy}_${def.id}_${bucket}`;
    list.push({ id, def, lat: pos.lat, lng: pos.lng, dist: actualDist });
  }

  list.sort((a, b) => a.dist - b.dist);
  let maxVisible = 8 + bonus * 2;
  if (lureActive) maxVisible += 6;
  if (radarActive) maxVisible = 20;
  return list.slice(0, maxVisible).filter((s) => !caughtSpawnIds.has(s.id));
}

function drawCreatureMarkers() {
  creatureLayer.clearLayers();
  for (const s of activeSpawns) {
    const src = creaturePortraitUrl(s.def.id);
    const dist = s.dist != null ? s.dist : 0;
    const isFar = dist > CATCH_RADIUS_M;
    const distLabel = isFar ? `<span class="marker-dist">${formatDistance(dist)}</span>` : '';
    const farClass = isFar ? ' marker-creature--far' : '';
    const size = isFar ? 38 : 46;
    const anchor = size / 2;
    const icon = L.divIcon({
      className: 'creature-divicon',
      html: `<div class="marker-creature ${rarityClass(s.def.rarity)}${farClass}" data-spawn="${s.id}" style="width:${size}px;height:${size}px">
        <img class="marker-creature__img" src="${src}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async"/>
      </div>${distLabel}`,
      iconSize: [size, size + (isFar ? 16 : 0)],
      iconAnchor: [anchor, anchor],
    });
    const m = L.marker([s.lat, s.lng], { icon }).addTo(creatureLayer);
    m.on('click', () => openCatch(s));
  }
}

function renderSpawns(lat, lng) {
  activeSpawns = computeSpawnList(lat, lng);
  drawCreatureMarkers();
}

function maybeRespawn(lat, lng) {
  if (!lastSpawnPos || haversineM(lastSpawnPos.lat, lastSpawnPos.lng, lat, lng) > 60) {
    lastSpawnPos = { lat, lng };
    renderSpawns(lat, lng);
  }
}

function onPosition(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const acc = pos.coords.accuracy ?? 99;
  const now = Date.now();

  // Track walk distance before trust update overwrites lastLat/lastLng
  if (trust.lastLat != null && acc < 60) {
    const stepM = haversineM(trust.lastLat, trust.lastLng, lat, lng);
    const dt = (now - (trust.lastTime || now)) / 1000;
    const speed = dt > 0 ? stepM / dt : 0;
    // Only count real walking speed (0.3 – 6 m/s) and reasonable distances
    if (stepM > 2 && stepM < 200 && speed < 6 && speed > 0.3) {
      addWalkMeters(stepM);
    }
  }

  trust = updateTrust(trust, lat, lng, acc, now);
  trust.lastAccuracy = acc;
  setGpsPill();

  playerMarker.setLatLng([lat, lng]);
  playerMarker.setZIndexOffset(9999);
  if (scanRadiusCircle) scanRadiusCircle.setLatLng([lat, lng]);

  if (!mapLocated) {
    map.setView([lat, lng], 18, { animate: false });
    mapLocated = true;
    dismissSplash();
    scheduleMapResize();
  } else {
    if (map.getZoom() < 14) {
      map.setView([lat, lng], 18, { animate: true });
    } else {
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    }
  }

  const hint = buildLocationHint(acc, trust.canCatch);
  if (hint) {
    showLocBanner(hint, pickHintVariant(acc));
  } else {
    hideLocBanner();
  }

  maybeRespawn(lat, lng);
}

function setCatchHeroRarity(rarity) {
  if (!els.catchHero) return;
  els.catchHero.classList.remove(
    'catch-hero--common',
    'catch-hero--rare',
    'catch-hero--epic',
    'catch-hero--legendary'
  );
  const k = String(rarity).toLowerCase();
  els.catchHero.classList.add(`catch-hero--${k}`);
}

function openCatch(spawn) {
  pendingCatch = spawn;
  catchRingPhase = 0;
  catchRingAnim = null;
  const { def } = spawn;
  els.catchTitle.textContent = def.name;
  if (els.catchCreatureArt) {
    els.catchCreatureArt.src = creaturePortraitUrl(def.id);
    els.catchCreatureArt.alt = def.name;
  }
  if (els.catchMeta) els.catchMeta.textContent = `${def.rarity} · ${def.biome}`;
  setCatchHeroRarity(def.rarity);

  if (trust.lastLat == null || trust.lastLng == null) {
    els.catchBody.textContent = 'Waiting for a GPS fix…';
    els.catchTryBtn.classList.add('hidden');
    els.catchModal.classList.remove('hidden');
    return;
  }
  const dist = haversineM(trust.lastLat, trust.lastLng, spawn.lat, spawn.lng);
  if (!trust.canCatch) {
    els.catchBody.textContent = `Trust too low (${trust.score}%). We block catches when GPS looks spoofed or unstable. ${trust.detail}`;
    els.catchTryBtn.classList.add('hidden');
  } else if (dist > CATCH_RADIUS_M) {
    els.catchBody.textContent = `${Math.round(dist)}m away. Walk closer to catch.`;
    els.catchTryBtn.classList.add('hidden');
  } else {
    const pct = Math.round(CATCH_RATE[def.rarity] * 100);
    els.catchBody.textContent = `${Math.round(dist)}m away · Catch chance ~${pct}%`;
    els.catchTryBtn.classList.remove('hidden');
  }
  els.catchModal.classList.remove('hidden');
}

function closeCatch() {
  els.catchModal.classList.add('hidden');
  pendingCatch = null;
  catchRingPhase = 0;
  catchRingAnim = null;
  const ring = document.getElementById('catchRing');
  if (ring) ring.classList.add('hidden');
}

// --- Catch ring minigame state ---
let catchRingAnim = null;
let catchRingPhase = 0; // 0 = not started, 1 = ring shrinking, 2 = result shown

function startCatchRing() {
  if (!pendingCatch) return;
  catchRingPhase = 1;
  catchRingAnim = { start: performance.now(), duration: 2000 };
  els.catchTryBtn.textContent = 'Tap to catch!';
  const ring = document.getElementById('catchRing');
  if (ring) { ring.classList.remove('hidden'); ring.style.setProperty('--ring-scale', '1'); }
  requestAnimationFrame(animateCatchRing);
  Haptic.medium();
  SFX.tap();
}

function animateCatchRing(now) {
  if (catchRingPhase !== 1 || !catchRingAnim) return;
  const elapsed = now - catchRingAnim.start;
  const t = (elapsed % catchRingAnim.duration) / catchRingAnim.duration;
  const scale = 1 - t * 0.85;
  const ring = document.getElementById('catchRing');
  if (ring) ring.style.setProperty('--ring-scale', String(scale));
  requestAnimationFrame(animateCatchRing);
}

function getCatchRingBonus() {
  if (!catchRingAnim || catchRingPhase !== 1) return { bonus: 0, label: '' };
  const elapsed = performance.now() - catchRingAnim.start;
  const t = (elapsed % 2000) / 2000;
  if (t > 0.7) return { bonus: 0.20, label: 'Excellent!' };
  if (t > 0.4) return { bonus: 0.10, label: 'Great!' };
  return { bonus: 0, label: 'Nice' };
}

function tryCatch() {
  if (!pendingCatch || !trust.canCatch) return;
  const { def, id } = pendingCatch;
  if (trust.lastLat == null || trust.lastLng == null) return;
  const dist = haversineM(trust.lastLat, trust.lastLng, pendingCatch.lat, pendingCatch.lng);
  if (dist > CATCH_RADIUS_M) return;

  if (catchRingPhase === 0) { startCatchRing(); return; }
  if (catchRingPhase !== 1) return;

  const { bonus: ringBonus, label: ringLabel } = getCatchRingBonus();
  catchRingPhase = 2;
  const ring = document.getElementById('catchRing');
  if (ring) ring.classList.add('hidden');

  let rate = CATCH_RATE[def.rarity];
  if (isEffectActive('ultraBall')) { rate = Math.min(1, rate + 0.40); game.activeEffects.ultraBall = 0; saveGame(); }
  const comboBonus = game.combo.count * COMBO_CATCH_BONUS;
  rate = Math.min(1, rate + comboBonus + ringBonus);

  const ok = Math.random() < rate;
  const col = loadCollection();
  if (ok) {
    const isNew = !col.has(def.id);
    col.add(def.id);
    saveCollection(col);
    caughtSpawnIds.add(id);
    saveCaughtSpawnIds(caughtSpawnIds);

    if (!game.firstCaughtDates[def.id]) game.firstCaughtDates[def.id] = todayKey();
    if (!game.creatureCP[def.id]) game.creatureCP[def.id] = 10 + Math.floor(Math.random() * 90 * (1 + CREATURES.indexOf(CREATURES.find(c=>c.id===def.id))*0.02));
    bumpCatchCount(def.id);
    addStardust(10 + (def.rarity === RARITY.Legendary ? 50 : def.rarity === RARITY.Epic ? 25 : def.rarity === RARITY.Rare ? 15 : 0));

    let xpGained = addXP(XP_PER_CATCH[def.rarity] * (isNew ? 2 : 1));
    const drops = rollLoot(def.rarity);
    for (const d of drops) addItem(d);
    const egg = rollEgg(def.rarity);
    if (egg) addEgg(egg);
    bumpCombo();
    SFX.combo(game.combo.count);
    if (def.rarity === RARITY.Common) SFX.catchSuccess(); else SFX.catchRare();
    Haptic.success();

    trackQuestEvent('catches', 1);
    if (def.rarity !== RARITY.Common) trackQuestEvent('rareCatches', 1);
    trackQuestEvent('uniqueSpecies', def.id);
    trackQuestEvent('uniqueBiomes', def.biome);

    // Decrement rare scent uses
    if (isEffectActive('rareScent') && game.activeEffects.rareScentUses > 0) {
      game.activeEffects.rareScentUses--;
      if (game.activeEffects.rareScentUses <= 0) game.activeEffects.rareScent = 0;
      saveGame();
    }

    const dropNames = drops.map(d => ITEMS[d].icon).join(' ');
    const eggStr = egg ? `<br/>🥚 Got a ${EGG_TIERS[egg.tier].label} egg!` : '';
    els.catchBody.innerHTML = `<strong>${ringLabel} Caught ${def.name}!</strong><br/>+${xpGained} XP · +${10} stardust${isNew ? ' (NEW!)' : ''}${drops.length ? '<br/>Loot: ' + dropNames : ''}${eggStr}`;

    activeSpawns = activeSpawns.filter((s) => s.id !== id);
    drawCreatureMarkers();
    renderCollection();
    renderItems();
    updateEggHUD();
    checkAchievements();
  } else {
    resetCombo();
    SFX.catchFail();
    Haptic.error();
    els.catchBody.textContent = `${ringLabel} ${def.name} broke free. Combo lost!`;
  }
  els.catchTryBtn.classList.add('hidden');
  catchRingAnim = null;
}

function renderCollection() {
  const col = loadCollection();
  const allCreatures = [...CREATURES];
  for (const evo of EVOLUTIONS) {
    if (col.has(evo.to)) {
      allCreatures.push({ id: evo.to, name: evo.toName, rarity: evo.toRarity, biome: 'Evolved', w: 0 });
    }
  }
  els.collectionProgress.textContent = `${col.size} / ${allCreatures.length}`;
  els.collectionList.innerHTML = '';
  for (const c of allCreatures) {
    const li = document.createElement('li');
    const got = col.has(c.id);
    const rk = String(c.rarity).toLowerCase();
    const isEvo = EVOLUTIONS.some(e => e.to === c.id);
    const src = isEvo ? creaturePortraitUrl(EVOLUTIONS.find(e => e.to === c.id).from) : creaturePortraitUrl(c.id);
    li.className = `collection-row${got ? ' collection-row--caught' : ''}${isEvo ? ' collection-row--evolved' : ''}`;
    li.dataset.rarity = rk;
    const cpStr = got && game.creatureCP?.[c.id] ? ` · CP ${game.creatureCP[c.id]}` : '';
    li.innerHTML = `<div class="collection-row__thumb">
      <img class="collection-row__img${got ? '' : ' collection-row__img--locked'}" src="${src}" alt="" width="64" height="64" loading="lazy" decoding="async"/>
      ${got ? '' : '<span class="collection-row__lock" aria-hidden="true"></span>'}
    </div>
    <div class="collection-row__main">
      <span class="collection-row__name">${c.name}</span>
      <div class="collection-row__tags">
        <span class="rarity-badge rarity-badge--${rk}">${c.rarity}</span>
        <span class="biome-pill">${c.biome}</span>
      </div>
    </div>
    <span class="collection-row__status ${got ? 'collection-row__status--yes' : 'collection-row__status--no'}">${got ? 'Caught' + cpStr : 'Missing'}</span>`;
    if (got) li.addEventListener('click', () => openCreatureDetail(c.id));
    els.collectionList.appendChild(li);
  }
}

function setViewMode(mode) {
  document.querySelectorAll('.bottom-nav__btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.view === mode);
  });
  const sheets = ['sheetCollection', 'sheetSettings', 'sheetQuests', 'sheetItems', 'sheetProfile', 'sheetPass', 'sheetMarket'];
  for (const s of sheets) if (els[s]) els[s].classList.add('hidden');
  switch (mode) {
    case 'collection':
      if (els.sheetCollection) { els.sheetCollection.classList.remove('hidden'); renderCollection(); }
      break;
    case 'settings':
      if (els.sheetSettings) els.sheetSettings.classList.remove('hidden');
      break;
    case 'quests':
      if (els.sheetQuests) { els.sheetQuests.classList.remove('hidden'); renderQuests(); }
      break;
    case 'items':
      if (els.sheetItems) { els.sheetItems.classList.remove('hidden'); renderItems(); renderShop(); }
      break;
    case 'profile':
      if (els.sheetProfile) { els.sheetProfile.classList.remove('hidden'); renderProfile(); renderWalletUI(); }
      break;
    case 'pass':
      if (els.sheetPass) { els.sheetPass.classList.remove('hidden'); renderBattlePass(); }
      break;
    case 'market':
      if (els.sheetMarket) { els.sheetMarket.classList.remove('hidden'); renderMarket(); }
      break;
  }
}

/** maximumAge: 0 — don’t reuse stale cached positions (common cause of “wrong” pin). */
const GEO_OPTS = { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 };

function startWatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onPosition(pos);
      scheduleMapResize();
    },
    () => {
      /* watchPosition may still deliver (e.g. slow first fix) */
    },
    GEO_OPTS
  );

  watchId = navigator.geolocation.watchPosition(
    onPosition,
    (err) => {
      const msg = err.message || 'Location error';
      showLocBanner(msg, 'err');
      if (els.permGate && !els.permGate.classList.contains('hidden')) {
        els.permError.textContent = msg;
        els.permError.classList.remove('hidden');
      }
    },
    GEO_OPTS
  );

  if (spawnTimer) window.clearInterval(spawnTimer);
  spawnTimer = window.setInterval(() => {
    if (trust.lastLat != null) renderSpawns(trust.lastLat, trust.lastLng);
  }, REFRESH_S * 1000);
}

function updateWalkUI() {
  if (els.walkDist) els.walkDist.textContent = formatDistance(walkData.meters);
  const next = nextMilestone();
  if (els.walkGoal) {
    els.walkGoal.textContent = next ? `Next: ${formatDistance(next)}` : 'All milestones hit!';
  }
}

function updateXPUI() {
  const needed = xpForLevel(game.level);
  const pct = Math.min(100, (game.xp / needed) * 100);
  if (els.xpBar) els.xpBar.style.width = `${pct}%`;
  if (els.xpText) els.xpText.textContent = `Lv ${game.level} · ${game.xp}/${needed} XP`;
}

function updateComboUI() {
  if (!els.comboOverlay) return;
  if (game.combo.count > 1) {
    els.comboOverlay.classList.remove('hidden');
    if (els.comboCount) els.comboCount.textContent = `x${game.combo.count} COMBO`;
    const intensity = Math.min(game.combo.count, 10);
    els.comboOverlay.style.setProperty('--combo-glow', `${intensity * 0.12}`);
  } else {
    els.comboOverlay.classList.add('hidden');
  }
}

function showGenericToast(msg, icon) {
  if (!els.milestoneToast) return;
  if (els.milestoneText) els.milestoneText.textContent = `${icon} ${msg}`;
  els.milestoneToast.classList.remove('hidden');
  if (milestoneToastTimer) clearTimeout(milestoneToastTimer);
  milestoneToastTimer = setTimeout(() => els.milestoneToast.classList.add('hidden'), 3500);
}

function renderQuests() {
  ensureTodayQuests();
  if (!els.questList) return;
  els.questList.innerHTML = '';
  game.quests.list.forEach((q, idx) => {
    const prog = Math.min(questProgress(q), q.goal);
    const pct = Math.round((prog / q.goal) * 100);
    const done = isQuestComplete(q);
    const claimed = game.quests.claimed.includes(idx);
    const card = document.createElement('div');
    card.className = `quest-card${done && !claimed ? ' quest-card--ready' : ''}${claimed ? ' quest-card--claimed' : ''}`;
    card.innerHTML = `
      <div class="quest-card__header">
        <span class="quest-card__desc">${q.desc}</span>
        <span class="quest-card__reward">${ITEMS[q.item].icon} +${q.xp} XP</span>
      </div>
      <div class="quest-card__bar-track"><div class="quest-card__bar-fill" style="width:${pct}%"></div></div>
      <div class="quest-card__footer">
        <span class="quest-card__progress">${prog} / ${q.goal}</span>
        ${claimed ? '<span class="quest-card__tag">Claimed</span>' : done ? `<button class="quest-card__claim btn btn--primary btn--sm" data-qi="${idx}">Claim</button>` : ''}
      </div>`;
    els.questList.appendChild(card);
  });
  els.questList.querySelectorAll('.quest-card__claim').forEach(btn => {
    btn.addEventListener('click', () => claimQuest(Number(btn.dataset.qi)));
  });
}

function renderItems() {
  if (!els.itemGrid) return;
  els.itemGrid.innerHTML = '';
  for (const id of ITEM_IDS) {
    const ct = itemCount(id);
    const meta = ITEMS[id];
    const active = isEffectActive(id);
    const cell = document.createElement('div');
    cell.className = `item-cell${active ? ' item-cell--active' : ''}${ct === 0 ? ' item-cell--empty' : ''}`;
    cell.innerHTML = `
      <span class="item-cell__icon">${meta.icon}</span>
      <span class="item-cell__count">${ct}</span>
      <span class="item-cell__name">${meta.name}</span>
      ${ct > 0 ? `<button class="item-cell__use btn btn--primary btn--sm" data-item="${id}">Use</button>` : ''}
      ${active ? '<span class="item-cell__active-badge">Active</span>' : ''}`;
    els.itemGrid.appendChild(cell);
  }
  els.itemGrid.querySelectorAll('.item-cell__use').forEach(btn => {
    btn.addEventListener('click', () => useItem(btn.dataset.item));
  });
}

function renderProfile() {
  if (els.profileLevel) els.profileLevel.textContent = `Level ${game.level}`;
  if (els.profileXP) {
    const needed = xpForLevel(game.level);
    els.profileXP.textContent = `${game.xp} / ${needed} XP`;
  }
  if (els.profileTrustBar) els.profileTrustBar.style.width = `${trust.score}%`;
  if (els.profileTrustDetail) els.profileTrustDetail.textContent = trust.detail || '—';
  if (els.profileStreak) els.profileStreak.textContent = `${game.streak.count} day${game.streak.count !== 1 ? 's' : ''}`;
  if (els.profileStardust) els.profileStardust.textContent = `${game.stardust || 0}`;
  if (els.profileAchievements) {
    const a = game.achievements || {};
    els.profileAchievements.innerHTML = ACHIEVEMENTS.map(ach => {
      const got = !!a[ach.id];
      return `<div class="achievement-badge${got ? ' achievement-badge--unlocked' : ''}" title="${ach.desc}">
        <span class="achievement-badge__icon">${ach.icon}</span>
        <span class="achievement-badge__name">${ach.name}</span>
      </div>`;
    }).join('');
  }
}

// --- Battle Pass Rendering ---
function renderBattlePass() {
  if (!els.bpTierList) return;
  const currentTier = getCurrentBPTier();
  const totalXP = getBPTotalXP();
  const bp = game.battlePass;

  if (els.bpProgressText) {
    els.bpProgressText.textContent = `Tier ${currentTier} / 30 — ${totalXP.toLocaleString()} XP`;
  }
  if (els.bpProgressBar) {
    const pct = Math.min(100, (currentTier / 30) * 100);
    els.bpProgressBar.style.width = `${pct}%`;
  }
  if (els.bpUpgradeBtn) {
    if (bp.premium) {
      els.bpUpgradeBtn.textContent = 'Premium Active';
      els.bpUpgradeBtn.disabled = true;
      els.bpUpgradeBtn.classList.remove('btn--primary');
      els.bpUpgradeBtn.classList.add('btn--ghost');
    } else {
      els.bpUpgradeBtn.textContent = 'Upgrade — 0.1 SOL';
      els.bpUpgradeBtn.disabled = false;
    }
  }

  els.bpTierList.innerHTML = BATTLE_PASS.tiers.map(t => {
    const reached = currentTier >= t.level;
    const freeClaimed = bp.claimedFree.includes(t.level);
    const premClaimed = bp.claimedPremium.includes(t.level);
    const freeLabel = rewardLabel(t.free);
    const premLabel = rewardLabel(t.premium);
    return `<div class="bp-tier${reached ? ' bp-tier--reached' : ''}${t.level === currentTier ? ' bp-tier--current' : ''}">
      <span class="bp-tier__num">${t.level}</span>
      <div class="bp-tier__rewards">
        <button class="bp-tier__reward bp-tier__reward--free${freeClaimed ? ' bp-tier__reward--claimed' : ''}" data-tier="${t.level}" data-track="free" ${!reached || freeClaimed ? 'disabled' : ''}>
          <span class="bp-tier__label">FREE</span> ${freeLabel}${freeClaimed ? ' ✓' : ''}
        </button>
        <button class="bp-tier__reward bp-tier__reward--prem${premClaimed ? ' bp-tier__reward--claimed' : ''}${!bp.premium ? ' bp-tier__reward--locked' : ''}" data-tier="${t.level}" data-track="premium" ${!reached || premClaimed || !bp.premium ? 'disabled' : ''}>
          <span class="bp-tier__label">${bp.premium ? 'PREM' : '🔒'}</span> ${premLabel}${premClaimed ? ' ✓' : ''}
        </button>
      </div>
    </div>`;
  }).join('');

  els.bpTierList.querySelectorAll('.bp-tier__reward').forEach(btn => {
    btn.addEventListener('click', () => {
      const tier = parseInt(btn.dataset.tier, 10);
      claimBPReward(tier, btn.dataset.track);
    });
  });

  const currentEl = els.bpTierList.querySelector('.bp-tier--current');
  if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function rewardLabel(reward) {
  if (reward.stardust) return `✨ ${reward.stardust}`;
  if (reward.item && ITEMS[reward.item]) return `${ITEMS[reward.item].icon} ${reward.qty || 1}x`;
  return '?';
}

// --- Shop Rendering ---
function renderShop() {
  if (!els.shopGrid) return;
  els.shopGrid.innerHTML = SHOP_BUNDLES.map(b => {
    const itemList = Object.entries(b.items).map(([id, qty]) => `${ITEMS[id]?.icon || ''} ${qty}x ${ITEMS[id]?.name || id}`).join(', ');
    return `<div class="shop-card">
      <span class="shop-card__icon">${b.icon}</span>
      <h4 class="shop-card__name">${b.name}</h4>
      <p class="shop-card__items">${itemList}</p>
      <button class="shop-card__buy btn btn--primary btn--sm" data-bundle="${b.id}">${b.price} SOL</button>
    </div>`;
  }).join('');

  els.shopGrid.querySelectorAll('.shop-card__buy').forEach(btn => {
    btn.addEventListener('click', () => buyBundle(btn.dataset.bundle));
  });
}

function showDailyReward() {
  if (!els.dailyModal) return;
  const dayIdx = ((game.streak.count - 1) % 7);
  const reward = STREAK_REWARDS[dayIdx];
  if (els.dailyStreakCount) els.dailyStreakCount.textContent = `Day ${game.streak.count}`;
  if (els.dailyRewardList) {
    const lines = Object.entries(reward.items).map(([id, ct]) => `${ITEMS[id].icon} ${ct}x ${ITEMS[id].name}`);
    if (reward.xp) lines.push(`⚡ ${reward.xp} XP`);
    els.dailyRewardList.innerHTML = lines.map(l => `<div class="daily-reward__line">${l}</div>`).join('');
  }
  els.dailyModal.classList.remove('hidden');
}

function hideDailyReward() {
  if (els.dailyModal) els.dailyModal.classList.add('hidden');
}

// --- Egg HUD ---
function updateEggHUD() {
  if (!els.eggHud) return;
  if (!game.incubating || !game.eggs || !game.eggs[game.incubating.eggIdx]) {
    els.eggHud.classList.add('hidden');
    return;
  }
  els.eggHud.classList.remove('hidden');
  const egg = game.eggs[game.incubating.eggIdx];
  const pct = Math.min(100, (game.incubating.walked / (egg.km * 1000)) * 100);
  if (els.eggHudText) els.eggHudText.textContent = `🥚 ${formatDistance(game.incubating.walked)} / ${egg.km} km`;
  if (els.eggHudBar) els.eggHudBar.style.width = `${pct}%`;
}

// --- Effect HUD ---
function renderEffectHud() {
  if (!els.effectHud) return;
  const now = Date.now();
  const pills = [];
  for (const [id, until] of Object.entries(game.activeEffects || {})) {
    if (id === 'rareScentUses') continue;
    if (typeof until !== 'number' || until <= now) continue;
    const meta = ITEMS[id];
    if (!meta) continue;
    const secs = Math.ceil((until - now) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    pills.push(`<span class="effect-pill">${meta.icon} ${m}:${String(s).padStart(2, '0')}</span>`);
  }
  els.effectHud.innerHTML = pills.join('');
  if (pills.length) els.effectHud.classList.remove('hidden');
  else els.effectHud.classList.add('hidden');
}

// --- Hatch modal ---
function showHatchModal(creature, isNew) {
  if (!els.hatchModal) return;
  if (els.hatchCreatureArt) { els.hatchCreatureArt.src = creaturePortraitUrl(creature.id); els.hatchCreatureArt.alt = creature.name; }
  if (els.hatchTitle) els.hatchTitle.textContent = `${creature.name} hatched!${isNew ? ' (NEW!)' : ''}`;
  if (els.hatchMeta) els.hatchMeta.textContent = `${creature.rarity} · ${creature.biome}`;
  els.hatchModal.classList.remove('hidden');
}

function hideHatchModal() {
  if (els.hatchModal) els.hatchModal.classList.add('hidden');
}

// --- Creature detail ---
let detailCreatureId = null;

function openCreatureDetail(creatureId) {
  const c = CREATURES.find(x => x.id === creatureId);
  if (!c) {
    const evo = EVOLUTIONS.find(e => e.to === creatureId);
    if (evo) openEvoDetail(evo);
    return;
  }
  detailCreatureId = creatureId;
  if (els.detailArt) { els.detailArt.src = creaturePortraitUrl(c.id); els.detailArt.alt = c.name; }
  if (els.detailName) els.detailName.textContent = c.name;
  if (els.detailMeta) els.detailMeta.textContent = `${c.rarity} · ${c.biome}`;
  if (els.detailCP) els.detailCP.textContent = `CP ${game.creatureCP?.[c.id] || '?'}`;
  if (els.detailCatches) els.detailCatches.textContent = `Caught ${game.catchCounts?.[c.id] || 0}x`;
  if (els.detailDate) els.detailDate.textContent = game.firstCaughtDates?.[c.id] || '—';
  const evo = getEvolution(c.id);
  if (els.detailEvolveBtn) {
    if (evo && canEvolve(c.id)) {
      els.detailEvolveBtn.classList.remove('hidden');
      els.detailEvolveBtn.textContent = `Evolve to ${evo.toName}`;
    } else {
      els.detailEvolveBtn.classList.add('hidden');
    }
  }
  if (els.detailEvolveInfo) {
    if (evo) {
      const cc = game.catchCounts?.[c.id] || 0;
      const sd = game.stardust || 0;
      els.detailEvolveInfo.textContent = `Evolve: ${cc}/${evo.catches} catches · ${sd}/${evo.cost} stardust`;
      els.detailEvolveInfo.classList.remove('hidden');
    } else {
      els.detailEvolveInfo.classList.add('hidden');
    }
  }
  if (els.detailModal) els.detailModal.classList.remove('hidden');
}

function openEvoDetail(evo) {
  detailCreatureId = evo.to;
  if (els.detailArt) { els.detailArt.src = creaturePortraitUrl(evo.from); els.detailArt.alt = evo.toName; }
  if (els.detailName) els.detailName.textContent = evo.toName;
  if (els.detailMeta) els.detailMeta.textContent = `${evo.toRarity} · Evolved`;
  if (els.detailCP) els.detailCP.textContent = `CP ${game.creatureCP?.[evo.to] || '?'}`;
  if (els.detailCatches) els.detailCatches.textContent = '';
  if (els.detailDate) els.detailDate.textContent = game.firstCaughtDates?.[evo.to] || '—';
  if (els.detailEvolveBtn) els.detailEvolveBtn.classList.add('hidden');
  if (els.detailEvolveInfo) els.detailEvolveInfo.classList.add('hidden');
  if (els.detailModal) els.detailModal.classList.remove('hidden');
}

function closeCreatureDetail() {
  if (els.detailModal) els.detailModal.classList.add('hidden');
  detailCreatureId = null;
}

// --- Tutorial ---
let tutorialStep = 0;
const TUTORIAL_STEPS = [
  'Walk around to discover creatures on the map. They spawn at different distances — rarer creatures appear further away.',
  'Tap a creature and time the shrinking ring to catch it. Build combos for bonus XP and catch rate!',
  'Complete daily quests, hatch eggs, and evolve your creatures. Check your inventory for powerful items!',
];

function showTutorial() {
  if (game.tutorialDone) return;
  tutorialStep = 0;
  if (els.tutorialOverlay) els.tutorialOverlay.classList.remove('hidden');
  updateTutorialStep();
}

function updateTutorialStep() {
  if (els.tutorialText) els.tutorialText.textContent = TUTORIAL_STEPS[tutorialStep];
  if (els.tutorialNextBtn) els.tutorialNextBtn.textContent = tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Let\'s go!';
}

function nextTutorialStep() {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    game.tutorialDone = true;
    saveGame();
    if (els.tutorialOverlay) els.tutorialOverlay.classList.add('hidden');
    return;
  }
  updateTutorialStep();
}

// --- Splash ---
let splashDismissed = false;
function dismissSplash() {
  if (splashDismissed) return;
  splashDismissed = true;
  if (els.splashScreen) {
    els.splashScreen.classList.add('splash--fade');
    setTimeout(() => els.splashScreen.classList.add('hidden'), 600);
  }
}

function showMilestoneToast(meters) {
  if (!els.milestoneToast) return;
  if (els.milestoneText) {
    els.milestoneText.textContent = `${formatDistance(meters)} walked — new spawns unlocked!`;
  }
  els.milestoneToast.classList.remove('hidden');
  if (milestoneToastTimer) clearTimeout(milestoneToastTimer);
  milestoneToastTimer = setTimeout(() => {
    els.milestoneToast.classList.add('hidden');
  }, 4500);
  // Refresh spawns so the bonus kicks in
  if (trust.lastLat != null) {
    lastSpawnPos = null;
    renderSpawns(trust.lastLat, trust.lastLng);
  }
}

// --- Boot ---
initMap();
setGpsPill();
renderCollection();
updateWalkUI();
ensureTodayQuests();
updateXPUI();
updateComboUI();
updateEggHUD();
renderEffectHud();
setInterval(checkComboTimeout, 10_000);
setInterval(renderEffectHud, 1000);
setTimeout(() => checkDailyStreak(), 800);
setTimeout(() => { if (!game.tutorialDone) showTutorial(); }, 1200);
// Splash safety: dismiss after 3s no matter what so the user isn't stuck
setTimeout(dismissSplash, 3000);

els.recenterBtn.addEventListener('click', () => {
  if (trust.lastLat != null) map.setView([trust.lastLat, trust.lastLng], 18);
});

if (els.refreshGpsBtn) {
  els.refreshGpsBtn.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(
      onPosition,
      (e) => showLocBanner(e.message || 'Could not refresh location', 'err'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 }
    );
  });
}

document.querySelectorAll('.bottom-nav__btn').forEach((btn) => {
  btn.addEventListener('click', () => { SFX.tap(); setViewMode(btn.dataset.view); });
});

els.grantLocationBtn.addEventListener('click', () => {
  els.permError.classList.add('hidden');
  // Hide overlay *before* the system permission UI. A full-screen layer on top of the
  // WebView can steal touches or confuse compositing so “Allow” on the system dialog won’t tap.
  els.permGate.classList.add('hidden');
  scheduleMapResize();
  requestAnimationFrame(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        startWatch();
      },
      (err) => {
        els.permGate.classList.remove('hidden');
        els.permError.textContent = err.message || 'Permission denied';
        els.permError.classList.remove('hidden');
        scheduleMapResize();
      },
      GEO_OPTS
    );
  });
});

els.catchTryBtn.addEventListener('click', tryCatch);
els.catchCloseBtn.addEventListener('click', closeCatch);
els.catchModal.querySelector('.modal__backdrop').addEventListener('click', closeCatch);

if (els.hatchCloseBtn) els.hatchCloseBtn.addEventListener('click', hideHatchModal);
if (els.hatchModal) {
  const b = els.hatchModal.querySelector('.modal__backdrop');
  if (b) b.addEventListener('click', hideHatchModal);
}
if (els.detailCloseBtn) els.detailCloseBtn.addEventListener('click', closeCreatureDetail);
if (els.detailModal) {
  const b = els.detailModal.querySelector('.modal__backdrop');
  if (b) b.addEventListener('click', closeCreatureDetail);
}
if (els.detailEvolveBtn) {
  els.detailEvolveBtn.addEventListener('click', () => {
    if (detailCreatureId && canEvolve(detailCreatureId)) {
      evolveCreature(detailCreatureId);
      closeCreatureDetail();
    }
  });
}
if (els.tutorialNextBtn) els.tutorialNextBtn.addEventListener('click', nextTutorialStep);
if (els.tutorialOverlay) els.tutorialOverlay.addEventListener('click', (e) => { if (e.target === els.tutorialOverlay) nextTutorialStep(); });

if (els.dailyClaimBtn) {
  els.dailyClaimBtn.addEventListener('click', () => {
    claimDailyReward();
    hideDailyReward();
    showGenericToast('Daily reward claimed!', '🎁');
  });
}
if (els.dailyModal) {
  const backdrop = els.dailyModal.querySelector('.modal__backdrop');
  if (backdrop) backdrop.addEventListener('click', () => { claimDailyReward(); hideDailyReward(); });
}

if (els.walletConnectBtn) {
  els.walletConnectBtn.addEventListener('click', () => {
    if (walletState.connected) disconnectWallet();
    else connectWallet();
  });
}
if (els.bpUpgradeBtn) {
  els.bpUpgradeBtn.addEventListener('click', () => upgradeBattlePass());
}

if (window.isSecureContext === false && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  els.permError.textContent = 'HTTPS is required for geolocation.';
  els.permError.classList.remove('hidden');
  dismissSplash();
} else if (navigator.permissions && typeof navigator.permissions.query === 'function') {
  navigator.permissions
    .query({ name: 'geolocation' })
    .then((p) => {
      if (p.state === 'granted') {
        els.permGate.classList.add('hidden');
        dismissSplash();
        scheduleMapResize();
        startWatch();
      } else {
        dismissSplash();
      }
    })
    .catch(() => { dismissSplash(); });
} else {
  dismissSplash();
}

window.addEventListener('resize', () => {
  if (map) map.invalidateSize();
});

window.addEventListener('orientationchange', () => scheduleMapResize());
