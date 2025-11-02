"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PodcastRegenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  remainingGenerations?: number;
  monthlyLimit?: number;
}

export function PodcastRegenerateModal({
  open,
  onOpenChange,
  onConfirm,
  remainingGenerations = 10,
  monthlyLimit = 10,
}: PodcastRegenerateModalProps) {
  const handleConfirm = () => {
    // Close modal first, then trigger action
    onOpenChange(false);
    // Small delay to ensure modal closes before action starts
    setTimeout(() => onConfirm(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C4DFF] to-[#2F80ED] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Regenerate Podcast?</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2">
            This will replace your current podcast with a new one using the same
            settings. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-card/50 border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly Limit:</span>
            <span className="font-semibold text-foreground">
              {monthlyLimit} podcasts
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Remaining:</span>
            <span
              className={`font-semibold ${
                remainingGenerations <= 2
                  ? "text-red-500"
                  : remainingGenerations <= 5
                  ? "text-yellow-500"
                  : "text-green-500"
              }`}
            >
              {remainingGenerations} left
            </span>
          </div>
          {remainingGenerations <= 2 && (
            <div className="pt-2 mt-2 border-t border-border">
              <p className="text-xs text-yellow-500 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                You're running low on podcast generations this month!
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-[#7C4DFF] to-[#2F80ED] hover:from-[#6B3EEE] hover:to-[#2870DC] text-white"
            disabled={remainingGenerations <= 0}
          >
            {remainingGenerations <= 0 ? "Limit Reached" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


