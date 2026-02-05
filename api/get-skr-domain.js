// api/get-skr-domain.js
// SIMPLE VERSION - Better error handling for FUNCTION_INVOCATION_FAILED

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
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
    // Try to import dependencies - this will fail if they're missing
    let TldParser, Connection, PublicKey;
    
    try {
      const tldParserModule = await import('@onsol/tldparser');
      TldParser = tldParserModule.TldParser;
      
      const web3Module = await import('@solana/web3.js');
      Connection = web3Module.Connection;
      PublicKey = web3Module.PublicKey;
    } catch (importError) {
      console.error('Import error:', importError);
      return res.status(500).json({
        success: false,
        error: 'Failed to load dependencies',
        details: importError.message,
        wallet: wallet,
        domain: null,
        isSeeker: false,
        debug: {
          message: 'Check if @onsol/tldparser and @solana/web3.js are in package.json dependencies'
        }
      });
    }
    
    // Validate wallet address format
    let ownerPublicKey;
    try {
      ownerPublicKey = new PublicKey(wallet);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        wallet: wallet,
        domain: null,
        isSeeker: false
      });
    }
    
    // Use a reliable RPC endpoint
    const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    const connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });
    
    // Initialize TldParser
    const parser = new TldParser(connection);
    
    // Fetch .skr domains for this wallet
    const skrDomains = await parser.getParsedAllUserDomainsFromTld(
      ownerPublicKey,
      'skr'
    );
    
    // Check if any domains were found
    if (skrDomains && skrDomains.length > 0) {
      const domainName = `${skrDomains[0]}.skr`;
      
      return res.status(200).json({
        success: true,
        wallet: wallet,
        domain: domainName,
        isSeeker: true,
        allDomains: skrDomains.map(d => `${d}.skr`)
      });
    }
    
    // No .skr domain found
    return res.status(200).json({
      success: true,
      wallet: wallet,
      domain: null,
      isSeeker: false,
      message: 'No .skr domain found for this wallet'
    });
    
  } catch (error) {
    console.error('Error resolving .skr domain:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve .skr domain',
      wallet: wallet,
      domain: null,
      isSeeker: false,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorType: error.constructor.name
    });
  }
}
