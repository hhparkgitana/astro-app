#!/bin/bash

# Download Swiss Ephemeris files for extended date range
# Covers 1200-2200 CE

cd "$(dirname "$0")/../src/shared/ephe"

for century in 12 13 14 15 16 17 19 20 21; do
  echo "Downloading century ${century}00..."
  curl -f -L -O "https://www.astro.com/ftp/swisseph/ephe/sepl_${century}.se1"
  curl -f -L -O "https://www.astro.com/ftp/swisseph/ephe/semo_${century}.se1"
  curl -f -L -O "https://www.astro.com/ftp/swisseph/ephe/seas_${century}.se1"
done

echo "Download complete!"
ls -lh *.se1
