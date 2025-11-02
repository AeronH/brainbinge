# Payment Tracking Summary - How It All Works

## 🎯 The Big Picture

When a user subscribes through Whop, here's the complete flow:

```
1. User clicks "Subscribe Now" in your app
       ↓
2. Browser navigates to Whop checkout (same tab)
       ↓
3. User completes payment on Whop
       ↓ (Webhook fires)
4. Whop sends webhook to: /api/webhooks/whop
       ↓
5. Webhook updates database (subscription_status = 'active')
       ↓
6. Whop redirects user back to /dashboard
       ↓
7. User now has access to premium features!
```

## 📁 Files You Need to Know About

### 1. **Subscription Modal** (`/src/components/modals/SubscriptionModal.tsx`)
- Shows pricing plans
- **Changed**: Opens Whop checkout in same tab (not new tab)
- User clicks "Subscribe Now" → navigates to Whop

### 2. **Webhook Endpoint** (`/src/app/api/webhooks/whop/route.ts`)
- Receives events from Whop when payment succeeds
- Verifies webhook signature for security
- Finds user by email
- Updates subscription status in database

### 3. **Database Migration** (`/supabase/migrations/add_subscription_fields.sql`)
- Adds subscription tracking fields to users table:
  - `subscription_status` - 'free', 'active', 'cancelled', or 'past_due'
  - `subscription_id` - Whop membership ID
  - `subscription_expires_at` - When subscription ends
  - `whop_user_id` - Whop's user ID

### 4. **Subscription Hook** (`/src/lib/hooks/useSubscription.ts`)
- React hook to check if user is subscribed
- Used throughout the app to gate premium features
- Returns: `{ isSubscribed, status, loading }`

### 5. **Subscription Utilities** (`/src/lib/subscription.ts`)
- Server-side functions for checking subscription
- Used in API routes that need subscription validation

## 🔧 Setup Checklist

### ✅ Database Setup
1. Run the migration in Supabase SQL Editor
2. Copy contents of `/supabase/migrations/add_subscription_fields.sql`
3. Execute in your Supabase project

### ✅ Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

WHOP_WEBHOOK_SECRET=whop_xxx...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ✅ Whop Dashboard Setup
1. **Create Products**:
   - Monthly: $19/month
   - Yearly: $190/year

2. **Get Checkout Links**:
   - Copy each product's checkout URL
   - Already added to `SubscriptionModal.tsx`

3. **Configure Webhook**:
   - URL: `https://yourdomain.com/api/webhooks/whop`
   - Events: payment.succeeded, membership.went_valid, membership.went_invalid
   - Copy webhook secret → add to `.env.local`

4. **Set Redirects**:
   - Success URL: `https://yourdomain.com/dashboard?payment=success`
   - Cancel URL: `https://yourdomain.com/dashboard?payment=cancelled`

## 🧪 Testing

### Test Webhook Locally

```bash
# 1. Install ngrok (for local testing)
npm install -g ngrok

# 2. Start your dev server
npm run dev

# 3. Start ngrok
ngrok http 3000

# 4. Update Whop webhook URL to:
https://your-ngrok-url.ngrok.io/api/webhooks/whop
```

### Test Payment Flow

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/dashboard`
3. Click "Start Learning" or try to create a lesson
4. Subscription modal appears
5. Click "Subscribe Now"
6. Use Whop test card: `4242 4242 4242 4242`
7. Complete checkout
8. Check database - your subscription_status should be 'active'

### Manual Database Test

Grant yourself a subscription manually:

```sql
UPDATE users 
SET 
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE email = 'your-email@example.com';
```

Refresh your app → you should have premium access!

## 🔍 How to Check Subscription Status

### In React Components

```typescript
import { useSubscription } from '@/lib/hooks/useSubscription';

function MyComponent() {
  const { isSubscribed, status, loading } = useSubscription();
  
  if (loading) return <LoadingSpinner />;
  
  if (!isSubscribed) {
    return <SubscriptionModal open onOpenChange={() => {}} />;
  }
  
  return <PremiumFeature />;
}
```

### In API Routes

```typescript
import { requireSubscription } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { isSubscribed } = await requireSubscription(user.id);
  if (!isSubscribed) {
    return Response.json({ error: 'Subscription required' }, { status: 403 });
  }
  
  // Proceed with premium feature
}
```

### In Database Queries

```sql
-- Find all active subscriptions
SELECT email, subscription_status, subscription_expires_at
FROM users
WHERE subscription_status = 'active'
  AND subscription_expires_at > NOW();

