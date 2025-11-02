"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Zap, Loader2 } from "lucide-react";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function SubscriptionModal({ open, onOpenChange, feature = "this feature" }: SubscriptionModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // Stripe Price IDs - Set these in your .env.local as NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY and NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY
  const plans = [
    {
      name: "Monthly",
      price: "$19",
      period: "month",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || "", // Set in .env.local
      planType: "monthly",
      features: [
        "Unlimited AI lessons",
        "All AI professor voices",
        "Custom lesson creation",
        "Generate podcasts",
        "Save & replay sessions",
        "Priority support",
      ],
      popular: false,
    },
    {
      name: "Yearly",
      price: "$190",
      period: "year",
      savings: "Save $38",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || "", // Set in .env.local
      planType: "yearly",
      features: [
        "Everything in Monthly",
        "2 months free",
        "Early access to features",
        "Advanced AI models",
        "Custom voice training",
        "API access",
      ],
      popular: true,
    },
  ];

  const handleSubscribe = async (priceId: string, planType: string) => {
    setLoading(planType);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId, planType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      alert(error.message || "Failed to start checkout. Please try again.");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">
          Subscribe to unlock {feature}
        </DialogTitle>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue to-pink mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-3">
            Unlock {feature}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get unlimited access to AI-powered learning with personalized professors and interactive lessons
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-8 bg-card border-2 rounded-2xl transition-all ${
                plan.popular
                  ? "border-blue shadow-lg shadow-blue/20"
                  : "border-border hover:border-blue/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-blue text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                {plan.savings && (
                  <p className="text-green text-sm font-medium mt-2">{plan.savings}</p>
                )}
              </div>

              <Button
                onClick={() => handleSubscribe(plan.priceId, plan.planType)}
                disabled={loading !== null}
                className={`w-full rounded-xl py-6 text-base font-semibold mb-6 ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                    : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                }`}
              >
                {loading === plan.planType ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Secure payment processing by Stripe
          </p>
          <p className="text-xs text-muted-foreground">
            Cancel anytime • No hidden fees • 7-day money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

