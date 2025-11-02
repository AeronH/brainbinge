import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Create Supabase admin client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Stripe Webhook Handler
 * Handles subscription events from Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing Stripe signature or webhook secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("✅ Stripe webhook signature verified");
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log("Received Stripe webhook:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error("Missing customer or subscription ID in checkout session");
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  const email =
    typeof customer === "object" && !customer.deleted
      ? customer.email
      : session.customer_email;

  if (!email) {
    console.error("No email found for customer");
    return;
  }

  // Find user by email
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (!user) {
    console.error("User not found:", email);
    return;
  }

  // Update subscription status
  const expiresAt = new Date(subscription.current_period_end * 1000);

  await supabaseAdmin
    .from("users")
    .update({
      subscription_status: "active",
      subscription_id: subscriptionId,
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq("id", user.id);

  console.log(`✅ Updated subscription for ${email} to active`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  const email =
    typeof customer === "object" && !customer.deleted ? customer.email : null;

  if (!email) {
    console.error("No email found for customer");
    return;
  }

  // Find user by email
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!user) {
    console.error("User not found:", email);
    return;
  }

  const expiresAt = new Date(subscription.current_period_end * 1000);
  const status =
    subscription.status === "active" ? "active" : "cancelled";

  await supabaseAdmin
    .from("users")
    .update({
      subscription_status: status,
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq("id", user.id);

  console.log(`✅ Updated subscription for ${email} to ${status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const customer = await stripe.customers.retrieve(customerId);
  const email =
    typeof customer === "object" && !customer.deleted ? customer.email : null;

  if (!email) {
    console.error("No email found for customer");
    return;
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!user) {
    console.error("User not found:", email);
    return;
  }

  await supabaseAdmin
    .from("users")
    .update({
      subscription_status: "cancelled",
    })
    .eq("id", user.id);

  console.log(`✅ Cancelled subscription for ${email}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!customerId || !subscriptionId) {
    return;
  }

  const customer = await stripe.customers.retrieve(customerId);
  const email =
    typeof customer === "object" && !customer.deleted ? customer.email : null;

  if (!email) {
    return;
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!user) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const expiresAt = new Date(subscription.current_period_end * 1000);

  await supabaseAdmin
    .from("users")
    .update({
      subscription_status: "active",
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq("id", user.id);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  if (!customerId) {
    return;
  }

  const customer = await stripe.customers.retrieve(customerId);
  const email =
    typeof customer === "object" && !customer.deleted ? customer.email : null;

  if (!email) {
    return;
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (!user) {
    return;
  }

  await supabaseAdmin
    .from("users")
    .update({
      subscription_status: "past_due",
    })
    .eq("id", user.id);

  console.log(`⚠️ Payment failed for ${email}, set to past_due`);
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}



