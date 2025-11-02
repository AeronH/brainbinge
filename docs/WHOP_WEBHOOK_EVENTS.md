# Whop Webhook Events Reference

## Quick Reference

This document shows the exact webhook events Whop sends and how our endpoint handles them.

## Webhook Events

### ✅ payment.succeeded

Sent when a payment is successfully processed.

**Payload:**
```json
{
  "action": "payment.succeeded",
  "data": {
    "id": "mem_abc123",
    "user": {
      "id": "user_xyz789",
      "email": "user@example.com",
      "username": "john_doe"
    },
    "product": {
      "id": "prod_123",
      "name": "Monthly Subscription"
    },
    "plan": {
      "id": "plan_456",
      "name": "Monthly Plan"
    },
    "status": "completed",
    "valid": true,
    "expires_at": 1730419200,
    "amount": 1900,
    "currency": "usd"
  }
}
```

**Our Action:**
- Set `subscription_status = 'active'`
- Store `subscription_id = mem_abc123`
- Store `subscription_expires_at` from `expires_at`
- Store `whop_user_id = user_xyz789`

---

### ✅ membership.went_valid

Sent when a membership becomes valid (initial purchase or renewal).

**Payload:**
```json
{
  "action": "membership.went_valid",
  "data": {
    "id": "mem_abc123",
    "user": {
      "id": "user_xyz789",
      "email": "user@example.com"
    },
    "product": {
      "id": "prod_123"
    },
    "valid": true,
    "expires_at": 1730419200,
    "status": "active"
  }
}
```

**Our Action:**
- Set `subscription_status = 'active'`
- Update expiration date

---

### ❌ membership.went_invalid

Sent when a membership becomes invalid (expired, cancelled, or payment failed).

**Payload:**
```json
{
  "action": "membership.went_invalid",
  "data": {
    "id": "mem_abc123",
    "user": {
      "id": "user_xyz789",
      "email": "user@example.com"
    },
    "valid": false,
    "expires_at": 1730419200,
    "status": "cancelled"
  }
}
```

**Our Action:**
- Set `subscription_status = 'cancelled'`

---

### 🚫 membership.cancelled

Sent when a user actively cancels their subscription.

**Payload:**
```json
{
  "action": "membership.cancelled",
  "data": {
    "id": "mem_abc123",
    "user": {
      "id": "user_xyz789",
      "email": "user@example.com"
    },
    "valid": false,
    "cancelled_at": 1730419200,
    "expires_at": 1733011200
  }
}
```

**Note:** User still has access until `expires_at`

**Our Action:**
- Set `subscription_status = 'cancelled'`
- Keep `subscription_expires_at` (user has access until then)

---

### ⚠️ payment.failed

Sent when a payment fails (e.g., card declined).

**Payload:**
```json
{
  "action": "payment.failed",
  "data": {
    "id": "mem_abc123",
    "user": {
      "id": "user_xyz789",
      "email": "user@example.com"
    },
    "status": "past_due",
    "failure_reason": "card_declined",
    "retry_at": 1730505600
  }
}
```

**Our Action:**
- Set `subscription_status = 'past_due'`
- User may still have grace period access

---

## Event Processing Logic

Our webhook endpoint (`/api/webhooks/whop/route.ts`) processes events like this:

```typescript
switch (eventType) {
  case "payment.succeeded":
  case "membership.went_valid":
    subscriptionStatus = "active";
    break;

  case "membership.went_invalid":
  case "membership.cancelled":
    subscriptionStatus = "cancelled";
    break;

  case "payment.failed":
    subscriptionStatus = "past_due";
    break;

  default:
    console.log("Unhandled event type:", eventType);
    return NextResponse.json({ received: true });
}
```

## Testing Webhooks

### Using Whop Dashboard

1. Go to Whop Dashboard → Webhooks
2. Click on your webhook
3. Click "Send Test Event"
4. Select event type
5. Click "Send"

### Using cURL

```bash
# Test payment.succeeded event
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "x-whop-signature: your-test-signature" \
  -d '{
    "action": "payment.succeeded",
    "data": {
      "id": "mem_test123",
      "user": {
        "id": "user_test",
        "email": "test@example.com"
      },
      "valid": true,
      "expires_at": 1733011200
    }
  }'
```

**Note:** Signature verification will fail unless you use the real webhook secret.

### Manual Database Testing

For development, you can skip webhooks and update directly:

