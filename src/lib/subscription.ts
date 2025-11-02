import { createClient } from "@/lib/supabase/server";

/**
 * Server-side subscription check for API routes
 * Use this in API endpoints that require an active subscription
 */
export async function checkSubscription(userId: string): Promise<{
  isSubscribed: boolean;
  status: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("users")
      .select("subscription_status, subscription_expires_at")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return {
        isSubscribed: false,
        status: "free",
        error: "User profile not found",
      };
    }

    const subscriptionStatus = profile.subscription_status || "free";

    // Check if subscription has expired
    const isExpired = profile.subscription_expires_at
      ? new Date(profile.subscription_expires_at) < new Date()
      : false;

    const isSubscribed = subscriptionStatus === "active" && !isExpired;

    return {
      isSubscribed,
      status: subscriptionStatus,
    };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return {
      isSubscribed: false,
      status: "free",
      error: "Failed to check subscription",
    };
  }
}

/**
 * Update user subscription status (called by Whop webhook)
 */
export async function updateSubscription({
  userId,
  subscriptionId,
  status,
  expiresAt,
  whopUserId,
}: {
  userId: string;
  subscriptionId: string;
  status: "active" | "cancelled" | "past_due";
  expiresAt?: Date;
  whopUserId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("users")
      .update({
        subscription_status: status,
        subscription_id: subscriptionId,
        subscription_expires_at: expiresAt?.toISOString(),
        whop_user_id: whopUserId,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating subscription:", error);
    return { success: false, error: "Failed to update subscription" };
  }
}

/**
 * Middleware helper for API routes
 * Usage:
 * 
 * export async function POST(request: Request) {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   
 *   if (!user) {
 *     return Response.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *   
 *   const { isSubscribed } = await requireSubscription(user.id);
 *   if (!isSubscribed) {
 *     return Response.json({ error: "Subscription required" }, { status: 403 });
 *   }
 *   
 *   // Proceed with API logic
 * }
 */
export async function requireSubscription(userId: string) {
  return await checkSubscription(userId);
}

