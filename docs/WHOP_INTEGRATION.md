# Whop Integration Guide

## 🎯 Overview

This guide explains how to integrate Whop payments with BrainBinge to track subscription status automatically.

## 📊 Database Schema

The users table needs these additional columns to track subscriptions:

```sql
ALTER TABLE users 
ADD COLUMN subscription_status text DEFAULT 'free',
ADD COLUMN subscription_id text,
ADD COLUMN subscription_expires_at timestamptz,
ADD COLUMN whop_user_id text;
```

**Subscription Statuses:**
- `free` - Default, no active subscription
- `active` - Currently subscribed and paid
- `cancelled` - Was subscribed but cancelled (may still have access until expiry)
- `past_due` - Payment failed, in grace period

## 🔗 Whop Setup Steps

### 1. Create Your Products on Whop

1. Go to [Whop Dashboard](https://dash.whop.com)
2. Create two products:
   - **Monthly Plan**: $19/month
   - **Yearly Plan**: $190/year

3. For each product, get the checkout link:
   - Go to Product → Checkout Links
   - Copy the direct checkout URL
   - Update in `/src/components/modals/SubscriptionModal.tsx`

### 2. Configure Webhooks

1. In Whop Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/whop`
3. Select events to listen for:
   - ✅ `payment.succeeded`
   - ✅ `payment.failed`
   - ✅ `membership.went_valid`
   - ✅ `membership.went_invalid`
   - ✅ `membership.cancelled`

4. Copy the **Webhook Secret** (you'll need this)

### 3. Set Environment Variables

Add to your `.env.local`:

```bash
# Whop Integration
WHOP_WEBHOOK_SECRET=whop_xxx...your-webhook-secret
WHOP_API_KEY=your-api-key (optional, for API calls)

# Your app URL (for redirects)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Configure Redirect URL in Whop

In Whop Dashboard → Product Settings:
- Set **Success Redirect**: `https://yourdomain.com/dashboard?payment=success`
- Set **Cancel Redirect**: `https://yourdomain.com/dashboard?payment=cancelled`

## 🔐 Webhook Endpoint

The webhook endpoint `/api/webhooks/whop/route.ts` handles these events:

### Supported Events

| Event | Action |
|-------|--------|
| `payment.succeeded` | Set subscription to `active` |
| `membership.went_valid` | Set subscription to `active` |
| `membership.went_invalid` | Set subscription to `cancelled` |
| `membership.cancelled` | Set subscription to `cancelled` |
| `payment.failed` | Set subscription to `past_due` |

### Event Payload Example

```json
{
  "event": "payment.succeeded",
  "data": {
    "id": "mem_xxx",
    "user": {
      "id": "user_xxx",
      "email": "user@example.com"
    },
    "product": {
      "id": "prod_xxx"
    },
    "status": "completed",
    "valid": true,
    "expires_at": 1234567890
  }
}
```

## 🧪 Testing

### 1. Test Webhook Locally

Use Whop's CLI or ngrok to test webhooks:

```bash
# Using ngrok
ngrok http 3000

# Update Whop webhook URL to:
https://your-ngrok-url.ngrok.io/api/webhooks/whop
```

### 2. Test Payment Flow

1. Start your dev server: `npm run dev`
2. Go to `/dashboard`
3. Click "Start Learning"
4. Click "Subscribe Now" on a plan
5. Use Whop's test card: `4242 4242 4242 4242`
6. Complete checkout
7. Should redirect back to dashboard
8. Check database - subscription_status should be `active`

### 3. Verify Database

```sql
SELECT 
  email, 
  subscription_status, 
  subscription_expires_at,
  whop_user_id
FROM users
WHERE email = 'your-test-email@example.com';
```

## 🔄 How It Works

### User Flow:
```
User clicks "Subscribe Now"
    ↓
Redirects to Whop checkout (same tab)
    ↓
User completes payment on Whop
    ↓
Whop sends webhook to /api/webhooks/whop
    ↓
Webhook updates user's subscription_status in database
    ↓
Whop redirects user back to /dashboard
    ↓
User now has access to premium features
```

### Code Flow:
```typescript
// 1. User clicks subscribe
window.location.href = whopCheckoutLink;

// 2. Whop webhook triggers
POST /api/webhooks/whop
→ Verify signature
→ Extract user email from Whop data
→ Find user in Supabase by email
→ Update subscription fields

// 3. User returns to app
→ useSubscription() hook checks status
→ Premium features unlocked
```

## 🛡️ Security

### Webhook Signature Verification

The webhook endpoint verifies that requests are from Whop:

```typescript
const signature = request.headers.get('x-whop-signature');
const isValid = crypto.verify(payload, signature, WHOP_WEBHOOK_SECRET);
```

**Never skip signature verification in production!**

## 🐛 Troubleshooting

### Webhook Not Firing

1. Check Whop Dashboard → Webhooks → Logs
2. Verify webhook URL is correct (HTTPS in production)
3. Check server logs for incoming requests
4. Ensure webhook secret is correct

### Subscription Not Updating

1. Check webhook logs in Whop Dashboard
2. Verify email in Whop matches email in Supabase
3. Check server logs: `console.log` in webhook route
4. Query database to see current status

### User Can't Access Features

1. Check subscription_status: `SELECT * FROM users WHERE id = 'xxx'`
2. Verify subscription_expires_at is in the future
3. Check browser console for subscription hook errors
4. Hard refresh the page (Ctrl+Shift+R)

## 📱 User Management

### Check User's Subscription Status

```typescript
import { useSubscription } from '@/lib/hooks/useSubscription';

function MyComponent() {
  const { isSubscribed, status, loading } = useSubscription();
  
  if (loading) return <Spinner />;
  if (!isSubscribed) return <SubscriptionModal />;
  
  return <PremiumFeature />;
}
```

### Manually Update Subscription (Admin)

```sql
-- Activate subscription
UPDATE users 
SET 
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '1 month',
  subscription_id = 'manual_override'
WHERE email = 'user@example.com';

-- Cancel subscription
UPDATE users 
SET subscription_status = 'cancelled'
WHERE email = 'user@example.com';
```

## 🚀 Production Checklist

- [ ] Environment variables set correctly
- [ ] Webhook URL configured in Whop (HTTPS)
- [ ] Webhook secret stored securely
- [ ] Database migration applied
- [ ] TypeScript types updated
- [ ] Test payment flow end-to-end
- [ ] Webhook signature verification enabled
- [ ] Error logging configured
- [ ] Success/cancel redirects working

## 📊 Monitoring

### Important Metrics

1. **Webhook Success Rate**: Track failed webhooks in Whop Dashboard
2. **Subscription Conversions**: Track users with `subscription_status = 'active'`
3. **Churn Rate**: Track users moving to `cancelled` status

### SQL Queries

```sql
-- Total active subscriptions
SELECT COUNT(*) 
FROM users 
WHERE subscription_status = 'active' 
  AND subscription_expires_at > NOW();

-- New subscriptions this month
SELECT COUNT(*) 
FROM users 
WHERE subscription_status = 'active' 
  AND created_at >= DATE_TRUNC('month', NOW());

-- Expired subscriptions
SELECT email, subscription_expires_at
FROM users 
WHERE subscription_status = 'active' 
  AND subscription_expires_at < NOW();
```

## 🔗 Resources

- [Whop Documentation](https://docs.whop.com)
- [Whop Webhooks Guide](https://docs.whop.com/webhooks)
- [Whop API Reference](https://docs.whop.com/api)

---

**Questions?** Check the [Whop Discord](https://discord.gg/whop) or [support docs](https://docs.whop.com).

