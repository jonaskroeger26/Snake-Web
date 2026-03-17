#!/usr/bin/env bash
# Search for a keypair file whose public key is the buffer authority (1MZe4...).
# Run from repo root. Usage: ./scripts/find-buffer-authority-keypair.sh [dir]
# If no dir given, searches: ~/.config/solana, this repo, ~/Downloads, ~/Desktop.

TARGET="1MZe4ffvkWk9Q4YcN2AVgqEBtBijk8Ru6WPKSxsZeYS"
Searched=0
Checked=0

check_file() {
  local f="$1"
  [[ ! -f "$f" ]] && return
  ((Searched++))
  # Only consider .json files that look like keypairs (array of numbers)
  if [[ "$f" == *.json ]] && grep -q '^\s*\[.*[0-9].*\]' "$f" 2>/dev/null; then
    addr=$(solana address -k "$f" 2>/dev/null)
    ((Checked++))
    if [[ "$addr" == "$TARGET" ]]; then
      echo "FOUND: $f"
      echo "  -> Public key: $addr"
      return 0
    fi
  fi
  return 1
}

export TARGET Searched Checked
export -f check_file

dirs=("${1:-}")
if [[ -z "${1:-}" ]]; then
  dirs=(
    "$HOME/.config/solana"
    "$(dirname "$(dirname "$(realpath "$0" 2>/dev/null || echo .)")")"
    "$HOME/Downloads"
    "$HOME/Desktop"
  )
fi

found=0
for d in "${dirs[@]}"; do
  [[ ! -d "$d" ]] && continue
  echo "Searching in $d ..." >&2
  while IFS= read -r -d '' f; do
    if check_file "$f"; then
      found=1
    fi
  done < <(find "$d" -type f -name "*.json" 2>/dev/null -print0)
done

if [[ $found -eq 0 ]]; then
  echo "No keypair with public key $TARGET found in searched dirs."
  echo "Searched $Searched .json files, checked $Checked as keypairs."
  echo ""
  echo "Next steps:"
  echo "  1. Check other machines or backups you used for Solana deploys."
  echo "  2. Search other folders: run this script with a path, e.g.:"
  echo "     ./scripts/find-buffer-authority-keypair.sh /path/to/backup"
  echo "  3. If you find the keypair, run:"
  echo "     KEYPAIR_PATH=/path/to/keypair.json node scripts/send-close-buffer.js"
fi
