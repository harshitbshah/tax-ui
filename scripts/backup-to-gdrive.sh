#!/usr/bin/env bash
# Backs up TaxLens data files (gitignored JSON) to Google Drive.
#
# These files contain your parsed tax return data, analysis cache, forecast profile,
# and retirement account data. They are not in git — this is the only backup.
#
# Run this once after updating TaxLens with a new year's data.
#
# Usage:
#   ./scripts/backup-to-gdrive.sh
#
# Destination: ~/gdrive/Important Documents/Documents/Tax Return/USA/taxlens/
# Google Drive must be mounted (check: ls ~/gdrive)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="/home/harshit-shah/gdrive/Important Documents/Documents/Tax Return/USA/taxlens"

# Verify Google Drive is mounted
if [ ! -d "/home/harshit-shah/gdrive/Important Documents" ]; then
  echo "ERROR: Google Drive not mounted or destination not found."
  echo "  Check: ls ~/gdrive"
  exit 1
fi

mkdir -p "$DEST"

echo "Backing up TaxLens data files to Google Drive..."
echo "  From: $PROJECT_DIR"
echo "  To:   $DEST"
echo ""

# All dot-prefixed JSON data files in the project root
DATA_FILES=(
  ".tax-returns.json"
  ".india-tax-returns.json"
  ".analysis-cache.json"
  ".insights-cache.json"
  ".retirement-accounts.json"
  ".forecast-profile.json"
)

for FILE in "${DATA_FILES[@]}"; do
  SRC="$PROJECT_DIR/$FILE"
  if [ -f "$SRC" ]; then
    cp -v "$SRC" "$DEST/$FILE"
  else
    echo "  (skipped — not found: $FILE)"
  fi
done

echo ""
echo "Done. Verify at:"
echo "  $DEST"
