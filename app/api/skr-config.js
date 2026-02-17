// Returns SKR RPC URL from env (set SKR_RPC in Vercel; same API key as main site).
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');
  const url = process.env.SKR_RPC || 'https://rpc.ankr.com/solana';
  return res.status(200).json({ SKR_RPC: url });
}
