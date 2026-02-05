/**
 * Production-ready Mobile Wallet Adapter for Seeker
 * Based on official Solana Mobile patterns:
 * - https://github.com/solana-mobile/mobile-wallet-adapter
 * - https://learn.blueshift.gg/en/paths/solana-mobile-mastery
 * 
 * This adapter provides full wallet functionality:
 * - Connect/disconnect
 * - Sign transactions
 * - Sign messages
 * - Get accounts
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
 * Seeker Mobile Wallet Adapter
 * Provides a unified interface for connecting to Seeker's built-in wallet
 */
class SeekerWalletAdapter {
  constructor() {
    this.ready = false;
    this.connected = false;
    this.wallet = null;
    this.account = null;
    this.wallets = null;
    this._initialized = false;
  }

  /**
   * Initialize the adapter and register MWA
   */
  async init() {
    if (this._initialized) return;
    
    try {
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
      this.wallets = getWallets();
      
      // Listen for wallet registration events
      this.wallets.on('register', () => {
        console.log('[Seeker MWA] Wallet registered');
        this._updateWalletList();
      });

      this.wallets.on('unregister', () => {
        console.log('[Seeker MWA] Wallet unregistered');
        this._updateWalletList();
      });

      this.ready = true;
      this._initialized = true;
      
      console.log('[Seeker MWA] Initialized successfully');
      
      // Check for existing authorization
      await this._checkExistingAuth();
      
    } catch (error) {
      console.error('[Seeker MWA] Initialization failed:', error);
      this.ready = false;
      throw error;
    }
  }

  /**
   * Get list of available Solana wallets (including Seeker)
   */
  _updateWalletList() {
    if (!this.wallets) return [];
    const allWallets = this.wallets.get();
    return allWallets.filter(w => 
      w.chains && w.chains.some(c => c.startsWith('solana:'))
    );
  }

  /**
   * Check for existing authorization (cached)
   */
  async _checkExistingAuth() {
    try {
      const wallets = this._updateWalletList();
      if (wallets.length === 0) return;

      // Try to find Seeker's Mobile Wallet Adapter
      const seekerWallet = wallets.find(w => 
        w.name === 'Mobile Wallet Adapter' || 
        w.name.toLowerCase().includes('seeker') ||
        w.name.toLowerCase().includes('seed vault')
      ) || wallets[0];

      // Check if we have cached authorization
      const authFeature = seekerWallet.features?.['solana:signAndSendTransaction'];
      if (authFeature && authFeature.signAndSendTransaction) {
        // Try silent reconnect
        try {
          const connectFeature = seekerWallet.features?.['standard:connect'];
          if (connectFeature?.connect) {
            const result = await connectFeature.connect({ silent: true });
            if (result?.accounts?.length > 0) {
              this.wallet = seekerWallet;
              this.account = result.accounts[0];
              this.connected = true;
              console.log('[Seeker MWA] Reconnected to cached wallet:', this.account.address);
            }
          }
        } catch (e) {
          // Silent connect failed, user will need to reconnect
          console.log('[Seeker MWA] Silent reconnect failed, user will need to authorize');
        }
      }
    } catch (error) {
      console.warn('[Seeker MWA] Error checking existing auth:', error);
    }
  }

