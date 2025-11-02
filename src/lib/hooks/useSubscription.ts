"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SubscriptionStatus {
  status: "free" | "active" | "cancelled" | "past_due";
  isSubscribed: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>({
    status: "free",
    isSubscribed: false,
    loading: true,
  });

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setStatus({ status: "free", isSubscribed: false, loading: false });
          return;
        }

        // Get user's subscription status from database
        const { data: profile } = await supabase
          .from("users")
          .select("subscription_status, subscription_expires_at")
          .eq("id", user.id)
          .single();

        if (profile) {
          const subscriptionStatus = profile.subscription_status || "free";
          
          // Check if subscription has expired
          const isExpired = profile.subscription_expires_at
            ? new Date(profile.subscription_expires_at) < new Date()
            : false;

          const isSubscribed =
            subscriptionStatus === "active" && !isExpired;

          setStatus({
            status: subscriptionStatus,
            isSubscribed,
            loading: false,
          });
        } else {
          setStatus({ status: "free", isSubscribed: false, loading: false });
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setStatus({ status: "free", isSubscribed: false, loading: false });
      }
    };

    checkSubscription();
  }, []);

  return status;
}

