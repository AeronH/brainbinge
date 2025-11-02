# Quick Start Checklist - Get Payments Working

Follow this checklist to get Whop payment tracking fully working.

## ✅ Step 1: Database Setup (5 minutes)

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to your BrainBinge project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open `/supabase/migrations/add_subscription_fields.sql` in your code editor
6. Copy the entire contents
7. Paste into Supabase SQL Editor
8. Click **Run** (bottom right)
9. Should see "Success. No rows returned"

**Verify it worked:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name LIKE 'subscription%';
```

Should show 4 columns:
- subscription_status
- subscription_id  
- subscription_expires_at
- whop_user_id

---

## ✅ Step 2: Environment Variables (5 minutes)

1. Create `.env.local` in your project root
2. Add these variables:

```env
# Get these from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Get this from Whop after creating webhook (Step 4)
WHOP_WEBHOOK_SECRET=whop_xxx...

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Restart your dev server:
```bash
npm run dev
```

---

## ✅ Step 3: Set Up Whop Account (10 minutes)

### Create Account
1. Go to [dash.whop.com](https://dash.whop.com)
2. Sign up or log in
3. Click **Create Company**

### Create Products
1. Click **Products** → **Create Product**

**Monthly Plan:**
- Name: BrainBinge Pro - Monthly
- Price: $19.00
- Billing: Monthly
- Click **Create**
- Copy the checkout link

**Yearly Plan:**
- Name: BrainBinge Pro - Yearly  
- Price: $190.00
- Billing: Yearly
- Click **Create**
- Copy the checkout link

### Update Your Code
Open `/src/components/modals/SubscriptionModal.tsx`:

```typescript
// Line 20 & 36 - Replace with your actual Whop checkout links
const plans = [
  {
    name: "Monthly",
    whopLink: "https://whop.com/checkout/plan_YOUR_MONTHLY_PLAN_ID",
    // ...
  },
  {
    name: "Yearly",
    whopLink: "https://whop.com/checkout/plan_YOUR_YEARLY_PLAN_ID",
    // ...
  },
];
```

---

## ✅ Step 4: Configure Whop Webhook (5 minutes)

1. In Whop Dashboard → **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter URL:
   - **Local testing**: Use ngrok (see below)
   - **Production**: `https://yourdomain.com/api/webhooks/whop`
4. Select events:
   - ✅ `payment.succeeded`
   - ✅ `membership.went_valid`
   - ✅ `membership.went_invalid`
   - ✅ `membership.cancelled`
   - ✅ `payment.failed`
5. Click **Create**
6. **Copy the Webhook Secret**
7. Add to `.env.local`:
   ```env
   WHOP_WEBHOOK_SECRET=whop_xxx...your-secret
   ```
8. Restart dev server

### For Local Testing (ngrok)

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok (in separate terminal)
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use as webhook URL: https://abc123.ngrok.io/api/webhooks/whop
```

---

## ✅ Step 5: Test Everything (10 minutes)

### Test 1: Webhook Endpoint

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

✅ If you see this, webhook endpoint is working!

### Test 2: Manual Subscription Grant

1. Sign up in your app with a test email
2. Run this in Supabase SQL Editor:

```sql
UPDATE users 
SET 
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE email = 'your-test-email@example.com';
```

3. Refresh your app
4. Try creating a lesson - should work without showing paywall!

✅ If you can create lessons, subscription checking works!

### Test 3: Full Payment Flow

1. Make sure ngrok is running (for local testing)
2. Go to your app: `http://localhost:3000`
3. Sign up with a new email
4. Click "Start Learning" or try to create lesson
5. Subscription modal appears
6. Click "Subscribe Now"
7. Use Whop test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
8. Complete checkout
9. Should redirect back to dashboard
10. Check Supabase - subscription_status should be `active`

```sql
SELECT 
  email,
  subscription_status,
  subscription_id,
  subscription_expires_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
```

✅ If subscription_status is 'active', everything works!

---

## ✅ Step 6: Verify Whop Webhook Delivery

1. Go to Whop Dashboard → Webhooks
2. Click on your webhook
3. Check "Recent Deliveries"
4. Should see your test payment webhook
5. Status should be **200 OK** (green)
6. Click to see request/response details

✅ Green checkmark = webhook working perfectly!

---

## 🚀 Production Deployment

### Before Going Live:

- [ ] Deploy app to production (Vercel/etc)
- [ ] Set all environment variables in hosting platform
- [ ] Update Whop webhook URL to production domain
- [ ] Update redirect URLs in Whop products:
  - Success: `https://yourdomain.com/dashboard?payment=success`
  - Cancel: `https://yourdomain.com/dashboard?payment=cancelled`
- [ ] Switch Whop from test mode to live mode
- [ ] Test end-to-end with test card
- [ ] Make a real $1 test purchase
- [ ] Monitor first few real payments closely

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook returns 404 | Check file exists: `src/app/api/webhooks/whop/route.ts` |
| Webhook returns 401 | Check `WHOP_WEBHOOK_SECRET` in `.env.local` |
| Can't install dependencies | Run `npm install` |
| Subscription not updating | Check Whop webhook logs for errors |
| User not found error | User must sign up before subscribing |
| Still showing paywall | Hard refresh (Ctrl+Shift+R) |

---

## 📖 Detailed Documentation

Need more details? Check these guides:

- 📘 [Payment Tracking Summary](/docs/PAYMENT_TRACKING_SUMMARY.md) - How everything works
- 📘 [Whop Integration Guide](/docs/WHOP_INTEGRATION.md) - Detailed Whop setup
- 📘 [Setup Guide](/docs/SETUP_SUBSCRIPTION.md) - Step-by-step instructions
- 📘 [Webhook Events](/docs/WHOP_WEBHOOK_EVENTS.md) - Webhook event reference

---

## ✨ You're Done!

If all steps show ✅, you now have:

- ✅ Subscription tracking in database
- ✅ Webhook endpoint receiving Whop events
- ✅ Automatic subscription status updates
- ✅ Payment flow redirecting in same tab
- ✅ Premium features gated by subscription

**Next step:** Test with a real purchase and monitor webhook deliveries! 🎉

---

**Questions?** Review the detailed docs above or check [Whop's support](https://docs.whop.com).

