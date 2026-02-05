/**
 * Domain Resolver Utility for .skr and other AllDomains TLDs
 * Uses the @onsol/tldparser library to resolve Solana domains
 */

import { TldParser } from '@onsol/tldparser';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Resolves .skr domains for a given wallet address
 * .skr domains are unique to Solana Mobile Seeker phone owners
 * 
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<string|null>} - The .skr domain name or null if none found
 */
export async function resolveSKRDomain(walletAddress, connection) {
  try {
    console.log('Resolving .skr domain for:', walletAddress);
    
    const parser = new TldParser(connection);
    const ownerPublicKey = new PublicKey(walletAddress);
    
    // Get all domains owned by this wallet from the .skr TLD
    // Note: 'skr' without the dot
    const skrDomains = await parser.getParsedAllUserDomainsFromTld(
      ownerPublicKey,
      'skr'
    );
    
    if (skrDomains && skrDomains.length > 0) {
      // Most Seeker phone users will have exactly one .skr domain
      // Return the first one found
      const domainName = `${skrDomains[0]}.skr`;
      console.log('Found .skr domain:', domainName);
      return domainName;
    }
    
    console.log('No .skr domain found for this wallet');
    return null;
    
  } catch (error) {
    console.error('Error resolving .skr domain:', error);
    return null;
  }
}

/**
 * Get all domains owned by a wallet from a specific TLD
 * 
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {string} tld - The TLD to search (without the dot, e.g., 'skr', 'sol', 'bonk')
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<string[]>} - Array of domain names
 */
export async function getDomainsFromTLD(walletAddress, tld, connection) {
  try {
    const parser = new TldParser(connection);
    const ownerPublicKey = new PublicKey(walletAddress);
    
    const domains = await parser.getParsedAllUserDomainsFromTld(
      ownerPublicKey,
      tld
    );
    
    if (domains && domains.length > 0) {
      return domains.map(domain => `${domain}.${tld}`);
    }
    
    return [];
    
  } catch (error) {
    console.error(`Error getting domains from .${tld}:`, error);
    return [];
  }
}

/**
 * Get the main/favorite domain for a wallet (if set)
 * Users can set one domain as their "main" domain which represents their primary identity
 * 
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
      console.log('Main domain found:', mainDomain);
      return mainDomain;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting main domain:', error);
    return null;
  }
}

/**
 * Resolve a domain name to its owner's public key
 * This is the reverse of getting domains from a wallet
 * 
 * @param {string} domainName - Full domain name (e.g., 'myname.skr')
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<string|null>} - The owner's public key as a string, or null
 */
export async function resolveOwnerFromDomain(domainName, connection) {
  try {
    const parser = new TldParser(connection);
    const ownerPublicKey = await parser.getOwnerFromDomainTld(domainName);
    
    if (ownerPublicKey) {
      return ownerPublicKey.toString();
    }
    
    return null;
    
  } catch (error) {
    console.error('Error resolving owner from domain:', error);
    return null;
  }
}

/**
 * Get all domains owned by a wallet across all TLDs
 * This is more expensive as it checks all available TLDs
 * 
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<Object>} - Object with domains grouped by TLD
 */
export async function getAllDomains(walletAddress, connection) {
  try {
    const parser = new TldParser(connection);
    const ownerPublicKey = new PublicKey(walletAddress);
    
    // Common TLDs to check (you can expand this list)
    const tldsToCheck = ['skr', 'sol', 'bonk', 'poor', 'abc'];
    
    const allDomains = {};
    
    // Check each TLD
    for (const tld of tldsToCheck) {
      try {
        const domains = await parser.getParsedAllUserDomainsFromTld(
          ownerPublicKey,
          tld
        );
        
        if (domains && domains.length > 0) {
          allDomains[tld] = domains.map(domain => `${domain}.${tld}`);
        }
      } catch (error) {
        // Silently continue if a TLD fails
        console.log(`No domains found for .${tld}`);
      }
    }
    
    return allDomains;
    
  } catch (error) {
    console.error('Error getting all domains:', error);
    return {};
  }
}

/**
 * Check if a wallet has any .skr domain (faster than full resolution)
 * 
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<boolean>} - True if wallet has at least one .skr domain
 */
export async function hasSKRDomain(walletAddress, connection) {
  try {
    const parser = new TldParser(connection);
    const ownerPublicKey = new PublicKey(walletAddress);
    
    const skrDomains = await parser.getParsedAllUserDomainsFromTld(
      ownerPublicKey,
      'skr'
    );
    
    return skrDomains && skrDomains.length > 0;
    
  } catch (error) {
    console.error('Error checking for .skr domain:', error);
    return false;
  }
}

/**
 * Helper function to truncate wallet address for display
 * 
 * @param {string} address - Full wallet address
 * @param {number} startChars - Number of characters to show at start (default: 4)
 * @param {number} endChars - Number of characters to show at end (default: 4)
 * @returns {string} - Truncated address (e.g., "7Np8...Kq3m")
 */
export function truncateAddress(address, startChars = 4, endChars = 4) {
  if (!address || address.length < startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Get display name for a wallet - prefers .skr domain, falls back to truncated address
 * 
 * @param {string} walletAddress - The Solana wallet public key as a string
 * @param {Connection} connection - Solana RPC connection
 * @returns {Promise<Object>} - Object with displayName, hasDomain, and fullAddress
 */
export async function getDisplayName(walletAddress, connection) {
  try {
    // Try to get .skr domain first
    const skrDomain = await resolveSKRDomain(walletAddress, connection);
    
    if (skrDomain) {
      return {
        displayName: skrDomain,
        hasDomain: true,
        fullAddress: walletAddress
      };
    }
    
    // Fall back to truncated address
    return {
      displayName: truncateAddress(walletAddress),
      hasDomain: false,
      fullAddress: walletAddress
    };
    
  } catch (error) {
    console.error('Error getting display name:', error);
    return {
      displayName: truncateAddress(walletAddress),
      hasDomain: false,
      fullAddress: walletAddress
    };
  }
}

// Export all functions
export default {
  resolveSKRDomain,
  getDomainsFromTLD,
  getMainDomain,
  resolveOwnerFromDomain,
  getAllDomains,
  hasSKRDomain,
  truncateAddress,
  getDisplayName
};
