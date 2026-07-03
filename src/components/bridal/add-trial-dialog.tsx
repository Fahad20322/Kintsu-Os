"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addBridalTrial } from "@/actions/bridal";

export function AddTrialDialog({ bridalOrderId }: { bridalOrderId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [trialDate, setTrialDate] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (!trialDate) {
      toast.error("Trial date is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await addBridalTrial(bridalOrderId, { trialDate, outcome });
      toast.success("Trial added");
      setOpen(false);
      setTrialDate("");
      setOutcome("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add trial");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> Add trial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add trial</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Trial date & time</Label>
            <Input
              type="datetime-local"
              value={trialDate}
              onChange={(e) => setTrialDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Outcome (optional)</Label>
            <Textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              placeholder="Minor adjustments needed at the waist"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add trial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
