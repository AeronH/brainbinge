# 🚀 Whop Payment Integration - Complete Setup Guide

Since you already have products created in Whop, let's get everything connected and working!

## ✅ Pre-Flight Checklist

Before we start, make sure you have:
- ✅ Products created in Whop (you have this!)
- ✅ Supabase project set up
- ✅ Next.js app running locally
- ✅ Access to Whop Dashboard

---

## Step 1: Run Database Migration (5 minutes)

You need to add subscription tracking fields to your database.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your BrainBinge project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open `/supabase/migrations/add_subscription_fields.sql` in your code editor
6. Copy the entire contents
7. Paste into Supabase SQL Editor
8. Click **Run** (bottom right)
9. You should see: "Success. No rows returned"

### Verify Migration Worked

Run this query in Supabase SQL Editor:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name LIKE 'subscription%';
```

You should see 4 columns:
- `subscription_status`
- `subscription_id`
- `subscription_expires_at`
- `whop_user_id`

---

## Step 2: Set Up Environment Variables (5 minutes)

1. Check if you have a `.env.local` file in your project root. If not, create it.

2. Add these variables to `.env.local`:

```env
# Supabase Configuration
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Whop Integration
# We'll get this in Step 3 after setting up the webhook
WHOP_WEBHOOK_SECRET=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Where to Find Supabase Values:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

3. **Restart your dev server** after adding env vars:
```bash
npm run dev
```

---

## Step 3: Get Your Whop Checkout Links (5 minutes)

You need to copy the checkout links from your Whop products.

