// api/get-skr-domain.js
// Based on official CryptoKix gist: https://gist.github.com/CryptoKix/8b8e6e574c92f6612bd447e3dae11fec

import { TldParser } from '@onsol/tldparser';
import { Connection, PublicKey } from '@solana/web3.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { wallet } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ 
      success: false,
      error: 'Wallet address required',
      wallet: null,
      domain: null,
      isSeeker: false
    });
  }
  
  try {
    // Validate and create PublicKey
    let owner;
    try {
      owner = new PublicKey(wallet);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        wallet: wallet,
        domain: null,
        isSeeker: false
      });
    }
    
    // Create Solana connection
    const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000
    });
    
    console.log('[API] Creating TldParser for wallet:', wallet);
    
    // Initialize TldParser
    const parser = new TldParser(connection);
    
    // Method 1: Try getMainDomain first (fastest - gets the user's primary domain)
    try {
      console.log('[API] Trying getMainDomain...');
      
      const mainDomainPromise = parser.getMainDomain(owner);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Main domain timeout')), 10000)
      );
      
      const mainDomain = await Promise.race([mainDomainPromise, timeoutPromise]);
      
      console.log('[API] Main domain result:', mainDomain);
      
      // Check if it's a .skr domain
      if (mainDomain && mainDomain.tld === 'skr' && mainDomain.domain) {
        const domainName = `${mainDomain.domain}.skr`;
        console.log('[API] ✅ Found main .skr domain:', domainName);
        
        return res.status(200).json({
          success: true,
          wallet: wallet,
          domain: domainName,
          isSeeker: true,
          method: 'getMainDomain'
        });
      }
      
      console.log('[API] Main domain is not .skr or not found');
      
    } catch (mainDomainError) {
      console.log('[API] getMainDomain failed:', mainDomainError.message);
    }
    
    // Method 2: Try getParsedAllUserDomainsFromTld (from CryptoKix gist)
    try {
      console.log('[API] Trying getParsedAllUserDomainsFromTld for .skr...');
      
      if (typeof parser.getParsedAllUserDomainsFromTld === 'function') {
        const parsedDomainsPromise = parser.getParsedAllUserDomainsFromTld(owner, 'skr');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Parsed domains timeout')), 10000)
        );
        
        const parsedDomains = await Promise.race([parsedDomainsPromise, timeoutPromise]);
        
        console.log('[API] Parsed .skr domains result:', parsedDomains);
        
        if (parsedDomains && Array.isArray(parsedDomains) && parsedDomains.length > 0) {
          // parsedDomains should be an array of domain name strings or objects with domain property
          const firstDomain = parsedDomains[0];
          const domainName = typeof firstDomain === 'string' 
            ? (firstDomain.endsWith('.skr') ? firstDomain : `${firstDomain}.skr`)
            : (firstDomain.domain ? `${firstDomain.domain}.skr` : null);
          
          if (domainName) {
            console.log('[API] ✅ Found .skr domain from parsed domains:', domainName);
            
            return res.status(200).json({
              success: true,
              wallet: wallet,
              domain: domainName,
              isSeeker: true,
              allDomains: parsedDomains.map(d => 
                typeof d === 'string' ? (d.endsWith('.skr') ? d : `${d}.skr`) : `${d.domain}.skr`
              ),
              method: 'getParsedAllUserDomainsFromTld'
            });
          }
        }
      } else {
        console.log('[API] getParsedAllUserDomainsFromTld method not available');
      }
    } catch (parsedError) {
      console.log('[API] getParsedAllUserDomainsFromTld failed:', parsedError.message);
    }
    
    // Method 3: Try getAllUserDomainsFromTld (returns PublicKey accounts, need to parse)
    try {
      console.log('[API] Trying getAllUserDomainsFromTld for .skr...');
      
      if (typeof parser.getAllUserDomainsFromTld === 'function') {
        const allDomainsPromise = parser.getAllUserDomainsFromTld(owner, 'skr');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('All domains timeout')), 10000)
        );
        
        const skrDomainKeys = await Promise.race([allDomainsPromise, timeoutPromise]);
        
        console.log('[API] All .skr domain accounts result:', skrDomainKeys);
        console.log('[API] Is array?', Array.isArray(skrDomainKeys));
        console.log('[API] Length?', skrDomainKeys?.length);
        
        // Properly check if the array has items
        if (skrDomainKeys && Array.isArray(skrDomainKeys) && skrDomainKeys.length > 0) {
          console.log('[API] ✅ Found', skrDomainKeys.length, 'domain account(s), resolving names...');
          
          // Try to resolve domain names from account PublicKeys
          const domainNames = [];
          
          for (const domainKey of skrDomainKeys.slice(0, 5)) { // Limit to first 5
            try {
              console.log('[API] Resolving domain name for account:', domainKey.toString());
              
              // Method 3a: Try reverseLookupNameAccount with owner as parent
              if (typeof parser.reverseLookupNameAccount === 'function') {
                try {
                  // reverseLookupNameAccount(nameAccount, parentOwner)
                  // Try with owner first
                  const domainInfo = await parser.reverseLookupNameAccount(domainKey, owner);
                  console.log('[API] reverseLookupNameAccount result:', domainInfo);
                  
                  if (domainInfo) {
                    // domainInfo might be a string or an object with domain property
                    let domainName = null;
                    
                    if (typeof domainInfo === 'string') {
                      domainName = domainInfo.endsWith('.skr') ? domainInfo : `${domainInfo}.skr`;
                    } else if (domainInfo.domain) {
                      domainName = `${domainInfo.domain}.${domainInfo.tld || 'skr'}`;
                    } else if (domainInfo.name) {
                      domainName = `${domainInfo.name}.skr`;
                    }
                    
                    if (domainName && domainName.endsWith('.skr')) {
                      console.log('[API] ✅ Successfully resolved domain name:', domainName);
                      domainNames.push(domainName);
                      continue; // Success, move to next
                    }
                  }
                } catch (reverseError) {
                  console.log('[API] reverseLookupNameAccount failed:', reverseError.message);
                  
                  // Try without parent owner (some versions might not need it)
                  try {
                    const domainInfo2 = await parser.reverseLookupNameAccount(domainKey);
                    console.log('[API] reverseLookupNameAccount (no parent) result:', domainInfo2);
                    
                    if (domainInfo2) {
                      const domainName = typeof domainInfo2 === 'string'
                        ? (domainInfo2.endsWith('.skr') ? domainInfo2 : `${domainInfo2}.skr`)
                        : (domainInfo2.domain ? `${domainInfo2.domain}.skr` : null);
                      
                      if (domainName && domainName.endsWith('.skr')) {
                        console.log('[API] ✅ Successfully resolved domain name (no parent):', domainName);
                        domainNames.push(domainName);
                        continue;
                      }
                    }
                  } catch (reverseError2) {
                    console.log('[API] reverseLookupNameAccount (no parent) also failed:', reverseError2.message);
                  }
                }
              }
              
              // Method 3b: Try to fetch account data and parse domain name
              try {
                const accountInfo = await connection.getAccountInfo(domainKey);
                if (accountInfo && accountInfo.data) {
                  // Try to parse domain name from account data
                  // This is a fallback - the account data structure might contain the domain name
                  console.log('[API] Account data length:', accountInfo.data.length);
                  // Note: Parsing account data directly is complex and TLD-specific
                  // We'll rely on reverseLookupNameAccount for now
                }
              } catch (accountError) {
                console.log('[API] Failed to fetch account info:', accountError.message);
              }
              
            } catch (e) {
              console.log('[API] Failed to resolve domain from account:', domainKey.toString(), e.message);
            }
          }
          
          if (domainNames.length > 0) {
            const domainName = domainNames[0];
            console.log('[API] ✅ Found .skr domain from account reverse lookup:', domainName);
            
            return res.status(200).json({
              success: true,
              wallet: wallet,
              domain: domainName,
              isSeeker: true,
              allDomains: domainNames,
              method: 'getAllUserDomainsFromTld + reverseLookup'
            });
          } else {
            console.log('[API] ⚠️ Found domain accounts but could not resolve domain names');
          }
        } else {
          console.log('[API] No .skr domain accounts found (array check failed)');
        }
      } else {
        console.log('[API] getAllUserDomainsFromTld method not available');
      }
      
    } catch (allDomainsError) {
      console.log('[API] getAllUserDomainsFromTld failed:', allDomainsError.message);
      console.log('[API] Error stack:', allDomainsError.stack);
    }
    
    // No .skr domain found
    console.log('[API] No .skr domain found for wallet:', wallet);
    return res.status(200).json({
      success: true,
      wallet: wallet,
      domain: null,
      isSeeker: false,
      message: 'No .skr domain found for this wallet'
    });
    
  } catch (error) {
    console.error('[API] Error resolving .skr domain:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve .skr domain',
      wallet: wallet,
      domain: null,
      isSeeker: false,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
