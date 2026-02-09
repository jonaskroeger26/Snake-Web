/**
 * Registers Mobile Wallet Adapter (Seeker / Seed Vault) and exposes a single connect API.
 * On Solana Mobile (Seeker), this allows connecting to the device's internal wallet.
 */
const APP_ORIGIN = typeof location !== 'undefined' ? location.origin : 'https://solanasnake.app';
const APP_NAME = 'Snake - Solana';
const APP_ICON = APP_ORIGIN + '/icons/icon.svg';

window.__snakeWalletAdapter = {
  ready: false,
  connectedWallet: null,
  connectedAccount: null,
  connect: null,
  disconnect: null,
};

async function init() {
  try {
    const mwa = await import('https://esm.run/@solana-mobile/wallet-standard-mobile@0.4.1');
    const core = await import('https://esm.run/@wallet-standard/core@1.0.1');

    mwa.registerMwa({
      appIdentity: { name: APP_NAME, uri: APP_ORIGIN, icon: APP_ICON },
      authorizationCache: mwa.createDefaultAuthorizationCache(),
      chains: ['solana:devnet', 'solana:mainnet'],
      chainSelector: mwa.createDefaultChainSelector(),
      onWalletNotFound: mwa.createDefaultWalletNotFoundHandler(),
    });

    const wallets = core.getWallets();

    window.__snakeWalletAdapter.connect = async function () {
      const list = wallets.get();
      const solanaWallets = list.filter(function (w) {
        return w.chains && w.chains.some(function (c) { return c.startsWith('solana:'); });
      });
      if (solanaWallets.length === 0) {
        throw new Error('No Solana wallet found. On Seeker, use the built-in wallet or install a wallet app.');
      }
      const mwaWallet = solanaWallets.find(function (w) { return w.name === 'Mobile Wallet Adapter'; });
      const wallet = mwaWallet || solanaWallets[0];
      const connectFeature = wallet.features['standard:connect'];
      if (!connectFeature || !connectFeature.connect) {
        throw new Error('Wallet does not support connect.');
      }
      const result = await connectFeature.connect({ silent: false });
      const accounts = result && result.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('No account selected.');
      }
      const account = accounts[0];
      window.__snakeWalletAdapter.connectedWallet = wallet;
      window.__snakeWalletAdapter.connectedAccount = account;
      return account.address;
    };

    window.__snakeWalletAdapter.disconnect = async function () {
      const wallet = window.__snakeWalletAdapter.connectedWallet;
      if (wallet) {
        const disconnectFeature = wallet.features && wallet.features['standard:disconnect'];
        if (disconnectFeature && disconnectFeature.disconnect) {
          await disconnectFeature.disconnect();
        }
        window.__snakeWalletAdapter.connectedWallet = null;
        window.__snakeWalletAdapter.connectedAccount = null;
      }
    };

    window.__snakeWalletAdapter.ready = true;
  } catch (e) {
    console.warn('[Snake] Mobile Wallet Adapter not loaded:', e.message);
    window.__snakeWalletAdapter.ready = false;
  }
}

init();
