# 🚀 Stripe Payment Integration - Setup Guide

Complete guide to set up Stripe payments for BrainBinge.

## ✅ Step 1: Create Stripe Account & Products (10 minutes)

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com) and sign up
   - Complete account setup (verify email, etc.)

2. **Create Products in Stripe Dashboard**
   - Go to **Products** → **+ Add Product**
   
   **Monthly Plan:**
   - Name: BrainBinge Pro - Monthly
   - Pricing: Recurring, Monthly
   - Price: $19.00 USD
   - Click **Save**
   - **Copy the Price ID** (starts with `price_...`)

   **Yearly Plan:**
   - Name: BrainBinge Pro - Yearly
   - Pricing: Recurring, Yearly
   - Price: $190.00 USD
   - Click **Save**
   - **Copy the Price ID** (starts with `price_...`)

---

## ✅ Step 2: Get Stripe API Keys (5 minutes)

1. Go to **Stripe Dashboard** → **Developers** → **API keys**
2. Make sure you're in **Test mode** for testing
3. Copy:
   - **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret key** (starts with `sk_test_...` or `sk_live_...`)
   - Click **Reveal test key** if needed

---

## ✅ Step 3: Set Up Webhook Endpoint (5 minutes)

1. In **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. Set endpoint URL:
   - **Local testing**: Use ngrok (see below)
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Webhook Signing Secret** (starts with `whsec_...`)

### For Local Testing (ngrok)

```bash
# Install ngrok if you don't have it
npm install -g ngrok

# Start ngrok (in separate terminal)
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use as webhook URL: https://abc123.ngrok.io/api/webhooks/stripe
```

---

## ✅ Step 4: Environment Variables (5 minutes)

Add to your `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx...your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...your-webhook-secret

# Stripe Price IDs (get from Step 1)
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_xxxxx...monthly-price-id
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_xxxxx...yearly-price-id

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Restart your dev server** after adding these:

```bash
npm run dev
```

---

## ✅ Step 5: Test the Integration (10 minutes)

### Test 1: Verify Webhook Endpoint

```bash
curl http://localhost:3000/api/webhooks/stripe
```

Should return:
```json
{
  "message": "Stripe webhook endpoint is active",
  "timestamp": "..."
}
```

### Test 2: Create Checkout Session

1. Sign up/login in your app
2. Try to create a lesson (triggers subscription modal)
3. Click "Subscribe Now" on a plan
4. Should redirect to Stripe Checkout

### Test 3: Complete Test Payment

1. Use Stripe test card: `4242 4242 4242 4242`
2. Expiry: Any future date (e.g., 12/25)
3. CVC: Any 3 digits (e.g., 123)
4. ZIP: Any 5 digits (e.g., 12345)
5. Complete checkout
6. Should redirect back to dashboard
7. Check Supabase - subscription should be `active`

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

### Test 4: Verify Webhook Delivery

1. Go to **Stripe Dashboard** → **Webhooks**
2. Click on your webhook endpoint
3. Check **Recent events**
4. Should see events with **200 OK** status

---

## 🚀 Production Deployment Checklist

Before going live:

- [ ] Switch Stripe to **Live mode**
- [ ] Get **Live API keys** from Stripe Dashboard
- [ ] Create **Live products** and get live Price IDs
- [ ] Create **Live webhook endpoint** with production URL
- [ ] Update all environment variables in hosting platform:
  - `STRIPE_SECRET_KEY` (live key)
  - `STRIPE_WEBHOOK_SECRET` (live webhook secret)
  - `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` (live price ID)
  - `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY` (live price ID)
  - `NEXT_PUBLIC_APP_URL` (production URL)
- [ ] Update webhook URL in Stripe to production domain
- [ ] Test with real $1 payment
- [ ] Monitor webhook deliveries

---

## 🐛 Troubleshooting

### Webhook returns 401
- ✅ Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- ✅ Verify webhook endpoint URL is correct
- ✅ Make sure you're using the right secret (test vs live)

### Checkout session fails
- ✅ Check `STRIPE_SECRET_KEY` is set correctly
- ✅ Verify Price IDs are correct
- ✅ Check Stripe Dashboard → Logs for errors

### Subscription not updating
- ✅ Check Stripe webhook logs for delivery errors
- ✅ Verify user email in Stripe matches email in Supabase
- ✅ Check server logs for webhook processing errors

### Can't create checkout session
- ✅ Verify user is authenticated
- ✅ Check Price IDs are set in environment variables
- ✅ Check Stripe API key has correct permissions

---

## 📚 Stripe Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe Webhooks**: https://stripe.com/docs/webhooks

---

## ✨ You're Done!

Once all steps show ✅, you have:

- ✅ Stripe products and prices created
- ✅ Webhook endpoint receiving Stripe events
- ✅ Automatic subscription status updates
- ✅ Stripe Checkout integration
- ✅ Premium features gated by subscription

**Next step:** Test with a real payment and monitor webhook deliveries! 🎉



