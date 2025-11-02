# ✅ Whop Payment Setup - Quick Checklist

Use this checklist to track your progress. Check off each item as you complete it.

## Step 1: Database Setup
- [ ] Opened Supabase Dashboard → SQL Editor
- [ ] Copied migration from `/supabase/migrations/add_subscription_fields.sql`
- [ ] Ran migration in Supabase SQL Editor
- [ ] Verified 4 subscription columns exist in `users` table

## Step 2: Environment Variables
- [ ] Created/updated `.env.local` file
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Added `NEXT_PUBLIC_APP_URL`
- [ ] Restarted dev server (`npm run dev`)

## Step 3: Whop Checkout Links
- [ ] Opened Whop Dashboard → Products
- [ ] Copied Monthly plan checkout link
- [ ] Copied Yearly plan checkout link
- [ ] Updated `/src/components/modals/SubscriptionModal.tsx` line 20
- [ ] Updated `/src/components/modals/SubscriptionModal.tsx` line 36

## Step 4: Webhook Setup
- [ ] Installed ngrok (`npm install -g ngrok`)
- [ ] Started ngrok (`ngrok http 3000`)
- [ ] Copied ngrok HTTPS URL
- [ ] Created webhook in Whop Dashboard → Settings → Webhooks
- [ ] Set webhook URL to ngrok URL + `/api/webhooks/whop`
- [ ] Selected required events:
  - [ ] `payment_succeeded`
  - [ ] `payment_failed`
  - [ ] `membership_activated`
  - [ ] `membership_deactivated`
  - [ ] `invoice_paid` (optional but recommended)
  - [ ] `invoice_past_due` (optional but recommended)
- [ ] Copied webhook secret from Whop
- [ ] Added `WHOP_WEBHOOK_SECRET` to `.env.local`
- [ ] Restarted dev server

## Step 5: Product Redirect URLs
- [ ] Opened Monthly product in Whop
- [ ] Set Success Redirect: `http://localhost:3000/dashboard?payment=success`
- [ ] Set Cancel Redirect: `http://localhost:3000/dashboard?payment=cancelled`
- [ ] Opened Yearly product in Whop
- [ ] Set Success Redirect: `http://localhost:3000/dashboard?payment=success`
- [ ] Set Cancel Redirect: `http://localhost:3000/dashboard?payment=cancelled`

## Step 6: Testing
- [ ] Tested webhook endpoint (`curl http://localhost:3000/api/webhooks/whop`)
- [ ] Manually granted subscription to test user
- [ ] Verified subscription checking works (can create lesson)
- [ ] Completed full payment flow test:
  - [ ] Signed up with new email
  - [ ] Clicked "Subscribe Now"
  - [ ] Completed checkout with test card
  - [ ] Verified redirect back to dashboard
  - [ ] Checked database: `subscription_status = 'active'`
- [ ] Verified webhook delivery in Whop Dashboard (200 OK)

## 🎉 All Done!
- [ ] All tests passing
- [ ] Ready for production deployment

---

## 📝 Notes

Document any issues or gotchas here:

```
[Your notes here]
```

---

## 🔗 Useful Links

- **Setup Guide**: `WHOP_SETUP_GUIDE.md`
- **Whop Dashboard**: https://dash.whop.com
- **Supabase Dashboard**: https://app.supabase.com
- **Webhook Endpoint**: `http://localhost:3000/api/webhooks/whop`