1. Go to [Whop Dashboard](https://dash.whop.com)
2. Click **Products** in the left sidebar
3. For each product (Monthly and Yearly):
   - Click on the product
   - Go to **Checkout Links** tab
   - Find the checkout link (looks like: `https://whop.com/checkout/plan_xxxxx`)
   - Copy the full URL

### Update Your Code

Open `/src/components/modals/SubscriptionModal.tsx` and update lines 20 and 36:

```typescript
// Line 20 - Monthly plan
whopLink: "https://whop.com/checkout/plan_YOUR_MONTHLY_PLAN_ID?d2c=true",

// Line 36 - Yearly plan  
whopLink: "https://whop.com/checkout/plan_YOUR_YEARLY_PLAN_ID?d2c=true",
```

**Replace** `YOUR_MONTHLY_PLAN_ID` and `YOUR_YEARLY_PLAN_ID` with your actual checkout links from Whop.

**Note:** The `?d2c=true` parameter enables direct-to-checkout, which improves the user experience.

---

## Step 4: Configure Whop Webhook (10 minutes)

This is the critical piece that updates your database when someone pays.

### For Local Testing (ngrok setup)

Since webhooks need a public URL, you'll need ngrok for local testing:

1. **Install ngrok** (if you don't have it):
```bash
npm install -g ngrok
```

2. **Start ngrok** (in a separate terminal):
```bash
ngrok http 3000
```

3. **Copy the HTTPS URL** (looks like: `https://abc123.ngrok.io`)
   - Keep this terminal open!

### Create Webhook in Whop

1. Go to **Whop Dashboard** → **Settings** → **Webhooks**
2. Click **Add Webhook** or **Create Webhook**
3. Enter webhook URL:
   - **Local testing**: `https://your-ngrok-url.ngrok.io/api/webhooks/whop`
   - **Production**: `https://yourdomain.com/api/webhooks/whop`
4. Select these events:
   - ✅ `payment_succeeded` (when payment goes through)
   - ✅ `payment_failed` (when payment fails)
   - ✅ `membership_activated` (when membership becomes active)
   - ✅ `membership_deactivated` (when membership becomes inactive)
   - ✅ `invoice_paid` (another way to track successful payments)
   - ✅ `invoice_past_due` (when payment is past due)
   
   **Note:** Whop uses underscores in event names (e.g., `payment_succeeded` not `payment.succeeded`)
5. Click **Create** or **Save**
6. **IMPORTANT:** Copy the **Webhook Secret** (starts with `whop_` or similar)
   - This is shown after creating the webhook
   - You'll need this next!

### Add Webhook Secret to Environment

Add the webhook secret to your `.env.local`:

```env
WHOP_WEBHOOK_SECRET=whop_xxx...your-secret-here
```

**Restart your dev server** after adding the secret:
```bash
npm run dev
```

---

## Step 5: Configure Product Redirect URLs (5 minutes)

Tell Whop where to redirect users after payment.

1. In **Whop Dashboard**, go to each product
2. Go to **Settings** or **Product Settings**
3. Find **Redirect URLs** section
4. Set:
   - **Success Redirect**: `http://localhost:3000/dashboard?payment=success`
   - **Cancel Redirect**: `http://localhost:3000/dashboard?payment=cancelled`
5. Save changes

**Note:** For production, update these to your actual domain:
- Success: `https://yourdomain.com/dashboard?payment=success`
- Cancel: `https://yourdomain.com/dashboard?payment=cancelled`

---

## Step 6: Test the Integration (15 minutes)

### Test 1: Verify Webhook Endpoint is Running

```bash
curl http://localhost:3000/api/webhooks/whop
```

Should return:
```json
{
  "message": "Whop webhook endpoint is active",
  "timestamp": "2025-01-23T..."
}
```

✅ If you see this, your webhook endpoint is working!

### Test 2: Manual Subscription Test

Test that subscription checking works:

1. Sign up in your app with a test email
2. Go to Supabase SQL Editor
3. Run this query:

```sql
UPDATE users 
SET 
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE email = 'your-test-email@example.com';
```

4. Refresh your app
5. Try creating a lesson - should work without showing paywall!

✅ If you can create lessons, subscription checking works!

### Test 3: Full Payment Flow (End-to-End)

1. **Make sure ngrok is running** (Step 4)
2. **Update webhook URL in Whop** to your ngrok URL (if not already done)
3. Go to your app: `http://localhost:3000`
4. Sign up with a **new email** (different from test email)
5. Click "Start Learning" or try to create a lesson
6. Subscription modal should appear
7. Click "Subscribe Now" on Monthly or Yearly plan
8. **Complete checkout on Whop**:
   - Use Whop's test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
9. Complete payment
10. Should redirect back to dashboard
11. **Check Supabase** to verify subscription:

```sql
SELECT 
  email,
  subscription_status,
  subscription_id,
  subscription_expires_at,
  whop_user_id
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
```

✅ If `subscription_status` is `'active'`, everything works!

### Test 4: Verify Webhook Delivery

1. Go to **Whop Dashboard** → **Webhooks**
2. Click on your webhook
3. Check **Recent Deliveries** or **Webhook Logs**
4. Should see your test payment webhook
5. Status should be **200 OK** (green checkmark)
6. Click to see request/response details

✅ Green checkmark = webhook working perfectly!

---

## 🐛 Troubleshooting

### Webhook returns 404
- ✅ Check file exists: `src/app/api/webhooks/whop/route.ts`
- ✅ Make sure you're using the correct URL format
- ✅ Check that your Next.js server is running

### Webhook returns 401 (Unauthorized)
- ✅ Check `WHOP_WEBHOOK_SECRET` is set in `.env.local`
- ✅ Verify secret matches Whop Dashboard → Webhooks → Your Webhook → Secret
- ✅ Restart dev server after adding secret

### Subscription not updating after payment
- ✅ Check Whop webhook logs for errors (Dashboard → Webhooks → Recent Deliveries)
- ✅ Check your server logs for errors
- ✅ Verify user email in Whop matches email in Supabase
- ✅ Make sure user exists in database before subscribing

### User not found error
- ✅ User must sign up in your app BEFORE subscribing
- ✅ Email in Whop checkout must match email in Supabase

### Still showing paywall after payment
- ✅ Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- ✅ Check subscription_status in database is 'active'
- ✅ Check subscription_expires_at is in the future

### ngrok not working
- ✅ Make sure ngrok is running: `ngrok http 3000`
- ✅ Use HTTPS URL (not HTTP)
- ✅ Update webhook URL in Whop to match ngrok URL
- ✅ Check ngrok shows requests coming through

---

## 🚀 Production Deployment Checklist

Before going live:

- [ ] Deploy app to production (Vercel/etc)
- [ ] Set all environment variables in hosting platform
- [ ] Update Whop webhook URL to production domain:
  - `https://yourdomain.com/api/webhooks/whop`
- [ ] Update redirect URLs in Whop products:
  - Success: `https://yourdomain.com/dashboard?payment=success`
  - Cancel: `https://yourdomain.com/dashboard?payment=cancelled`
- [ ] Switch Whop from test mode to live mode
- [ ] Test end-to-end with test card
- [ ] Make a real $1 test purchase
- [ ] Monitor first few real payments closely
- [ ] Set up monitoring/alerts for webhook failures

---

## 📚 Additional Resources

- **Detailed Integration Guide**: `/docs/WHOP_INTEGRATION.md`
- **Webhook Events Reference**: `/docs/WHOP_WEBHOOK_EVENTS.md`
- **Payment Flow Summary**: `/docs/PAYMENT_TRACKING_SUMMARY.md`
- **Whop Documentation**: https://docs.whop.com
- **Whop Webhooks Guide**: https://docs.whop.com/webhooks

---

## ✨ You're Done!

Once all steps show ✅, you have:

- ✅ Subscription tracking in database
- ✅ Webhook endpoint receiving Whop events
- ✅ Automatic subscription status updates
- ✅ Payment flow redirecting properly
- ✅ Premium features gated by subscription

**Next step:** Test with a real purchase and monitor webhook deliveries! 🎉

---

## 🆘 Need Help?

1. Check Whop Dashboard → Webhooks → Recent Deliveries for errors
2. Review server logs for detailed error messages
3. Check Supabase logs for database errors
4. Verify all environment variables are set correctly
5. Review the troubleshooting section above

**Questions?** Check the detailed docs or [Whop's support](https://docs.whop.com).

