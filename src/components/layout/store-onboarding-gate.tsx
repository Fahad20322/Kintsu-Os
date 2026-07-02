"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { completeStoreOnboarding } from "@/actions/onboarding";

export function StoreOnboardingGate() {
  const router = useRouter();
  const [storeName, setStoreName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setIsSubmitting(true);
    try {
      await completeStoreOnboarding({ storeName });
      router.refresh();
    } catch {
      toast.error("Could not finish store setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Finish setting up your store</CardTitle>
          <CardDescription>
            Your account isn&apos;t linked to a store yet. Name your store to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Setting up..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
