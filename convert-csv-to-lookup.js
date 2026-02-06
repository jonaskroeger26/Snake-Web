// convert-csv-to-lookup.js
// Converts the Seeker holders CSV to skr-lookup.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const csvPath = path.join(__dirname, 'seeker-holders.csv');
const outputPath = path.join(__dirname, 'api', 'skr-lookup.json');

console.log('🚀 Converting CSV to lookup file...');
console.log(`📂 Input: ${csvPath}`);
console.log(`📁 Output: ${outputPath}\n`);

// Check if CSV file exists
if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found at: ${csvPath}`);
  console.log('\n💡 Please ensure the CSV file is in your Downloads folder:');
  console.log('   seeker-holders-all-1770373711132.csv');
  process.exit(1);
}

// Read CSV file
console.log('📖 Reading CSV file...');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());

console.log(`📊 Found ${lines.length} lines (including header)\n`);

// Parse CSV and create lookup
const lookup = {};
let processed = 0;
let skipped = 0;

// Skip header line (line 0)
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  try {
    // Parse CSV line (handling quoted fields)
    // Format: activation_number,"domain","owner","activation_timestamp"
    const match = line.match(/^(\d+),"([^"]+)","([^"]+)","([^"]+)"$/);
    
    if (match) {
      const [, activationNumber, domain, owner, timestamp] = match;
      
      // Ensure domain ends with .skr
      const domainName = domain.endsWith('.skr') ? domain : `${domain}.skr`;
      
      // Add to lookup (owner -> domain)
      lookup[owner] = domainName;
      processed++;
      
      if (processed % 1000 === 0) {
        console.log(`  ✅ Processed ${processed} domains...`);
      }
    } else {
      skipped++;
      if (skipped <= 5) {
        console.log(`  ⚠️  Skipped malformed line ${i}: ${line.substring(0, 50)}...`);
      }
    }
  } catch (error) {
    skipped++;
    if (skipped <= 5) {
      console.log(`  ⚠️  Error parsing line ${i}: ${error.message}`);
    }
  }
}

console.log(`\n✅ Conversion complete!`);
console.log(`📊 Total domains: ${processed}`);
console.log(`⚠️  Skipped: ${skipped}`);

// Ensure api directory exists
const apiDir = path.dirname(outputPath);
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Write lookup file
console.log(`\n💾 Writing lookup file...`);
fs.writeFileSync(outputPath, JSON.stringify(lookup, null, 2));

console.log(`✅ Saved to: ${outputPath}`);
console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

// Show sample entries
console.log(`\n📋 Sample entries:`);
const sampleEntries = Object.entries(lookup).slice(0, 5);
sampleEntries.forEach(([owner, domain]) => {
  console.log(`   ${owner.slice(0, 8)}...${owner.slice(-8)} → ${domain}`);
});

console.log(`\n🎉 Done! The lookup file is ready to use.`);
