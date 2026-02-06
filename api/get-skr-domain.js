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
            let domainFound = false; // Flag to track if we found a domain for this account
            
            try {
              console.log('[API] Resolving domain name for account:', domainKey.toString());
              
              // Method 3a: Try reverseLookupNameAccount with correct parent owner
              if (typeof parser.reverseLookupNameAccount === 'function' && !domainFound) {
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
                      domainFound = true;
                      continue; // Success, move to next domain key
                    }
                  }
                } catch (reverseError) {
                  console.log('[API] reverseLookupNameAccount failed:', reverseError.message);
                  console.log('[API] Error details:', reverseError);
                }
              }
              
              // Method 3b: Decode domain name directly from raw account data
              if (!domainFound) {
              try {
                console.log('[API] Fetching raw account data for:', domainKey.toString());
                const accountInfo = await connection.getAccountInfo(domainKey);
                
                if (accountInfo && accountInfo.data) {
                  console.log('[API] Account data length:', accountInfo.data.length);
                  console.log('[API] Account owner:', accountInfo.owner.toString());
                  
                  const accountData = accountInfo.data;
                  
                  // AllDomains account structure:
                  // Bytes 0-95: Header (parent_name 32b, owner 32b, class 32b)
                  // Bytes 96+: Domain data (usually starts with a length prefix)
                  
                  // Hex dump of entire account data to find where domain name is stored
                  console.log(`[API] Full account data hex dump (${accountData.length} bytes):`);
                  
                  // Show hex dump in chunks of 32 bytes for readability
                  for (let i = 0; i < accountData.length; i += 32) {
                    const chunk = accountData.slice(i, Math.min(i + 32, accountData.length));
                    const hexString = Array.from(chunk)
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join(' ');
                    const asciiString = Array.from(chunk)
                      .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
                      .join('');
                    console.log(`[API] Bytes ${i}-${i + chunk.length - 1}: ${hexString.padEnd(96)} | ${asciiString}`);
                  }
                  
                  // Search for "jonaskroeger" in the raw bytes
                  const domainNameBytes = Buffer.from('jonaskroeger', 'utf8');
                  let foundOffset = -1;
                  for (let i = 0; i <= accountData.length - domainNameBytes.length; i++) {
                    let match = true;
                    for (let j = 0; j < domainNameBytes.length; j++) {
                      if (accountData[i + j] !== domainNameBytes[j]) {
                        match = false;
                        break;
                      }
                    }
                    if (match) {
                      foundOffset = i;
                      console.log(`[API] ✅ Found "jonaskroeger" at byte offset: ${foundOffset}`);
                      break;
                    }
                  }
                  
                  if (foundOffset === -1) {
                    console.log(`[API] ⚠️ Could not find "jonaskroeger" string in account data`);
                  }
                  
                  if (accountData.length > 96) {
                    // Helper function to read length-prefixed string
                    const readLengthPrefixedString = (offset) => {
                      try {
                        if (offset + 4 > accountData.length) return null;
                        
                        // Read length (4 bytes, little-endian)
                        const length = accountData.readUInt32LE(offset);
                        
                        if (length === 0 || length > 100 || offset + 4 + length > accountData.length) {
                          return null;
                        }
                        
                        // Read string data
                        const stringBytes = accountData.slice(offset + 4, offset + 4 + length);
                        const domainName = Buffer.from(stringBytes).toString('utf8').trim();
                        
                        // Validate domain name format (a-z, 0-9, hyphen, no dots in name part)
                        if (/^[a-z0-9-]+$/i.test(domainName) && domainName.length > 0 && domainName.length < 50) {
                          return domainName;
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    };
                    
                    // Helper function to scan for valid domain name strings
                    const scanForDomainName = (startOffset, maxLength = 100) => {
                      let domainNameBytes = [];
                      let foundStart = false;
                      
                      for (let i = startOffset; i < Math.min(accountData.length, startOffset + maxLength); i++) {
                        const byte = accountData[i];
                        
                        // Skip null bytes at start
                        if (!foundStart && byte === 0) continue;
                        foundStart = true;
                        
                        // Check for valid domain name characters: a-z, 0-9, hyphen
                        if ((byte >= 48 && byte <= 57) || // 0-9
                            (byte >= 65 && byte <= 90) || // A-Z
                            (byte >= 97 && byte <= 122) || // a-z
                            byte === 45) { // hyphen
                          domainNameBytes.push(byte);
                        } else if (byte === 0) {
                          // Null terminator - end of string
                          break;
                        } else {
                          // Invalid character - reset if we haven't found a valid name yet
                          if (domainNameBytes.length < 3) {
                            domainNameBytes = [];
                            foundStart = false;
                          } else {
                            break; // We have a valid name, stop here
                          }
                        }
                      }
                      
                      if (domainNameBytes.length >= 3) {
                        const domainName = Buffer.from(domainNameBytes).toString('utf8').trim();
                        // Validate format
                        if (/^[a-z0-9-]+$/i.test(domainName) && domainName.length >= 3 && domainName.length < 50) {
                          return domainName;
                        }
                      }
                      
                      return null;
                    };
                    
                    // Method 1: Try length-prefixed string at byte 96
                    console.log('[API] Trying length-prefixed string at offset 96...');
                    let decodedDomain = readLengthPrefixedString(96);
                    if (decodedDomain) {
                      console.log('[API] ✅ Decoded domain name (offset 96):', decodedDomain);
                      domainNames.push(`${decodedDomain}.skr`);
                      domainFound = true;
                    }
                    
                    // Method 2: Try alternative offsets (100, 104, 108) if Method 1 didn't work
                    if (!domainFound) {
                      const offsets = [100, 104, 108];
                      for (const offset of offsets) {
                        console.log(`[API] Trying length-prefixed string at offset ${offset}...`);
                        decodedDomain = readLengthPrefixedString(offset);
                        if (decodedDomain) {
                          console.log(`[API] ✅ Decoded domain name (offset ${offset}):`, decodedDomain);
                          domainNames.push(`${decodedDomain}.skr`);
                          domainFound = true;
                          break; // Found domain, exit offset loop
                        }
                      }
                    }
                    
                    // Method 3: Scan the entire account for valid domain name strings
                    if (!domainFound) {
                      console.log('[API] Scanning account data for domain name strings...');
                      const scanStartOffsets = [96, 100, 104, 108, 112];
                      for (const startOffset of scanStartOffsets) {
                        decodedDomain = scanForDomainName(startOffset);
                        if (decodedDomain) {
                          console.log(`[API] ✅ Found domain name via scan (offset ${startOffset}):`, decodedDomain);
                          domainNames.push(`${decodedDomain}.skr`);
                          domainFound = true;
                          break; // Found domain, exit scan loop
                        }
                      }
                    }
                    
                    // Method 4: Full account scan (more thorough but slower)
                    if (!domainFound) {
                      console.log('[API] Performing full account scan...');
                      decodedDomain = scanForDomainName(96, accountData.length - 96);
                      if (decodedDomain) {
                        console.log('[API] ✅ Found domain name via full scan:', decodedDomain);
                        domainNames.push(`${decodedDomain}.skr`);
                        domainFound = true;
                      }
                    }
                    
                    // If we found a domain, continue to next domain key
                    if (domainFound) {
                      continue;
                    }
                    
                    console.log('[API] Could not decode domain name from account data');
                  } else {
                    console.log('[API] Account data too short (< 96 bytes)');
                  }
                }
              } catch (accountError) {
                console.log('[API] Failed to fetch/decode account info:', accountError.message);
                console.log('[API] Error stack:', accountError.stack);
              }
              } // End of if (!domainFound) for account decoding
              
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
    
    // TEMPORARILY DISABLED: Hardcoded domain mapping for known wallets
    // Commented out to force account data decoding and see hex dump
    // const hardcodedDomains = {
    //   '4B3K1Zwvj4TJoEjtWsyKDrFcoQvFoA49nR82Sm2dscgy': 'jonaskroeger.skr',
    //   // Add more wallet -> domain mappings here as needed
    // };
    
    // if (hardcodedDomains[wallet]) {
    //   console.log('[API] ✅ Using hardcoded domain mapping:', hardcodedDomains[wallet]);
    //   return res.status(200).json({
    //     success: true,
    //     wallet: wallet,
    //     domain: hardcodedDomains[wallet],
    //     isSeeker: true,
    //     method: 'hardcoded_mapping'
    //   });
    // }
    
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
