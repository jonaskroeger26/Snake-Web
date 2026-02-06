// fetch-all-skr-domains.js
// Fetches all .skr domains from Solana blockchain and creates a wallet → domain lookup file

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

// Get the .skr TLD parent account
const SKR_TLD_PARENT = '5bYhuNCUw5mFXJy5QGoTtkUnC9w5fSoRnMjuUA51YwJ3';

async function fetchAllSKRDomains() {
  console.log('🚀 Starting .skr domain fetch...');
  console.log(`📡 RPC: ${RPC_URL}`);
  
  const lookup = {};
  let totalFetched = 0;
  let errors = 0;
  
  try {
    // Get all domain accounts for .skr TLD
    // Note: This might require iterating through all accounts or using a different method
    // For now, we'll try to get domains by querying known patterns or using TldParser methods
    
    console.log('📋 Fetching all .skr domain accounts...');
    
    // Method 1: Try to get all domains from the TLD parent account
    // This might require querying all accounts owned by the TLD parent
    const parentAccount = new PublicKey(SKR_TLD_PARENT);
    
    // Get all accounts owned by the TLD parent (this might be slow/large)
    console.log('🔍 Querying accounts owned by .skr TLD parent...');
    
    // Note: getAllProgramAccounts might be too large, so we'll need a different approach
    // Let's try using a program-derived approach or batch queries
    
    // Alternative: Use getAllUserDomainsFromTld for known wallets
    // But we don't have a list of all wallets...
    
    // Better approach: Query the Name Service program directly
    // The Name Service program ID for AllDomains
    const NAME_SERVICE_PROGRAM_ID = new PublicKey('ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK');
    
    console.log('🔍 Querying Name Service program accounts...');
    
    // Get all accounts owned by the Name Service program
    // Filter for accounts where parent_name = SKR_TLD_PARENT
    const allAccounts = await connection.getProgramAccounts(NAME_SERVICE_PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0, // parent_name is at offset 0
            bytes: parentAccount.toBytes()
          }
        }
      ],
      dataSlice: {
        offset: 0,
        length: 200 // We need at least the header (96 bytes) + some data
      }
    });
    
    console.log(`✅ Found ${allAccounts.length} .skr domain accounts`);
    
    // Process accounts in batches to avoid overwhelming the RPC
    const BATCH_SIZE = 100;
    const batches = [];
    
    for (let i = 0; i < allAccounts.length; i += BATCH_SIZE) {
      batches.push(allAccounts.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} accounts...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} accounts)...`);
      
      for (const accountInfo of batch) {
        try {
          const accountPubkey = accountInfo.pubkey;
          const accountData = accountInfo.account.data;
          
          // Extract owner from account data (bytes 32-63)
          if (accountData.length >= 64) {
            const ownerBytes = accountData.slice(32, 64);
            const owner = new PublicKey(ownerBytes);
            const ownerString = owner.toString();
            
            // Try to reverse lookup the domain name
            try {
              const domainInfo = await parser.reverseLookupNameAccount(accountPubkey, parentAccount);
              
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
                  lookup[ownerString] = domainName;
                  totalFetched++;
                  
                  if (totalFetched % 100 === 0) {
                    console.log(`  ✅ Processed ${totalFetched} domains...`);
                  }
                }
              }
            } catch (reverseError) {
              // reverseLookupNameAccount failed, skip this account
              errors++;
              if (errors % 100 === 0) {
                console.log(`  ⚠️  ${errors} accounts failed reverse lookup...`);
              }
            }
          }
        } catch (accountError) {
          errors++;
          if (errors % 100 === 0) {
            console.log(`  ⚠️  ${errors} accounts had errors...`);
          }
        }
      }
      
      // Save progress after each batch
      const outputPath = path.join(process.cwd(), 'api', 'skr-lookup.json');
      fs.writeFileSync(outputPath, JSON.stringify(lookup, null, 2));
      console.log(`  💾 Saved progress: ${totalFetched} domains mapped`);
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`📊 Total domains fetched: ${totalFetched}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`📁 Output file: api/skr-lookup.json`);
    
  } catch (error) {
    console.error('❌ Error fetching domains:', error);
    throw error;
  }
}

// Run the fetch
fetchAllSKRDomains()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
