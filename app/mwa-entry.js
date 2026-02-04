/**
 * Entry for bundling Mobile Wallet Adapter (Seeker / Seed Vault).
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

const adapter = {
  ready: false,
  connectedWallet: null,
  connectedAccount: null,
  connect: null,
  disconnect: null,
};

function init() {
  try {
    registerMwa({
      appIdentity: { name: APP_NAME, uri: APP_ORIGIN, icon: APP_ICON },
      authorizationCache: createDefaultAuthorizationCache(),
      chains: ['solana:devnet', 'solana:mainnet'],
      chainSelector: createDefaultChainSelector(),
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });

    const wallets = getWallets();

    adapter.connect = async function () {
      const list = wallets.get();
      console.log('[MWA] All wallets:', list.map(w => ({ name: w.name, chains: w.chains })));
      const solanaWallets = list.filter((w) =>
        w.chains && w.chains.some((c) => c.startsWith('solana:'))
      );
      console.log('[MWA] Solana wallets:', solanaWallets.map(w => w.name));
      if (solanaWallets.length === 0) {
        throw new Error('No Solana wallet found. On Seeker, use the built-in wallet or install a wallet app.');
      }
      const mwaWallet = solanaWallets.find((w) => w.name === 'Mobile Wallet Adapter');
      console.log('[MWA] MWA wallet found:', !!mwaWallet);
      const wallet = mwaWallet || solanaWallets[0];
      console.log('[MWA] Using wallet:', wallet.name);
      const connectFeature = wallet.features['standard:connect'];
      if (!connectFeature || !connectFeature.connect) {
        throw new Error('Wallet does not support connect.');
      }
      console.log('[MWA] Calling connect() on wallet:', wallet.name);
      let result;
      try {
        result = await connectFeature.connect({ silent: false });
        console.log('[MWA] Connect result:', result);
      } catch (connectErr) {
        console.error('[MWA] Connect error:', connectErr);
        throw new Error(`Failed to connect to ${wallet.name}: ${connectErr.message || String(connectErr)}`);
      }
      const accounts = result && result.accounts;
      console.log('[MWA] Accounts from connect:', accounts);
      if (!accounts || accounts.length === 0) {
        throw new Error('No account selected.');
      }
      const account = accounts[0];
      console.log('[MWA] Selected account:', account.address);
      adapter.connectedWallet = wallet;
      adapter.connectedAccount = account;
      return account.address;
    };

    adapter.disconnect = async function () {
      const wallet = adapter.connectedWallet;
      if (wallet) {
        const disconnectFeature = wallet.features && wallet.features['standard:disconnect'];
        if (disconnectFeature && disconnectFeature.disconnect) {
          await disconnectFeature.disconnect();
        }
        adapter.connectedWallet = null;
        adapter.connectedAccount = null;
      }
    };

    adapter.ready = true;
    console.log('[MWA] Mobile Wallet Adapter initialized successfully');
  } catch (e) {
    console.error('[MWA] Mobile Wallet Adapter not loaded:', e);
    adapter.ready = false;
  }
}

init();
window.__snakeWalletAdapter = adapter;
console.log('[MWA] Adapter exposed on window.__snakeWalletAdapter, ready:', adapter.ready);
