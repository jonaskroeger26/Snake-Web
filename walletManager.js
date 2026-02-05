/**
 * Wallet Manager with .skr Domain Resolution
 * Integrates Phantom wallet connection with AllDomains .skr domain resolution
 */

import { resolveSKRDomain, getDisplayName, truncateAddress } from './domainResolver.js';
import { Connection, clusterApiUrl } from '@solana/web3.js';

class WalletManager {
  constructor(rpcEndpoint = null) {
    this.wallet = null;
    
    // Use provided RPC endpoint or default to devnet
    // For production, use mainnet-beta and consider a premium RPC provider
    this.connection = new Connection(
      rpcEndpoint || clusterApiUrl('devnet'),
      'confirmed'
    );
    
    this.playerData = null;
    this.isConnecting = false;
    
    // Domain cache to avoid repeated lookups
    this.domainCache = new Map();
  }

  /**
   * Connect to Phantom wallet and resolve .skr domain
   * @returns {Promise<boolean>} - True if connection successful
   */
  async connectWallet() {
    if (this.isConnecting) {
      console.log('Connection already in progress...');
      return false;
    }

    try {
      this.isConnecting = true;

      // Check if Phantom is installed
      const { solana } = window;
      
      if (!solana || !solana.isPhantom) {
        this.showError('Please install Phantom wallet!');
        this.isConnecting = false;
        return false;
      }

      // Show loading state
      this.showLoadingState('Connecting wallet...');

      // Connect to wallet
      const response = await solana.connect();
      this.wallet = solana;
      const walletAddress = response.publicKey.toString();

      console.log('Wallet connected:', walletAddress);

      // Show loading state for domain resolution
      this.showLoadingState('Resolving .skr domain...');

      // Try to resolve .skr domain with caching
      let skrDomain = this.domainCache.get(walletAddress);
      
      if (!skrDomain) {
        skrDomain = await resolveSKRDomain(walletAddress, this.connection);
        
        if (skrDomain) {
          this.domainCache.set(walletAddress, skrDomain);
        }
      }

      // Store player data
      this.playerData = {
        address: walletAddress,
        skrDomain: skrDomain,
        displayName: skrDomain || truncateAddress(walletAddress),
        publicKey: response.publicKey
      };

      // Update UI
      this.updateUI();

      // Hide loading state
      this.hideLoadingState();

      // Log connection details
      if (skrDomain) {
        console.log('✅ Connected with .skr domain:', skrDomain);
      } else {
        console.log('✅ Connected (no .skr domain found)');
      }

      // Setup disconnect listener
      this.setupDisconnectListener();

      this.isConnecting = false;
      return true;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      this.hideLoadingState();
      this.showError('Failed to connect wallet. Please try again.');
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet() {
    try {
      if (this.wallet) {
        await this.wallet.disconnect();
      }
      
      this.wallet = null;
      this.playerData = null;
      
      // Update UI to show disconnected state
      this.updateUIDisconnected();
      
      console.log('Wallet disconnected');
      
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  /**
   * Setup listener for wallet disconnect events
   */
  setupDisconnectListener() {
    if (!this.wallet) return;

    this.wallet.on('disconnect', () => {
      console.log('Wallet disconnected by user');
      this.wallet = null;
      this.playerData = null;
      this.updateUIDisconnected();
    });

    this.wallet.on('accountChanged', async (publicKey) => {
      if (publicKey) {
        console.log('Account changed:', publicKey.toString());
        // Reconnect with new account
        await this.connectWallet();
      } else {
        // Disconnected
        this.disconnectWallet();
      }
    });
  }

  /**
   * Update UI when wallet is connected
   */
  updateUI() {
    const playerNameElement = document.getElementById('player-name');
    const connectButton = document.getElementById('connect-wallet-btn');
    const disconnectButton = document.getElementById('disconnect-wallet-btn');
    const playerInfo = document.getElementById('player-info');

    if (!this.playerData) return;

    // Hide connect button, show disconnect button
    if (connectButton) {
      connectButton.style.display = 'none';
    }
    if (disconnectButton) {
      disconnectButton.style.display = 'block';
    }

    // Show player info
    if (playerInfo) {
      playerInfo.classList.remove('hidden');
    }

    // Update player name display
    if (playerNameElement) {
      if (this.playerData.skrDomain) {
        // User has a .skr domain - show it prominently
        playerNameElement.innerHTML = `
          <div class="player-identity">
            <div class="skr-badge">
              <svg class="seeker-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#14F195"/>
                <path d="M2 17L12 22L22 17" stroke="#14F195" stroke-width="2"/>
              </svg>
              <span class="badge-text">Seeker</span>
            </div>
            <span class="skr-domain">${this.playerData.skrDomain}</span>
            <span class="wallet-address" title="${this.playerData.address}">
              ${truncateAddress(this.playerData.address)}
            </span>
          </div>
        `;
      } else {
        // No domain - show truncated address
        playerNameElement.innerHTML = `
          <div class="player-identity">
            <span class="wallet-address" title="${this.playerData.address}">
              ${truncateAddress(this.playerData.address)}
            </span>
          </div>
        `;
      }
    }

    // Trigger custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('walletConnected', {
      detail: this.playerData
    }));
  }

  /**
   * Update UI when wallet is disconnected
   */
  updateUIDisconnected() {
    const playerNameElement = document.getElementById('player-name');
    const connectButton = document.getElementById('connect-wallet-btn');
    const disconnectButton = document.getElementById('disconnect-wallet-btn');
    const playerInfo = document.getElementById('player-info');

    // Show connect button, hide disconnect button
    if (connectButton) {
      connectButton.style.display = 'block';
    }
    if (disconnectButton) {
      disconnectButton.style.display = 'none';
    }

    // Hide player info
    if (playerInfo) {
      playerInfo.classList.add('hidden');
    }

    // Clear player name
    if (playerNameElement) {
      playerNameElement.innerHTML = '';
    }

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }

  /**
   * Show loading state with message
   */
  showLoadingState(message) {
    let loadingElement = document.getElementById('loading-message');
    
    if (!loadingElement) {
      // Create loading element if it doesn't exist
      loadingElement = document.createElement('div');
      loadingElement.id = 'loading-message';
      loadingElement.className = 'loading-overlay';
      document.body.appendChild(loadingElement);
    }
    
    loadingElement.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    loadingElement.classList.remove('hidden');
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    alert(message); // Simple alert - you can make this fancier
  }

  /**
   * Get current player data
   */
  getPlayerData() {
    return this.playerData;
  }

  /**
   * Check if wallet is connected
   */
  isConnected() {
    return this.wallet !== null && this.playerData !== null;
  }

  /**
   * Get the connection object
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Resolve display name for any wallet address (useful for leaderboards)
   */
  async resolveDisplayName(walletAddress) {
    // Check cache first
    if (this.domainCache.has(walletAddress)) {
      const domain = this.domainCache.get(walletAddress);
      return {
        displayName: domain,
        hasDomain: true,
        fullAddress: walletAddress
      };
    }

    // Resolve from blockchain
    const displayData = await getDisplayName(walletAddress, this.connection);
    
    // Cache the result if domain found
    if (displayData.hasDomain) {
      this.domainCache.set(walletAddress, displayData.displayName);
    }
    
    return displayData;
  }
}

// Create and export singleton instance
export const walletManager = new WalletManager();

// Make it globally available
window.walletManager = walletManager;

// Setup button event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById('connect-wallet-btn');
  const disconnectButton = document.getElementById('disconnect-wallet-btn');

  if (connectButton) {
    connectButton.addEventListener('click', async () => {
      await walletManager.connectWallet();
    });
  }

  if (disconnectButton) {
    disconnectButton.addEventListener('click', async () => {
      await walletManager.disconnectWallet();
    });
  }

  // Check if wallet is already connected (auto-connect)
  if (window.solana && window.solana.isConnected) {
    console.log('Wallet already connected, auto-connecting...');
    walletManager.connectWallet();
  }
});

export default walletManager;
