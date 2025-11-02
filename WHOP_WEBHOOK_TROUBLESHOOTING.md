# 🔧 Whop Webhook Troubleshooting - "Missing webhook signature or secret"

## Quick Fix Steps

### Step 1: Check Your Environment Variables

1. **Verify `.env.local` exists** in your project root (same level as `package.json`)

2. **Check if `WHOP_WEBHOOK_SECRET` is set:**
   ```bash
   # In your terminal, from project root:
   cat .env.local | grep WHOP_WEBHOOK_SECRET
   ```

   Should show something like:
   ```
   WHOP_WEBHOOK_SECRET=whop_xxxxx...
   ```

3. **If it's missing or empty:**
   - Go to **Whop Dashboard** → **Settings** → **Webhooks**
   - Click on your webhook
   - Copy the **Webhook Secret**
   - Add to `.env.local`:
     ```env
     WHOP_WEBHOOK_SECRET=whop_xxxxx...your-secret-here
     ```

### Step 2: Restart Your Dev Server

**CRITICAL:** Environment variables are only loaded when the server starts!

1. Stop your dev server (Ctrl+C)
2. Restart it:
   ```bash
   npm run dev
   ```

### Step 3: Check Server Logs

After triggering a webhook, check your terminal logs. You should now see:
```
Webhook received - Debug info:
- Has signature header: true/false
- Has WHOP_WEBHOOK_SECRET: true/false
- All headers: {...}
```

This will tell you exactly what's missing.

---

## Common Issues & Solutions

### Issue 1: `WHOP_WEBHOOK_SECRET` not in `.env.local`

**Symptoms:**
- Error: "Missing webhook signature or secret"
- Debug shows: `hasSecret: false`

**Solution:**
1. Create/update `.env.local` in project root
2. Add: `WHOP_WEBHOOK_SECRET=your-secret-from-whop`
3. Restart dev server

---

### Issue 2: Secret Not Copied Correctly

**Symptoms:**
- Secret exists but verification fails
- Error: "Invalid signature"

**Solution:**
1. Double-check you copied the **entire** secret from Whop
2. Make sure there are no extra spaces or quotes
3. Secret should look like: `whop_xxxxx...` (usually starts with `whop_`)

**Wrong:**
```env
WHOP_WEBHOOK_SECRET="whop_xxx"  # Extra quotes
WHOP_WEBHOOK_SECRET= whop_xxx   # Extra space
```

**Right:**
```env
WHOP_WEBHOOK_SECRET=whop_xxxxx...your-full-secret
```

---

### Issue 3: Dev Server Not Restarted

**Symptoms:**
- Added secret but still getting error
- Debug shows: `hasSecret: false` even though it's in `.env.local`

**Solution:**
- **Restart your dev server**
- Environment variables are only loaded on startup

---

### Issue 4: Testing Without Whop (Local Development)

If you're testing the webhook manually (not from Whop), you can temporarily skip verification:

1. Add to `.env.local`:
   ```env
   WHOP_SKIP_VERIFICATION=true
   ```
2. Restart dev server
3. ⚠️ **WARNING:** This disables security! Only use for local testing!
4. Remove this line before deploying to production

---

## Testing Your Setup

### Test 1: Verify Environment Variable is Loaded

```bash
# Check your server logs when it starts
# Look for any errors about missing env vars
```

### Test 2: Trigger Webhook from Whop

1. Make sure ngrok is running: `ngrok http 3000`
2. Update webhook URL in Whop to your ngrok URL
3. In Whop Dashboard → Webhooks → Your Webhook
4. Click **Send Test Event** or trigger a test payment
5. Check your server logs - you should see debug info

### Test 3: Manual Webhook Test (with verification disabled)

```bash
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -d '{"action": "payment_succeeded", "data": {"user": {"email": "test@example.com"}}}'
```

With `WHOP_SKIP_VERIFICATION=true`, this should work.

---

## Debug Output Explained

When you trigger a webhook, you'll see in your server logs:

```
Webhook received - Debug info:
- Has signature header: true    ← Should be true if Whop is sending
- Has WHOP_WEBHOOK_SECRET: true ← Should be true if env var is set
- All headers: { ... }          ← Shows all request headers
```

**If `Has WHOP_WEBHOOK_SECRET: false`:**
- Secret not in `.env.local`, OR
- Dev server not restarted

**If `Has signature header: false`:**
- Whop might not be sending signature (check Whop webhook settings)
- Or header name is different (we check multiple variants now)

---

## Still Not Working?

1. **Double-check `.env.local` location:**
   - Must be in project root (same folder as `package.json`)
   - Not in `src/` or any subfolder

2. **Verify file format:**
   ```env
   # .env.local should look like this:
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   WHOP_WEBHOOK_SECRET=whop_xxxxx...
   ```

3. **Check for syntax errors:**
   - No quotes around values (unless they contain spaces)
   - No trailing spaces
   - Each variable on its own line

4. **Verify Whop webhook settings:**
   - Webhook URL is correct
   - Webhook is enabled/active
   - Events are selected

5. **Check Whop webhook logs:**
   - Go to Whop Dashboard → Webhooks → Your Webhook
   - Check "Recent Deliveries" or "Webhook Logs"
   - See if Whop is getting errors from your endpoint

---

## Need More Help?

Check your server terminal logs - the debug output will show exactly what's missing!



