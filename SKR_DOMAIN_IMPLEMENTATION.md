# Implementing .skr Domain Display in Your Snake Game

## Overview
This guide will help you integrate .skr domain name resolution into your Solana Snake game. When users connect their Phantom wallet, the game will automatically detect and display their .skr domain (if they have one).

## What are .skr Domains?
- .skr domains are Seeker IDs from Solana Mobile's Seeker phone
- They're built on the AllDomains protocol
- They serve as on-chain identity for Solana Mobile ecosystem users
- Each Seeker phone comes with a unique .skr domain

## Prerequisites
You'll need to install the AllDomains TLD Parser library:

```bash
npm install @onsol/tldparser
# or
yarn add @onsol/tldparser
```

## Implementation Steps

### 1. Install Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.87.6",
    "@solana/wallet-adapter-wallets": "^0.19.23",
    "@onsol/tldparser": "^0.5.2"
  }
}
```

### 2. Create Domain Resolution Utility

Create a new file: `app/utils/domainResolver.js`

```javascript
import { TldParser } from '@onsol/tldparser';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Resolves .skr domains for a given wallet address
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<string|null>} - The .skr domain name or null if none found
 */
export async function resolveSKRDomain(walletAddress, connection) {
  try {
    const parser = new TldParser(connection);
    const ownerPublicKey = new PublicKey(walletAddress);
    
    // Get all domains owned by this wallet from the .skr TLD
    const skrDomains = await parser.getParsedAllUserDomainsFromTld(
      ownerPublicKey,
      'skr' // TLD without the dot
    );
    
    if (skrDomains && skrDomains.length > 0) {
      // Return the first .skr domain found
      // Note: Most users will only have one .skr domain from their Seeker phone
      return `${skrDomains[0]}.skr`;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving .skr domain:', error);
    return null;
  }
}

/**
 * Get the main/favorite domain for a wallet (if set)
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<string|null>} - The main domain or null
 */
export async function getMainDomain(walletAddress, connection) {
  try {
    const parser = new TldParser(connection);
    const ownerPublicKey = new PublicKey(walletAddress);
    
    const mainDomain = await parser.getMainDomain(ownerPublicKey);
    
    if (mainDomain) {
      return mainDomain;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting main domain:', error);
    return null;
  }
}
```

### 3. Update Your Wallet Connection Logic

Modify your existing wallet connection code (likely in `app/index.html` or a separate JS file):

```javascript
import { resolveSKRDomain } from './utils/domainResolver.js';

// After wallet connects successfully
async function onWalletConnected(wallet, connection) {
  const walletAddress = wallet.publicKey.toString();
  
  // Try to resolve .skr domain
  const skrDomain = await resolveSKRDomain(walletAddress, connection);
  
  // Update UI to show the domain
  updatePlayerDisplay(walletAddress, skrDomain);
  
  // Store in your player state
  window.playerData = {
    address: walletAddress,
    skrDomain: skrDomain,
    displayName: skrDomain || truncateAddress(walletAddress)
  };
}

// Helper function to truncate address for display
function truncateAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Update the UI to show the domain
function updatePlayerDisplay(address, domain) {
  const playerNameElement = document.getElementById('player-name');
  
  if (domain) {
    // If user has a .skr domain, show it prominently
    playerNameElement.innerHTML = `
      <div class="player-identity">
        <span class="skr-domain">${domain}</span>
        <span class="wallet-address">${truncateAddress(address)}</span>
      </div>
    `;
  } else {
    // Show just the truncated address
    playerNameElement.innerHTML = `
      <div class="player-identity">
        <span class="wallet-address">${truncateAddress(address)}</span>
      </div>
    `;
  }
}
```

### 4. Update Your HTML Structure

Add this to your `app/index.html` in the player info section:

```html
<div id="player-info" class="hidden">
  <div id="player-name"></div>
  <div id="player-stats">
    <span>High Score: <span id="high-score">0</span></span>
    <span>Games Played: <span id="games-played">0</span></span>
  </div>
</div>
```

### 5. Add CSS Styling

Add to your CSS file (or `<style>` section):

```css
.player-identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skr-domain {
  font-size: 1.5rem;
  font-weight: bold;
  color: #14F195; /* Solana green */
  background: linear-gradient(90deg, #14F195, #9945FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wallet-address {
  font-size: 0.875rem;
  color: #666;
  font-family: monospace;
}

/* Loading state for domain resolution */
.resolving-domain {
  opacity: 0.6;
  position: relative;
}

.resolving-domain::after {
  content: '...';
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
```

### 6. Full Integration Example

Here's a complete example showing the wallet connection flow with domain resolution:

```javascript
// app/wallet-integration.js
import { resolveSKRDomain } from './utils/domainResolver.js';
import { Connection, clusterApiUrl } from '@solana/web3.js';

class WalletManager {
  constructor() {
    this.wallet = null;
    this.connection = new Connection(
      clusterApiUrl('devnet'), // Use 'mainnet-beta' for production
      'confirmed'
    );
    this.playerData = null;
  }

  async connectWallet() {
    try {
      // Check if Phantom is installed
      const { solana } = window;
      
      if (!solana || !solana.isPhantom) {
        alert('Please install Phantom wallet!');
        return false;
      }

      // Show loading state
      this.showLoadingState('Connecting wallet...');

      // Connect to wallet
      const response = await solana.connect();
      this.wallet = solana;
      const walletAddress = response.publicKey.toString();

      // Show loading state for domain resolution
      this.showLoadingState('Resolving .skr domain...');

      // Try to resolve .skr domain
      const skrDomain = await resolveSKRDomain(walletAddress, this.connection);

      // Store player data
      this.playerData = {
        address: walletAddress,
        skrDomain: skrDomain,
        displayName: skrDomain || this.truncateAddress(walletAddress)
      };

      // Update UI
      this.updateUI();

      // Hide loading state
      this.hideLoadingState();

      console.log('Connected wallet:', walletAddress);
      if (skrDomain) {
        console.log('Found .skr domain:', skrDomain);
      }

      return true;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      this.hideLoadingState();
      alert('Failed to connect wallet. Please try again.');
      return false;
    }
  }

  updateUI() {
    const playerNameElement = document.getElementById('player-name');
    const connectButton = document.getElementById('connect-wallet-btn');
    const playerInfo = document.getElementById('player-info');

    if (!this.playerData) return;

    // Hide connect button
    if (connectButton) {
      connectButton.style.display = 'none';
    }

    // Show player info
    if (playerInfo) {
      playerInfo.classList.remove('hidden');
    }

    // Update player name display
    if (playerNameElement) {
      if (this.playerData.skrDomain) {
        playerNameElement.innerHTML = `
          <div class="player-identity">
            <span class="skr-domain">${this.playerData.skrDomain}</span>
            <span class="wallet-address">${this.truncateAddress(this.playerData.address)}</span>
          </div>
        `;
      } else {
        playerNameElement.innerHTML = `
          <div class="player-identity">
            <span class="wallet-address">${this.truncateAddress(this.playerData.address)}</span>
          </div>
        `;
      }
    }
  }

  showLoadingState(message) {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
      loadingElement.textContent = message;
      loadingElement.classList.remove('hidden');
    }
  }

  hideLoadingState() {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }

  truncateAddress(address) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  getPlayerData() {
    return this.playerData;
  }
}

// Export singleton instance
export const walletManager = new WalletManager();

// Expose to window for easy access
window.walletManager = walletManager;
```

### 7. Update Your Leaderboard to Show Domains

Modify your leaderboard display to show .skr domains:

```javascript
async function updateLeaderboard(leaderboardData, connection) {
  const leaderboardElement = document.getElementById('leaderboard');
  
  // Resolve domains for all players in parallel
  const playerPromises = leaderboardData.map(async (entry) => {
    const domain = await resolveSKRDomain(entry.player.toString(), connection);
    return {
      ...entry,
      displayName: domain || truncateAddress(entry.player.toString()),
      hasDomain: !!domain
    };
  });
  
  const playersWithDomains = await Promise.all(playerPromises);
  
  // Sort and display
  const leaderboardHTML = playersWithDomains
    .sort((a, b) => b.score - a.score)
    .map((player, index) => `
      <div class="leaderboard-entry ${player.hasDomain ? 'has-domain' : ''}">
        <span class="rank">#${index + 1}</span>
        <span class="player-name">${player.displayName}</span>
        <span class="score">${player.score}</span>
      </div>
    `)
    .join('');
  
  leaderboardElement.innerHTML = leaderboardHTML;
}
```

## Testing

### Test on Devnet
1. Deploy your contract to devnet
2. Connect with a test wallet
3. Domain resolution should work (though your test wallet probably won't have a .skr domain)

### Test with a Real Seeker User
To properly test .skr domain display:
1. You'll need access to a Solana Mobile Seeker phone with a claimed .skr domain
2. Or connect with a wallet that has registered a .skr domain through AllDomains

### Fallback Behavior
- If no .skr domain is found, the UI will gracefully show the truncated wallet address
- Error handling ensures the game still works even if domain resolution fails

## Production Considerations

1. **RPC Endpoint**: Use a reliable RPC provider (QuickNode, Helius, etc.) for production
   ```javascript
   const connection = new Connection('https://your-rpc-endpoint.com');
   ```

2. **Caching**: Cache domain resolutions to reduce RPC calls
   ```javascript
   const domainCache = new Map();
   
   async function resolveSKRDomainWithCache(address, connection) {
     if (domainCache.has(address)) {
       return domainCache.get(address);
     }
     
     const domain = await resolveSKRDomain(address, connection);
     domainCache.set(address, domain);
     return domain;
   }
   ```

3. **Error Handling**: Add proper error handling for network issues
4. **Loading States**: Show loading indicators during domain resolution
5. **Rate Limiting**: Be mindful of RPC rate limits

## Example Flow

1. User clicks "Connect Wallet"
2. Phantom wallet prompts for approval
3. Wallet connects successfully
4. App queries AllDomains for .skr domain
5. If found: Display ".skr domain name" prominently
6. If not found: Display truncated wallet address
7. User can now play with their identity visible

## Additional Features You Could Add

1. **Domain Verification Badge**: Add a ✓ badge next to verified .skr domains
2. **Domain Tooltip**: Show full wallet address on hover
3. **Domain Linking**: Make domains clickable (link to Solscan or AllDomains)
4. **Multiple Domain Support**: Allow users to select which domain to display if they have multiple
5. **Domain NFT Display**: Show the .skr domain NFT as an avatar

## Resources

- AllDomains Documentation: https://docs.alldomains.id
- TLD Parser GitHub: https://github.com/onsol-labs/tld-parser
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
- Phantom Wallet Docs: https://docs.phantom.app/

## Need Help?

If you encounter issues:
1. Check browser console for error messages
2. Verify RPC endpoint is working
3. Ensure @onsol/tldparser is properly installed
4. Test with a wallet that has a known .skr domain
5. Join the AllDomains Discord or Solana Mobile community for support
