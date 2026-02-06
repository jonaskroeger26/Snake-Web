-- Run this in Supabase SQL Editor after the table exists.
-- Returns the best score per wallet for a given game_mode and difficulty.

CREATE OR REPLACE FUNCTION get_best_scores(
  p_game_mode TEXT,
  p_difficulty TEXT
)
RETURNS TABLE (
  wallet_address TEXT,
  skr_name TEXT,
  best_score INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  -- Get best score per wallet (case-insensitive), ensuring only one entry per wallet
  WITH wallet_scores AS (
    SELECT 
      LOWER(wallet_address) AS wallet_lower,
      MAX(score) AS max_score
    FROM leaderboards
    WHERE game_mode = p_game_mode
      AND difficulty = p_difficulty
    GROUP BY LOWER(wallet_address)
  )
  SELECT DISTINCT ON (LOWER(l.wallet_address))
    l.wallet_address,
    l.skr_name,
    ws.max_score::INTEGER AS best_score
  FROM leaderboards l
  INNER JOIN wallet_scores ws 
    ON LOWER(l.wallet_address) = ws.wallet_lower 
    AND l.score = ws.max_score
  WHERE l.game_mode = p_game_mode
    AND l.difficulty = p_difficulty
  ORDER BY LOWER(l.wallet_address), l.score DESC
  LIMIT 100;
$$;

-- Let anon (public) call the function
GRANT EXECUTE ON FUNCTION get_best_scores(TEXT, TEXT) TO anon;
