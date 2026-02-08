/**
 * Production-ready Mobile Wallet Adapter for Seeker
 * Uses official Mobile Wallet Standard per Solana Mobile docs:
 * https://docs.solanamobile.com/mobile-wallet-adapter/web-installation
 *
 * registerMwa() registers MWA as a wallet option; on mobile it uses
 * Android Intents (same as native apps). Also see:
 * - https://github.com/solana-mobile/mobile-wallet-adapter
 *
 * Build: npm run build:mwa
 */
import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-standard-mobile';
import { getWallets } from '@wallet-standard/core';

const APP_ORIGIN = typeof location !== 'undefined' ? location.origin : 'https://snake-web-phi.vercel.app';
const APP_NAME = 'Snake - Solana';
const APP_ICON = APP_ORIGIN + '/icons/icon.svg';

/**
 * Enhanced Seeker Mobile Wallet Adapter
 * Provides full wallet functionality for Seeker device
 */
const adapter = {
  ready: false,
  connected: false,
  connectedWallet: null,
  connectedAccount: null,
  wallets: null,
  _initialized: false,
};

/**
 * Initialize the adapter and register MWA with Seeker
 */
function init() {
  if (adapter._initialized) {
    console.log('[Seeker MWA] Already initialized');
    return;
  }

  try {
    console.log('[Seeker MWA] Initializing...');

    // Register Mobile Wallet Adapter with Seeker
    registerMwa({
      appIdentity: {
        name: APP_NAME,
        uri: APP_ORIGIN,
        icon: APP_ICON,
      },
      authorizationCache: createDefaultAuthorizationCache(),
      chains: ['solana:devnet', 'solana:mainnet'],
      chainSelector: createDefaultChainSelector(),
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });

    // Get wallet registry
    adapter.wallets = getWallets();

    // Listen for wallet registration events
    adapter.wallets.on('register', () => {
      console.log('[Seeker MWA] Wallet registered');
    });

    adapter.wallets.on('unregister', () => {
      console.log('[Seeker MWA] Wallet unregistered');
      if (adapter.connectedWallet) {
        adapter.connected = false;
        adapter.connectedWallet = null;
        adapter.connectedAccount = null;
      }
    });

    adapter.ready = true;
    adapter._initialized = true;

    console.log('[Seeker MWA] ✅ Initialized successfully');

    // Check for existing authorization (cached)
    checkExistingAuth();

  } catch (e) {
    console.error('[Seeker MWA] ❌ Initialization failed:', e);
    adapter.ready = false;
  }
}

/**
 * Get list of available Solana wallets (including Seeker)
 */
function getSolanaWallets() {
  if (!adapter.wallets) return [];
  const allWallets = adapter.wallets.get();
  return allWallets.filter(w =>
    w.chains && w.chains.some(c => c.startsWith('solana:'))
  );
}

/**
 * Find Seeker's Mobile Wallet Adapter
 */
function findSeekerWallet(wallets) {
  return wallets.find(w =>
    w.name === 'Mobile Wallet Adapter' ||
    w.name.toLowerCase().includes('seeker') ||
    w.name.toLowerCase().includes('seed vault')
  ) || wallets[0];
}

/**
 * Check for existing authorization (cached)
 */
async function checkExistingAuth() {
  try {
    const wallets = getSolanaWallets();
    if (wallets.length === 0) return;

    const seekerWallet = findSeekerWallet(wallets);

    // Try silent reconnect if we have cached auth
    const connectFeature = seekerWallet.features?.['standard:connect'];
    if (connectFeature?.connect) {
      try {
        const result = await connectFeature.connect({ silent: true });
        if (result?.accounts?.length > 0) {
          adapter.connectedWallet = seekerWallet;
          adapter.connectedAccount = result.accounts[0];
          adapter.connected = true;
          console.log('[Seeker MWA] ✅ Reconnected to cached wallet:', adapter.connectedAccount.address);
        }
      } catch (e) {
        // Silent connect failed, user will need to reconnect
        console.log('[Seeker MWA] Silent reconnect failed (normal if first time)');
      }
    }
  } catch (error) {
    console.warn('[Seeker MWA] Error checking existing auth:', error);
  }
}

/**
 * Connect to Seeker wallet
 */