```sql
-- Simulate successful subscription
UPDATE users 
SET 
  subscription_status = 'active',
  subscription_id = 'test_membership_id',
  subscription_expires_at = NOW() + INTERVAL '1 month',
  whop_user_id = 'test_whop_user'
WHERE email = 'your-email@example.com';
```

## Common Fields

### User Object
```json
{
  "id": "user_xyz789",      // Whop's user ID
  "email": "user@email.com", // Email (we use this to find user in our DB)
  "username": "john_doe"
}
```

### Timestamps
- All timestamps are Unix epoch (seconds since 1970)
- Convert to JavaScript Date: `new Date(timestamp * 1000)`
- Our code does this automatically

### Amounts
- Currency amounts in cents (1900 = $19.00)
- Always in USD by default

## Subscription Statuses

| Whop Status | Our Status | Description |
|-------------|------------|-------------|
| `completed` | `active` | Payment successful, user has access |
| `active` | `active` | Membership is currently valid |
| `cancelled` | `cancelled` | User cancelled (may still have access until expiry) |
| `past_due` | `past_due` | Payment failed, in grace period |
| `expired` | `cancelled` | Membership expired |

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Invalid signature"
}
```
**Fix:** Check `WHOP_WEBHOOK_SECRET` matches Whop Dashboard

### 404 User Not Found
```json
{
  "error": "User not found"
}
```
**Fix:** User must sign up in your app before subscribing

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
**Fix:** Check server logs for details

## Success Response

When webhook processes successfully:

```json
{
  "success": true,
  "userId": "uuid-abc-123",
  "status": "active"
}
```

## Webhook Headers

Whop sends these headers:

```
Content-Type: application/json
x-whop-signature: abc123...hex-signature
User-Agent: Whop-Webhooks/1.0
```

**Important:** Always verify `x-whop-signature`!

## Debugging Tips

### Check Whop Logs
1. Whop Dashboard → Webhooks
2. Click your webhook
3. View "Recent Deliveries"
4. Click a delivery to see:
   - Request payload
   - Response status
   - Response body
   - Retry status

### Check Your Server Logs

Add logging to webhook endpoint:

```typescript
// At start of webhook handler
console.log("🔔 Webhook received:", {
  event: event.action,
  user: event.data?.user?.email,
  timestamp: new Date().toISOString()
});

// After database update
console.log("✅ Subscription updated:", {
  email: userEmail,
  status: subscriptionStatus,
  expiresAt: expiresAt
});
```

### Test in Production

Use Whop's test mode:
1. Set products to test mode
2. Use test card: `4242 4242 4242 4242`
3. Complete checkout
4. Check webhook delivery in Whop Dashboard
5. Check database update

## Rate Limits

Whop webhooks:
- No rate limit on receiving webhooks
- Automatic retries on failure (exponential backoff)
- Max 3 retries
- Should respond within 10 seconds

## Best Practices

1. **Always verify signatures** - Security!
2. **Respond quickly** - Process async if needed
3. **Log everything** - Debugging webhooks is hard
4. **Handle idempotency** - Same webhook might arrive twice
5. **Return 200 OK fast** - Even if processing fails

## Example Full Event

Here's a complete real-world webhook event:

```json
{
  "action": "payment.succeeded",
  "data": {
    "id": "mem_kdYMV2sPp1qaz_xyz",
    "user": {
      "id": "user_abc123def",
      "email": "john.doe@example.com",
      "username": "johndoe",
      "profile_image_url": "https://...",
      "social_accounts": []
    },
    "product": {
      "id": "prod_abc123",
      "name": "BrainBinge Pro",
      "description": "Full access to BrainBinge features",
      "visibility": "visible"
    },
    "plan": {
      "id": "plan_kdYMV2sPp1qaz",
      "name": "Monthly Plan",
      "price": 1900,
      "billing_period": 1,
      "billing_period_unit": "month"
    },
    "status": "completed",
    "valid": true,
    "license_key": "BrainBinge-XXXX-XXXX-XXXX",
    "metadata": {},
    "created_at": 1730332800,
    "expires_at": 1733011200,
    "renewal_period_start": 1730332800,
    "renewal_period_end": 1733011200,
    "amount": 1900,
    "currency": "usd",
    "stripe_charge_id": "ch_abc123xyz"
  },
  "timestamp": 1730332800
}
```

---

**Need more details?** Check [Whop's official webhook documentation](https://docs.whop.com/webhooks).

