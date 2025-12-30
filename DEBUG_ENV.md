# Debug Environment Variables

## Quick Check

Run this to see what environment variables are actually set:

```bash
cd /Users/nolanterry/portal-brain

# Check .env.local file contents
echo "=== .env.local contents ==="
grep HUBSPOT .env.local

# Check if Next.js can see them (requires dotenv)
node -e "
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
console.log('HUBSPOT_CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID?.substring(0, 20) + '...');
console.log('OAUTH_REDIRECT_URI:', process.env.OAUTH_REDIRECT_URI);
"
```

## What You Should See

**If working correctly**:
```
HUBSPOT_CLIENT_ID: abc12345-def6-7890-gh...
OAUTH_REDIRECT_URI: http://localhost:3000/api/auth/hubspot/callback
```

**If still has placeholders**:
```
HUBSPOT_CLIENT_ID: your-hubspot-client...
OAUTH_REDIRECT_URI: http://localhost:3000/api/auth/hubspot/callback
```

## Fix Steps

1. **Edit `.env.local`**:
   ```bash
   # Open in your editor
   code /Users/nolanterry/portal-brain/.env.local
   # or
   nano /Users/nolanterry/portal-brain/.env.local
   ```

2. **Replace placeholders** with real values from HubSpot

3. **Restart dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Test again**