-- Find expired subscriptions
SELECT email, subscription_expires_at
FROM users
WHERE subscription_status = 'active'
  AND subscription_expires_at < NOW();
```

## 🔐 Security Notes

### Webhook Signature Verification
The webhook endpoint verifies every request is from Whop:

```typescript
// In /api/webhooks/whop/route.ts
const signature = request.headers.get('x-whop-signature');
const isValid = verifyWhopSignature(body, signature, WHOP_WEBHOOK_SECRET);
```

**⚠️ Never disable this in production!**

### Service Role Key
The webhook uses `SUPABASE_SERVICE_ROLE_KEY` to bypass Row Level Security:

- **Why?** Webhooks don't have user authentication
- **Security**: Store service role key in environment variables only
- **Never** commit it to git or expose it client-side

## 🐛 Troubleshooting

### "Webhook not firing"
✅ Check Whop Dashboard → Webhooks → Recent Deliveries  
✅ Verify webhook URL is correct (https in production)  
✅ Check webhook secret matches `.env.local`

### "Subscription status not updating"
✅ Check webhook logs in Whop Dashboard  
✅ Verify email in Whop matches email in Supabase  
✅ Check server logs for errors  
✅ Query database: `SELECT * FROM users WHERE email = 'xxx'`

### "User can't access premium features"
✅ Hard refresh browser (Ctrl+Shift+R)  
✅ Check database: subscription_status should be 'active'  
✅ Check subscription_expires_at is in the future  
✅ Check browser console for errors

### "401 Unauthorized on webhook"
✅ Verify WHOP_WEBHOOK_SECRET is set  
✅ Check secret matches Whop Dashboard  
✅ Restart dev server after adding env variables

## 📊 Monitoring in Production

### Important Queries

```sql
-- Total active subscribers
SELECT COUNT(*) as active_subscribers
FROM users 
WHERE subscription_status = 'active' 
  AND subscription_expires_at > NOW();

-- New subscriptions this month
SELECT COUNT(*) as new_this_month
FROM users 
WHERE subscription_status = 'active' 
  AND created_at >= DATE_TRUNC('month', NOW());

-- Churned users
SELECT email, subscription_expires_at
FROM users 
WHERE subscription_status = 'cancelled';

-- Revenue estimate (monthly subscribers)
SELECT COUNT(*) * 19 as estimated_monthly_revenue
FROM users 
WHERE subscription_status = 'active';
```

### Webhook Monitoring

Check Whop Dashboard regularly:
- Webhooks → Recent Deliveries
- Look for failed deliveries (red indicators)
- Click to see error details
- Retry failed webhooks if needed

## 🚀 Production Deployment

### Pre-Launch Checklist

- [ ] Database migration applied
- [ ] Environment variables set in hosting platform (Vercel/etc)
- [ ] Whop webhook URL updated to production domain
- [ ] Redirect URLs updated in Whop
- [ ] Test payment flow end-to-end in production
- [ ] Webhook signature verification enabled
- [ ] Monitor first few payments closely

### Deployment Steps

1. **Deploy to Vercel/hosting platform**
2. **Set environment variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=xxx
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   WHOP_WEBHOOK_SECRET=xxx
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **Update Whop webhook URL**:
   ```
   https://yourdomain.com/api/webhooks/whop
   ```

4. **Test with Whop test mode** first
5. **Enable live mode** when ready
6. **Monitor webhook deliveries** for first 24 hours

## 📖 Additional Resources

- [SETUP_SUBSCRIPTION.md](/docs/SETUP_SUBSCRIPTION.md) - Step-by-step setup
- [WHOP_INTEGRATION.md](/docs/WHOP_INTEGRATION.md) - Detailed Whop guide
- [SUBSCRIPTION_FLOW.md](/SUBSCRIPTION_FLOW.md) - User flow & UX
- [Whop Documentation](https://docs.whop.com)

## 💡 Key Takeaways

1. **Same Tab Navigation**: Users stay in your app flow (more conversions)
2. **Webhook-Based**: Automatic subscription tracking via webhooks
3. **Secure**: Signature verification ensures only Whop can update subscriptions
4. **Simple Flow**: User subscribes → webhook fires → database updates → access granted
5. **Easy Testing**: Manual database updates for development/testing

---

**You're all set!** Follow the setup guides and you'll have payment tracking working in no time. 🚀

