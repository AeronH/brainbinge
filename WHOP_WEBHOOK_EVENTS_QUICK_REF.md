# ✅ Whop Webhook Events - Quick Reference

Based on the actual Whop dashboard, here are the events you should select:

## Required Events (Select These)

Check these boxes in your Whop webhook configuration:

1. ✅ **`payment_succeeded`** 
   - Triggers when a payment is successfully processed
   - Sets subscription status to `active`

2. ✅ **`payment_failed`**
   - Triggers when a payment fails
   - Sets subscription status to `past_due`

3. ✅ **`membership_activated`**
   - Triggers when a membership becomes active
   - Sets subscription status to `active`

4. ✅ **`membership_deactivated`**
   - Triggers when a membership becomes inactive
   - Sets subscription status to `cancelled`

## Optional But Recommended

5. ✅ **`invoice_paid`**
   - Another way to track successful payments
   - Sets subscription status to `active`
   - Useful as a backup/redundancy

6. ✅ **`invoice_past_due`**
   - Triggers when an invoice is past due
   - Sets subscription status to `past_due`
   - Useful for tracking overdue payments

## Events You Can Skip

These are not needed for basic subscription tracking:
- ❌ `invoice_created` - Invoice created but not paid yet
- ❌ `invoice_voided` - Invoice was voided/cancelled
- ❌ `entry_created` - Related to product entries
- ❌ `entry_approved` - Related to product entries
- ❌ `entry_denied` - Related to product entries
- ❌ `entry_deleted` - Related to product entries
- ❌ `course_lesson_interaction_completed` - Related to courses
- ❌ `payment_pending` - Payment is still processing

---

## Summary

**Minimum required:** Select at least these 4:
- `payment_succeeded`
- `payment_failed`
- `membership_activated`
- `membership_deactivated`

**Recommended:** Add these 2 for better coverage:
- `invoice_paid`
- `invoice_past_due`

---

## How Events Map to Subscription Status

| Event | Subscription Status | Description |
|-------|-------------------|-------------|
| `payment_succeeded` | `active` | Payment processed successfully |
| `membership_activated` | `active` | Membership activated |
| `invoice_paid` | `active` | Invoice paid |
| `membership_deactivated` | `cancelled` | Membership ended |
| `payment_failed` | `past_due` | Payment failed |
| `invoice_past_due` | `past_due` | Invoice overdue |

---

**Your webhook handler is already configured to handle all these events correctly!**



