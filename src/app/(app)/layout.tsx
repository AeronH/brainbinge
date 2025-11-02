"use client";

import { useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import { SignUpModal } from "@/components/modals/SignUpModal";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  return (
    <>
      <SignUpModal 
        open={showSignUpModal} 
        onOpenChange={setShowSignUpModal}
        initialMode="signin"
      />
      
      {isAuthLoading && <LoadingOverlay message="Loading..." />}
      
      <div className="min-h-screen bg-background flex">
        <AppSidebar 
          onSignInClick={() => setShowSignUpModal(true)}
          onAuthStateChange={(loading) => setIsAuthLoading(loading)}
        />
        <div className="flex-1 ml-[200px]">
          {children}
        </div>
      </div>
    </>
  );
}

