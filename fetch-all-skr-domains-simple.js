// fetch-all-skr-domains-simple.js
// Simplified version - fetches .skr domains incrementally
// Run this script periodically to build/update the lookup file

import { TldParser } from '@onsol/tldparser';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

const parser = new TldParser(connection);
const SKR_TLD_PARENT = new PublicKey('5bYhuNCUw5mFXJy5QGoTtkUnC9w5fSoRnMjuUA51YwJ3');
const NAME_SERVICE_PROGRAM_ID = new PublicKey('ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK');

// Load existing lookup to continue from where we left off
const lookupPath = path.join(process.cwd(), 'api', 'skr-lookup.json');
let lookup = {};
if (fs.existsSync(lookupPath)) {
  try {
    lookup = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));
    console.log(`📂 Loaded existing lookup: ${Object.keys(lookup).length} domains`);
  } catch (e) {
    console.log('⚠️  Could not load existing lookup, starting fresh');
  }
}

async function fetchSKRDomains() {
  console.log('🚀 Fetching .skr domains...');
  console.log(`📡 RPC: ${RPC_URL}`);
  
  let totalFetched = Object.keys(lookup).length;
  let newDomains = 0;
  let errors = 0;
  
  try {
    // Get all accounts owned by Name Service program with .skr parent
    console.log('🔍 Querying Name Service program accounts...');
    
    const allAccounts = await connection.getProgramAccounts(NAME_SERVICE_PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: SKR_TLD_PARENT.toBytes()
          }
        }
      ],
      dataSlice: {
        offset: 0,
        length: 64 // Just need parent (32) + owner (32)
      }
    });
    
    console.log(`✅ Found ${allAccounts.length} .skr domain accounts`);
    console.log(`📊 Already have ${totalFetched} domains in lookup`);
    console.log(`🆕 Need to process ${allAccounts.length - totalFetched} new accounts\n`);
    
    // Process in smaller batches to avoid RPC rate limits
    const BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < allAccounts.length; i += BATCH_SIZE) {
      batches.push(allAccounts.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Processing ${batches.length} batches...\n`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Process batch with Promise.all for parallel processing (but limited)
      const batchPromises = batch.map(async (accountInfo) => {
        try {
          const accountPubkey = accountInfo.pubkey;
          const accountData = accountInfo.account.data;
          
          if (accountData.length >= 64) {
            const ownerBytes = accountData.slice(32, 64);
            const owner = new PublicKey(ownerBytes);
            const ownerString = owner.toString();
            
            // Skip if we already have this wallet
            if (lookup[ownerString]) {
              return null;
            }
            
            // Try reverse lookup
            try {
              const domainInfo = await parser.reverseLookupNameAccount(accountPubkey, SKR_TLD_PARENT);
              
              if (domainInfo) {
                let domainName = null;
                
                if (typeof domainInfo === 'string') {
                  domainName = domainInfo.endsWith('.skr') ? domainInfo : `${domainInfo}.skr`;
                } else if (domainInfo.domain) {
                  domainName = `${domainInfo.domain}.skr`;
                } else if (domainInfo.name) {
                  domainName = `${domainInfo.name}.skr`;
                }
                
                if (domainName && domainName.endsWith('.skr')) {
                  return { owner: ownerString, domain: domainName };
                }
              }
            } catch (reverseError) {
              // Skip accounts where reverse lookup fails
              return null;
            }
          }
        } catch (error) {
          return null;
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful lookups
      for (const result of batchResults) {
        if (result) {
          lookup[result.owner] = result.domain;
          newDomains++;
          totalFetched++;
        }
      }
      
      errors += batchResults.filter(r => r === null).length;
      
      // Save progress after each batch
      fs.writeFileSync(lookupPath, JSON.stringify(lookup, null, 2));
      
      console.log(`✅ Batch ${batchIndex + 1}/${batches.length}: +${newDomains} new domains (Total: ${totalFetched})`);
      
      // Small delay to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`📊 Total domains: ${totalFetched}`);
    console.log(`🆕 New domains: ${newDomains}`);
    console.log(`⚠️  Skipped: ${errors}`);
    console.log(`📁 Saved to: ${lookupPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    // Save what we have so far
    fs.writeFileSync(lookupPath, JSON.stringify(lookup, null, 2));
    throw error;
  }
}

fetchSKRDomains()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
