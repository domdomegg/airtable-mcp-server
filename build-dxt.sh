#!/usr/bin/env bash

set -euo pipefail

# Build the project first
echo "Building project..."

# Remove devDependencies
rm -rf node_modules
npm ci --production
npm run build

# Update manifest.json with version from package.json
echo "Updating manifest version..."
VERSION=$(node -p "require('./package.json').version")
sed "s/{{VERSION}}/$VERSION/g" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

# Create the DXT package
echo "Creating DXT package..."
rm -f airtable-mcp-server.dxt
# --no-dir-entries: https://github.com/anthropics/dxt/issues/18#issuecomment-3021467806
zip --recurse-paths --no-dir-entries \
  airtable-mcp-server.dxt \
  manifest.json \
  icon.png \
  dist/ \
  node_modules/ \
  package.json \
  README.md \
  LICENSE

# Restore the template version
echo "Restoring manifest template..."
sed "s/$VERSION/{{VERSION}}/g" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

# Restore full node_modules
npm ci

echo
echo "DXT package created: airtable-mcp-server.dxt"
