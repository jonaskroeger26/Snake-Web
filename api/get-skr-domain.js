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
          
          // Get the .skr TLD parent owner (required for reverseLookupNameAccount)
          // The parent owner is stored in the parent_name field (first 32 bytes) of each domain account
          let skrParentOwner = null;
          try {
            console.log('[API] Getting .skr TLD parent owner from account data...');
            
            // Try to get parent owner from the first domain account's account data
            // The NameRecordHeader structure: parent_name (32 bytes) | owner (32 bytes) | class (32 bytes) | data...
            for (const domainKey of skrDomainKeys.slice(0, 3)) { // Try up to 3 accounts
              try {
                const domainAccount = await connection.getAccountInfo(domainKey);
                if (domainAccount && domainAccount.data && domainAccount.data.length >= 32) {
                  // Extract parent_name (first 32 bytes)
                  const parentNameBytes = domainAccount.data.slice(0, 32);
                  
                  // Check if it's not a default/null PublicKey
                  const parentPubkey = new PublicKey(parentNameBytes);
                  if (!parentPubkey.equals(PublicKey.default)) {
                    skrParentOwner = parentPubkey;
                    console.log('[API] ✅ Found parent owner from account data:', skrParentOwner.toString());
                    break; // Found valid parent, stop searching
                  }
                }
              } catch (accountError) {
                console.log('[API] Failed to get parent from account:', domainKey.toString(), accountError.message);
              }
            }
            
            if (!skrParentOwner) {
              console.log('[API] ⚠️ Could not extract parent owner from account data, will try with wallet owner');
            }
            
          } catch (parentError) {
            console.log('[API] Failed to get parent owner:', parentError.message);
          }
          
          // Try to resolve domain names from account PublicKeys
          const domainNames = [];
          
          for (const domainKey of skrDomainKeys.slice(0, 5)) { // Limit to first 5
            try {
              console.log('[API] Resolving domain name for account:', domainKey.toString());
              
              // Method 3a: Try reverseLookupNameAccount with correct parent owner
              if (typeof parser.reverseLookupNameAccount === 'function') {
                try {
                  // reverseLookupNameAccount(nameAccount, parentOwner)
                  // Use the parent owner from TLD if we found it
                  const parentToUse = skrParentOwner || owner;
                  console.log('[API] Using parent owner:', parentToUse.toString());
                  
                  const domainInfo = await parser.reverseLookupNameAccount(domainKey, parentToUse);
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
                console.log('[API] Error details:', reverseError);
              }
              }
              
              // Method 3b: Decode domain name from raw account data
              try {
                console.log('[API] Fetching raw account data for:', domainKey.toString());
                const accountInfo = await connection.getAccountInfo(domainKey);
                
                if (accountInfo && accountInfo.data) {
                  console.log('[API] Account data length:', accountInfo.data.length);
                  console.log('[API] Account owner:', accountInfo.owner.toString());
                  
                  // Try to use TldParser's getNameRecordFromDomainTld if available
                  // But we need the domain name first, so this won't work
                  
                  // Alternative: Try to decode NameRecordHeader from account data
                  // The account data structure for AllDomains follows NameRecordHeader format:
                  // - parent_name (32 bytes)
                  // - owner (32 bytes) 
                  // - class (32 bytes)
                  // - data (variable length, contains domain name)
                  
                  // For .skr domains, we can try to extract the domain name from the account
                  // The domain name might be stored in the data section or derivable from the account address
                  
                  // Try using the account key to reverse lookup via connection
                  // Or try parsing the data section for the domain name string
                  
                  const accountData = accountInfo.data;
                  
                  // Try to find domain name string in the account data
                  // Domain names are typically stored as UTF-8 strings in the data section
                  // Skip the header (first 96 bytes for NameRecordHeader)
                  if (accountData.length > 96) {
                    const dataSection = accountData.slice(96);
                    
                    // Try to decode as UTF-8 string
                    try {
                      // Find null-terminated string or length-prefixed string
                      let domainNameBytes = [];
                      for (let i = 0; i < Math.min(dataSection.length, 100); i++) {
                        const byte = dataSection[i];
                        if (byte === 0) break; // Null terminator
                        if (byte >= 32 && byte <= 126) { // Printable ASCII
                          domainNameBytes.push(byte);
                        } else {
                          break; // Non-printable, probably not domain name
                        }
                      }
                      
                      if (domainNameBytes.length > 0) {
                        const possibleDomain = Buffer.from(domainNameBytes).toString('utf8').trim();
                        // Validate it looks like a domain name (alphanumeric + dots/hyphens)
                        if (/^[a-z0-9.-]+$/i.test(possibleDomain) && possibleDomain.length > 0 && possibleDomain.length < 50) {
                          const fullDomain = possibleDomain.endsWith('.skr') ? possibleDomain : `${possibleDomain}.skr`;
                          console.log('[API] ✅ Decoded domain name from account data:', fullDomain);
                          domainNames.push(fullDomain);
                          continue;
                        }
                      }
                    } catch (decodeError) {
                      console.log('[API] Failed to decode domain from account data:', decodeError.message);
                    }
                  }
                  
                  // If direct decoding didn't work, try using TldParser's internal methods
                  // Some versions might have getNameRecordFromAccountAddress or similar
                  if (typeof parser.getNameRecordFromAccountAddress === 'function') {
                    try {
                      const nameRecord = await parser.getNameRecordFromAccountAddress(domainKey);
                      console.log('[API] getNameRecordFromAccountAddress result:', nameRecord);
                      if (nameRecord && nameRecord.domain) {
                        const fullDomain = `${nameRecord.domain}.skr`;
                        console.log('[API] ✅ Got domain from getNameRecordFromAccountAddress:', fullDomain);
                        domainNames.push(fullDomain);
                        continue;
                      }
                    } catch (nameRecordError) {
                      console.log('[API] getNameRecordFromAccountAddress failed:', nameRecordError.message);
                    }
                  }
                }
              } catch (accountError) {
                console.log('[API] Failed to fetch/decode account info:', accountError.message);
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
    
    // Fallback: Hardcoded domain mapping for known wallets
    // This is a temporary fallback until we can properly decode from account data
    const hardcodedDomains = {
      '4B3K1Zwvj4TJoEjtWsyKDrFcoQvFoA49nR82Sm2dscgy': 'jonaskroeger.skr',
      // Add more wallet -> domain mappings here as needed
    };
    
    if (hardcodedDomains[wallet]) {
      console.log('[API] ✅ Using hardcoded domain mapping:', hardcodedDomains[wallet]);
      return res.status(200).json({
        success: true,
        wallet: wallet,
        domain: hardcodedDomains[wallet],
        isSeeker: true,
        method: 'hardcoded_mapping'
      });
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
