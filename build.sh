#!/bin/bash
# For Cloudflare Pages deployment
# This script generates the app-config.js from Cloudflare Environment Variables

# Clean up whitespaces/quotes/newlines from environment variables
CLEAN_URL=$(echo "$SUPABASE_URL" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')
CLEAN_KEY=$(echo "$SUPABASE_ANON_KEY" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')

printf 'window.APP_CONFIG = {\n  SUPABASE_URL: "%s",\n  SUPABASE_ANON_KEY: "%s",\n  REFRESH_INTERVAL: 0\n};\n' "$CLEAN_URL" "$CLEAN_KEY" > app-config.js
echo "✅ app-config.js created successfully for Cloudflare Pages."
