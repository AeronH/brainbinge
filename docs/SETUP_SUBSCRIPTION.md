# Subscription Setup Guide

## Quick Start - Run This Migration

To add subscription tracking to your database, you need to run the migration file.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `/supabase/migrations/add_subscription_fields.sql`
5. Click **Run** (bottom right)

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link your project (first time only)
supabase link --project-ref your-project-id

# Run the migration
supabase db push
```

### Verify Migration

After running the migration, verify it worked:

```sql
-- Run this in Supabase SQL Editor
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name LIKE 'subscription%';
```

You should see:
- `subscription_status` (text, default: 'free')
- `subscription_id` (text)
- `subscription_expires_at` (timestamptz)
- `whop_user_id` (text)

## Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Whop Integration
WHOP_WEBHOOK_SECRET=whop_xxx...your-webhook-secret
WHOP_API_KEY=your-whop-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Where to Find These Values

**Supabase Values:**
1. Go to Supabase Dashboard → Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

**Whop Values:**
1. Go to [Whop Dashboard](https://dash.whop.com) → Settings → Webhooks
2. Create a webhook (see WHOP_INTEGRATION.md)
3. Copy the webhook secret → `WHOP_WEBHOOK_SECRET`

## Test the Setup

### 1. Start Your Dev Server

```bash
npm run dev
```

### 2. Test Webhook Endpoint

```bash
curl http://localhost:3000/api/webhooks/whop
```

Should return:
```json
{
  "message": "Whop webhook endpoint is active",
  "timestamp": "2025-10-23T..."
}
```

### 3. Check Subscription Hook

Create a test component:

```typescript
import { useSubscription } from '@/lib/hooks/useSubscription';

export function TestSubscription() {
  const { isSubscribed, status, loading } = useSubscription();
  
  return (
    <div>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>
      <p>Status: {status}</p>
    </div>
  );
}
```

### 4. Manually Test a Subscription Update

In Supabase SQL Editor:

```sql
-- Give yourself a test subscription
UPDATE users 
SET 
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE email = 'your-email@example.com';

-- Check it worked
SELECT 
  email, 
  subscription_status, 
  subscription_expires_at 
FROM users 
WHERE email = 'your-email@example.com';
```

Then refresh your app - you should now have access to premium features!

## Troubleshooting

### Migration Fails

**Error: "column already exists"**
- The migration already ran successfully
- No action needed

**Error: "permission denied"**
- Make sure you're using the Supabase dashboard or have proper CLI permissions
- Try running in the SQL Editor instead

### Webhook Not Working

**404 on webhook endpoint**
```bash
# Make sure the route file exists:
ls src/app/api/webhooks/whop/route.ts

# Restart your dev server
npm run dev
```

**401 Unauthorized**
- Check that `WHOP_WEBHOOK_SECRET` is set correctly
- Verify the secret matches what's in Whop dashboard

**User not found in webhook**
- The email in Whop must match the email in Supabase
- Users must sign up in your app first before subscribing

### Subscription Status Not Updating

**Check database directly:**
```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

**Check webhook logs:**
1. Go to Whop Dashboard → Webhooks
2. Click on your webhook
3. View "Recent Deliveries"
4. Check for errors

**Hard refresh your browser:**
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

## Next Steps

Once everything is working:

1. ✅ Migration applied
2. ✅ Environment variables set
3. ✅ Webhook endpoint tested
4. 📖 Read [WHOP_INTEGRATION.md](/docs/WHOP_INTEGRATION.md) for Whop setup
5. 🚀 Deploy and configure production webhooks

## Production Deployment

Before deploying:

1. **Set environment variables in Vercel/hosting platform**
2. **Update Whop webhook URL** to production URL:
   ```
   https://yourdomain.com/api/webhooks/whop
   ```
3. **Test with Whop test mode** before going live
4. **Monitor webhook deliveries** in Whop dashboard

---

**Need help?** Check [WHOP_INTEGRATION.md](/docs/WHOP_INTEGRATION.md) for detailed setup.

