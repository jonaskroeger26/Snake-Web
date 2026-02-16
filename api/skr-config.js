// Returns SKR RPC URL from env so you can set SKR_RPC in Vercel (e.g. Helius) without committing keys.
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');
  const url = process.env.SKR_RPC || 'https://rpc.ankr.com/solana';
  return res.status(200).json({ SKR_RPC: url });
}
