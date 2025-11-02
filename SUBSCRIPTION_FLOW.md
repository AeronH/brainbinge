# Subscription & Conversion Flow

## 🎯 Overview

BrainBinge uses a freemium conversion funnel with modal-based authentication and subscription paywalls. Users can explore the interface without barriers, sign up when they visit, and hit a paywall when they try to use features.

## 🚀 User Journey

### 1. **First Visit (Unauthenticated)**
```
User visits BrainBinge.ai (or any URL)
    ↓
Redirects to /dashboard automatically
    ↓
Sign-up modal appears in center
    ↓
User can see the dashboard behind the modal
```

**Sign-up Modal includes:**
- Email/password fields
- Google OAuth button
- Toggle between sign-in and sign-up
- No separate landing page needed

### 2. **After Sign Up (Free Tier)**
```
User signs up
    ↓
Modal closes, dashboard fully accessible
    ↓
User explores interface, fills out lesson form
    ↓
User clicks "Start Learning Session"
    ↓
Subscription modal appears!
```

**Conversion Strategy:**
- Let users fill out entire lesson form first
- Wait until they click submit (high intent moment)
- Then show subscription paywall
- Maximizes conversion by catching users when invested

### 3. **Subscription Modal**
- Shows pricing plans (Monthly & Yearly)
- Whop checkout links
- Feature comparison
- "Most Popular" badge on best plan
- Opens Whop checkout in new tab

### 4. **After Subscription**
- User completes payment on Whop
- Webhook updates database (to be implemented)
- User can now create lessons and use all features

## 🔐 Technical Implementation

### Database Schema

```sql
-- Subscription fields in users table
ALTER TABLE users ADD COLUMN:
  subscription_status text DEFAULT 'free',
  subscription_id text,
  subscription_expires_at timestamptz,
  whop_user_id text
```

**Subscription Statuses:**
- `free` - Default, no subscription
- `active` - Paid, can use all features
- `cancelled` - Was subscribed but cancelled
- `past_due` - Payment failed, grace period

### Authentication Flow

**No separate auth pages:**
- `/signin` → redirects to `/dashboard`
- `/signup` → redirects to `/dashboard`
- All auth happens via modals

**Middleware:**
```typescript
// All routes are public
// Old auth pages redirect to dashboard
// No forced redirects for unauthenticated users
```

### Subscription Checks

**Hook:** `useSubscription()`
```typescript
const { isSubscribed, status, loading } = useSubscription();

// Returns:
// - isSubscribed: boolean (true if active & not expired)
// - status: 'free' | 'active' | 'cancelled' | 'past_due'
// - loading: boolean (checking status)
```

**Protected Features:**
- Create lesson (`/create-lesson`)
- Generate podcasts (`/podcasts`)
- Any other premium features

**Implementation:**
```typescript
const handleSubmit = () => {
  if (!isSubscribed) {
    setShowSubscriptionModal(true);
    return;
  }
  // Proceed with feature
};
```

## 💳 Whop Integration

### Setup Required

1. **Create products on Whop:**
   - Monthly plan (~$19/month)
   - Yearly plan (~$190/year, save $38)

2. **Get checkout links:**
   - Update in `/src/components/modals/SubscriptionModal.tsx`
   - Replace placeholder links with actual Whop checkout URLs

3. **Set up webhooks:**
   - Whop webhook → Your API endpoint
   - Update user `subscription_status` on payment
   - Set `subscription_expires_at` 
   - Store `whop_user_id` for management

### Webhook Endpoint (To Implement)

```typescript
// /api/webhooks/whop
POST /api/webhooks/whop
{
  event: 'payment.succeeded',
  user_id: 'whop_user_id',
  subscription_id: 'sub_xxx',
  plan: 'monthly' | 'yearly'
}

→ Update Supabase users table
→ Set subscription_status = 'active'
→ Set subscription_expires_at
```

## 📋 Component Structure

### Modals

1. **SignUpModal** (`/components/modals/SignUpModal.tsx`)
   - Shows on dashboard if not authenticated
   - Email/password + Google OAuth
   - Toggle between sign-in/sign-up
   - Auto-closes on successful auth

2. **SubscriptionModal** (`/components/modals/SubscriptionModal.tsx`)
   - Shows when unsubscribed users try premium features
   - Displays pricing plans
   - Opens Whop checkout
   - Configurable `feature` prop for messaging

### Pages with Subscription Checks

1. **Dashboard** (`/components/pages/Dashboard.tsx`)
   - Shows SignUpModal if not authenticated
   - "Start Learning" button checks subscription
   - Shows SubscriptionModal if not subscribed

2. **CreateLesson** (`/components/pages/CreateLesson.tsx`)
   - Form submit checks subscription
   - Shows SubscriptionModal if not subscribed
   - Only blocks submission, not form filling

3. **Future: Podcasts, Advanced Features**
   - Add same subscription check pattern
   - Use `useSubscription()` hook
   - Show SubscriptionModal on access attempt

## 🎨 UX Benefits

### ✅ Advantages of This Flow

1. **Lower Friction**
   - No landing page barrier
   - Users see actual product immediately
   - Sign-up modal is non-intrusive

2. **Higher Conversion**
   - Users invest time filling forms
   - Paywall appears at high-intent moment
   - Already committed to action

3. **Better Retention**
   - Users understand value before paying
   - Can explore interface on free tier
   - Clearer value proposition

4. **Simpler Codebase**
   - No separate landing page
   - Modal-based, less routing
   - Centralized subscription logic

## 🚧 Next Steps

### Required for Launch

- [ ] Set up Whop products
- [ ] Get checkout links and update modal
- [ ] Implement webhook endpoint for payment confirmation
- [ ] Test full subscription flow
- [ ] Add subscription management (cancel, upgrade, etc.)

### Optional Enhancements

- [ ] Trial period (7 days free)
- [ ] Usage limits on free tier (e.g., 3 lessons max)
- [ ] Email notifications for expiring subscriptions
- [ ] Subscription status in sidebar profile
- [ ] Admin dashboard for subscription management
- [ ] Referral program integration

## 🧪 Testing

### Test Scenarios

1. **Unauthenticated User:**
   - Visit `/dashboard`
   - See signup modal
   - Close modal → can still see dashboard
   - Click "Start Learning" → reopens signup modal

2. **Authenticated Free User:**
   - Sign up
   - Modal closes
   - Fill out lesson form completely
   - Click "Start Learning Session"
   - See subscription modal
   - Click plan → opens Whop

3. **Authenticated Subscribed User:**
   - Sign in with subscribed account
   - No modal on dashboard
   - Fill out lesson form
   - Click "Start Learning Session"
   - Proceeds directly to lesson (no modal)

## 📝 Files Modified

- `/src/lib/supabase/middleware.ts` - Removed auth redirects
- `/src/app/page.tsx` - Redirect to dashboard
- `/src/components/pages/Dashboard.tsx` - SignUp & Subscription modals
- `/src/components/pages/CreateLesson.tsx` - Subscription check
- `/src/components/modals/SignUpModal.tsx` - New modal component
- `/src/components/modals/SubscriptionModal.tsx` - New modal component
- `/src/lib/hooks/useSubscription.ts` - Subscription status hook
- Database migration: Added subscription fields to users table

## 🎯 Conversion Funnel Metrics to Track

1. **Sign-up Rate:** Visitors → Sign-ups
2. **Feature Attempt Rate:** Sign-ups → Try to create lesson
3. **Conversion Rate:** Feature attempts → Subscriptions
4. **Retention Rate:** Subscriptions active after 30 days

---

**Ready to launch the freemium conversion funnel!** 🚀