adapter.connect = async function (options = {}) {
  if (!adapter.ready) {
    init();
    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  try {
    const wallets = getSolanaWallets();

    if (wallets.length === 0) {
      throw new Error(
        'No Solana wallet found. ' +
        'On Seeker device, use the built-in wallet. ' +
        'On other devices, install a wallet app like Phantom.'
      );
    }

    // Prefer Seeker's Mobile Wallet Adapter
    const seekerWallet = findSeekerWallet(wallets);
    console.log('[Seeker MWA] Connecting to wallet:', seekerWallet.name);

    const connectFeature = seekerWallet.features?.['standard:connect'];
    if (!connectFeature?.connect) {
      throw new Error(`Wallet "${seekerWallet.name}" does not support connect.`);
    }

    console.log('[Seeker MWA] Calling connect()...');
    const result = await connectFeature.connect({
      silent: options.silent !== false,
    });

    console.log('[Seeker MWA] Connect result:', result);

    if (!result?.accounts || result.accounts.length === 0) {
      throw new Error('No account selected or authorized.');
    }

    adapter.connectedWallet = seekerWallet;
    adapter.connectedAccount = result.accounts[0];
    adapter.connected = true;

    console.log('[Seeker MWA] ✅ Connected successfully:', {
      wallet: seekerWallet.name,
      address: adapter.connectedAccount.address,
      chains: adapter.connectedAccount.chains,
    });

    return adapter.connectedAccount.address;

  } catch (connectErr) {
    console.error('[Seeker MWA] ❌ Connect error:', connectErr);
    adapter.connected = false;
    adapter.connectedWallet = null;
    adapter.connectedAccount = null;
    throw new Error(`Failed to connect to Seeker wallet: ${connectErr.message || String(connectErr)}`);
  }
};

/**
 * Disconnect from wallet
 */
adapter.disconnect = async function () {
  if (!adapter.connectedWallet || !adapter.connected) {
    return;
  }

  try {
    const disconnectFeature = adapter.connectedWallet.features?.['standard:disconnect'];
    if (disconnectFeature?.disconnect) {
      await disconnectFeature.disconnect();
    }
  } catch (error) {
    console.warn('[Seeker MWA] Disconnect error:', error);
  } finally {
    adapter.connected = false;
    adapter.connectedWallet = null;
    adapter.connectedAccount = null;
    console.log('[Seeker MWA] Disconnected');
  }
};

/**
 * Sign and send a transaction
 */
adapter.signAndSendTransaction = async function (transaction, options = {}) {
  if (!adapter.connected || !adapter.connectedWallet) {
    throw new Error('Wallet not connected. Call connect() first.');
  }

  const signFeature = adapter.connectedWallet.features?.['solana:signAndSendTransaction'];
  if (!signFeature?.signAndSendTransaction) {
    throw new Error('Wallet does not support signAndSendTransaction.');
  }

  try {
    console.log('[Seeker MWA] Signing and sending transaction...');
    const result = await signFeature.signAndSendTransaction({
      account: adapter.connectedAccount,
      chain: adapter.connectedAccount.chains?.[0] || 'solana:devnet',
      transaction,
      options,
    });

    console.log('[Seeker MWA] ✅ Transaction sent');
    return result;

  } catch (error) {
    console.error('[Seeker MWA] ❌ Sign transaction error:', error);
    throw error;
  }
};

/**
 * Sign a transaction without sending
 */
adapter.signTransaction = async function (transaction) {
  if (!adapter.connected || !adapter.connectedWallet) {
    throw new Error('Wallet not connected. Call connect() first.');
  }

  const signFeature = adapter.connectedWallet.features?.['solana:signTransaction'];
  if (!signFeature?.signTransaction) {
    throw new Error('Wallet does not support signTransaction.');
  }

  try {
    console.log('[Seeker MWA] Signing transaction...');
    const result = await signFeature.signTransaction({
      account: adapter.connectedAccount,
      chain: adapter.connectedAccount.chains?.[0] || 'solana:devnet',
      transaction,
    });

    console.log('[Seeker MWA] ✅ Transaction signed');
    return result;

  } catch (error) {
    console.error('[Seeker MWA] ❌ Sign transaction error:', error);
    throw error;
  }
};

/**
 * Sign a message
 */
adapter.signMessage = async function (message) {
  if (!adapter.connected || !adapter.connectedWallet) {
    throw new Error('Wallet not connected. Call connect() first.');
  }

  const signFeature = adapter.connectedWallet.features?.['standard:signMessage'];
  if (!signFeature?.signMessage) {
    throw new Error('Wallet does not support signMessage.');
  }

  try {
    console.log('[Seeker MWA] Signing message...');
    const result = await signFeature.signMessage({
      account: adapter.connectedAccount,
      message: { raw: message },
    });

    console.log('[Seeker MWA] ✅ Message signed');
    return result;

  } catch (error) {
    console.error('[Seeker MWA] ❌ Sign message error:', error);
    throw error;
  }
};

/**
 * Get the connected account's public key
 */
adapter.getPublicKey = function () {
  return adapter.connectedAccount?.address || null;
};

/**
 * Check if wallet is connected
 */
adapter.isConnected = function () {
  return adapter.connected && adapter.connectedAccount !== null;
};

// Initialize on load
init();

// Expose adapter globally (unless running inside Expo/WebView app - they inject their own bridge)
if (typeof window !== 'undefined') {
  if (window.__SNAKE_IN_APP) {
    // In-app: leave stub so Expo's injected script can attach connect(); just mark ready
    window.__snakeWalletAdapter = window.__snakeWalletAdapter || { ready: false, connect: null, disconnect: null };
    window.__snakeWalletAdapter.ready = true;
    console.log('[Seeker MWA] In-app mode: adapter ready for native bridge');
  } else {
    window.__snakeWalletAdapter = adapter;
    console.log('[Seeker MWA] Adapter exposed on window.__snakeWalletAdapter, ready:', adapter.ready);
  }
}

export default adapter;