  /**
   * Connect to Seeker wallet
   * @param {Object} options - Connection options
   * @param {boolean} options.silent - Try silent connection first
   * @returns {Promise<string>} Public key address
   */
  async connect(options = {}) {
    if (!this.ready) {
      await this.init();
    }

    try {
      const wallets = this._updateWalletList();
      
      if (wallets.length === 0) {
        throw new Error(
          'No Solana wallet found. ' +
          'On Seeker device, use the built-in wallet. ' +
          'On other devices, install a wallet app like Phantom.'
        );
      }

      // Prefer Seeker's Mobile Wallet Adapter
      const seekerWallet = wallets.find(w => 
        w.name === 'Mobile Wallet Adapter' || 
        w.name.toLowerCase().includes('seeker') ||
        w.name.toLowerCase().includes('seed vault')
      ) || wallets[0];

      console.log('[Seeker MWA] Connecting to wallet:', seekerWallet.name);

      const connectFeature = seekerWallet.features?.['standard:connect'];
      if (!connectFeature?.connect) {
        throw new Error(`Wallet "${seekerWallet.name}" does not support connect.`);
      }

      // Attempt connection
      const result = await connectFeature.connect({ 
        silent: options.silent !== false 
      });

      if (!result?.accounts || result.accounts.length === 0) {
        throw new Error('No account selected or authorized.');
      }

      this.wallet = seekerWallet;
      this.account = result.accounts[0];
      this.connected = true;

      console.log('[Seeker MWA] Connected successfully:', {
        wallet: seekerWallet.name,
        address: this.account.address,
        chains: this.account.chains,
      });

      return this.account.address;

    } catch (error) {
      console.error('[Seeker MWA] Connect error:', error);
      this.connected = false;
      this.wallet = null;
      this.account = null;
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect() {
    if (!this.wallet || !this.connected) {
      return;
    }

    try {
      const disconnectFeature = this.wallet.features?.['standard:disconnect'];
      if (disconnectFeature?.disconnect) {
        await disconnectFeature.disconnect();
      }
    } catch (error) {
      console.warn('[Seeker MWA] Disconnect error:', error);
    } finally {
      this.connected = false;
      this.wallet = null;
      this.account = null;
      console.log('[Seeker MWA] Disconnected');
    }
  }

  /**
   * Sign and send a transaction
   * @param {Uint8Array} transaction - Serialized transaction
   * @param {Object} options - Transaction options
   * @returns {Promise<Uint8Array>} Transaction signature
   */
  async signAndSendTransaction(transaction, options = {}) {
    if (!this.connected || !this.wallet) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    const signFeature = this.wallet.features?.['solana:signAndSendTransaction'];
    if (!signFeature?.signAndSendTransaction) {
      throw new Error('Wallet does not support signAndSendTransaction.');
    }

    try {
      console.log('[Seeker MWA] Signing and sending transaction...');
      const result = await signFeature.signAndSendTransaction({
        account: this.account,
        chain: this.account.chains?.[0] || 'solana:devnet',
        transaction,
        options,
      });

      console.log('[Seeker MWA] Transaction sent:', result);
      return result;

    } catch (error) {
      console.error('[Seeker MWA] Sign transaction error:', error);
      throw error;
    }
  }

  /**
   * Sign a transaction without sending
   * @param {Uint8Array} transaction - Serialized transaction
   * @returns {Promise<Uint8Array>} Signed transaction
   */
  async signTransaction(transaction) {
    if (!this.connected || !this.wallet) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    const signFeature = this.wallet.features?.['solana:signTransaction'];
    if (!signFeature?.signTransaction) {
      throw new Error('Wallet does not support signTransaction.');
    }

    try {
      console.log('[Seeker MWA] Signing transaction...');
      const result = await signFeature.signTransaction({
        account: this.account,
        chain: this.account.chains?.[0] || 'solana:devnet',
        transaction,
      });

      console.log('[Seeker MWA] Transaction signed');
      return result;

    } catch (error) {
      console.error('[Seeker MWA] Sign transaction error:', error);
      throw error;
    }
  }

  /**
   * Sign a message
   * @param {Uint8Array} message - Message to sign
   * @returns {Promise<Uint8Array>} Signature
   */
  async signMessage(message) {
    if (!this.connected || !this.wallet) {
      throw new Error('Wallet not connected. Call connect() first.');
    }

    const signFeature = this.wallet.features?.['standard:signMessage'];
    if (!signFeature?.signMessage) {
      throw new Error('Wallet does not support signMessage.');
    }

    try {
      console.log('[Seeker MWA] Signing message...');
      const result = await signFeature.signMessage({
        account: this.account,
        message: { raw: message },
      });

      console.log('[Seeker MWA] Message signed');
      return result;

    } catch (error) {
      console.error('[Seeker MWA] Sign message error:', error);
      throw error;
    }
  }

  /**
   * Get the connected account's public key
   * @returns {string|null} Public key address
   */
  getPublicKey() {
    return this.account?.address || null;
  }

  /**
   * Check if wallet is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.account !== null;
  }
}

// Create singleton instance
const seekerAdapter = new SeekerWalletAdapter();

// Initialize on load
if (typeof window !== 'undefined') {
  seekerAdapter.init().catch(err => {
    console.warn('[Seeker MWA] Auto-init failed:', err);
  });
}

// Expose adapter globally for backward compatibility
if (typeof window !== 'undefined') {
  window.__snakeWalletAdapter = {
    ready: false,
    connectedWallet: null,
    connectedAccount: null,
    connect: async () => {
      if (!seekerAdapter.ready) await seekerAdapter.init();
      const address = await seekerAdapter.connect();
      window.__snakeWalletAdapter.connectedAccount = { address };
      window.__snakeWalletAdapter.connectedWallet = { name: 'Seeker' };
      window.__snakeWalletAdapter.ready = true;
      return address;
    },
    disconnect: async () => {
      await seekerAdapter.disconnect();
      window.__snakeWalletAdapter.connectedWallet = null;
      window.__snakeWalletAdapter.connectedAccount = null;
    },
    signAndSendTransaction: (tx, opts) => seekerAdapter.signAndSendTransaction(tx, opts),
    signTransaction: (tx) => seekerAdapter.signTransaction(tx),
    signMessage: (msg) => seekerAdapter.signMessage(msg),
    getPublicKey: () => seekerAdapter.getPublicKey(),
    isConnected: () => seekerAdapter.isConnected(),
  };

  // Update ready state when adapter initializes
  Object.defineProperty(window.__snakeWalletAdapter, 'ready', {
    get: () => seekerAdapter.ready,
    enumerable: true,
    configurable: true,
  });
}

export default seekerAdapter;
