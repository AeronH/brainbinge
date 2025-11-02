"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, CreditCard, ExternalLink, Calendar, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { SubscriptionModal } from "./SubscriptionModal";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  preferences: {
    voice?: string;
    tone?: string;
    theme?: string;
  } | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  const { status, isSubscribed, loading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    if (!open) return;

    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          setLoading(false);
          return;
        }

        // Get user profile from database
        const { data: profile, error } = await supabase
          .from("users")
          .select("id, email, created_at, preferences, subscription_status, subscription_expires_at")
          .eq("id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching user:", error);
          // Fallback to auth user data
          setUser({
            id: authUser.id,
            email: authUser.email || "",
            created_at: authUser.created_at || new Date().toISOString(),
            preferences: null,
            subscription_status: null,
            subscription_expires_at: null,
          });
        } else if (profile) {
          setUser(profile);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [open]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSubscriptionBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "cancelled":
        return "secondary";
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getSubscriptionStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "cancelled":
        return "Cancelled";
      case "past_due":
        return "Past Due";
      default:
        return "Free";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl bg-card border-border rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-3xl font-bold mb-6 text-foreground">
            Settings
          </DialogTitle>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">Please sign in to view settings</p>
            </div>
          ) : (
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 border border-border rounded-xl p-1 mb-6">
                <TabsTrigger 
                  value="account" 
                  className="rounded-lg data-[state=active]:bg-sidebar-accent data-[state=active]:text-foreground"
                >
                  <User className="w-4 h-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger 
                  value="billing" 
                  className="rounded-lg data-[state=active]:bg-sidebar-accent data-[state=active]:text-foreground"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="space-y-6">
                <Card className="p-6 bg-muted/20 border-border rounded-xl">
                  <h2 className="text-xl font-bold text-foreground mb-4">Account Information</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base font-medium text-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </Label>
                      <div className="p-3 bg-background rounded-lg border border-border">
                        <p className="text-foreground text-base">{user.email}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Email cannot be changed. Contact support if you need to update your email.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-base font-medium text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Account Created
                      </Label>
                      <p className="text-foreground text-base">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/20 border-border rounded-xl">
                  <h2 className="text-xl font-bold text-foreground mb-4">Preferences</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Customize your default learning preferences. These will be used when creating new lessons.
                  </p>
                  <div className="p-4 bg-background rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground">
                      Preferences coming soon. You can customize voice, tone, and theme settings for each lesson.
                    </p>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Card className="p-6 bg-muted/20 border-border rounded-xl">
                  <h2 className="text-xl font-bold text-foreground mb-4">Subscription Status</h2>
                  
                  {subscriptionLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-12 bg-muted rounded-lg"></div>
                      <div className="h-8 bg-muted rounded-lg w-1/2"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-bold text-foreground">
                                {isSubscribed ? "Premium" : "Free"}
                              </p>
                              <Badge variant={getSubscriptionBadgeVariant(status)}>
                                {getSubscriptionStatusLabel(status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isSubscribed && user.subscription_expires_at && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label className="text-base font-medium text-foreground flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Subscription Expires
                            </Label>
                            <p className="text-foreground text-base">
                              {formatDate(user.subscription_expires_at)}
                            </p>
                            {new Date(user.subscription_expires_at) < new Date() && (
                              <p className="text-sm text-destructive">
                                Your subscription has expired. Renew to continue accessing premium features.
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="flex gap-3">
                        {!isSubscribed ? (
                          <Button
                            onClick={() => {
                              onOpenChange(false);
                              setShowSubscriptionModal(true);
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Upgrade to Premium
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => {
                              window.open("https://whop.com", "_blank");
                            }}
                            className="flex items-center gap-2"
                          >
                            Manage Subscription
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="p-6 bg-muted/20 border-border rounded-xl">
                  <h2 className="text-xl font-bold text-foreground mb-4">Billing History</h2>
                  <div className="p-4 bg-background rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground">
                      Billing history will appear here once you have an active subscription.
                    </p>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature="premium features"
      />
    </>
  );
}



