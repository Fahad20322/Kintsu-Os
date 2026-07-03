"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bridalOutfitStatusValues } from "@/lib/validations/bridal";
import { updateBridalStatus } from "@/actions/bridal";

export function StatusUpdateCard({
  bridalOrderId,
  currentStatus,
}: {
  bridalOrderId: string;
  currentStatus: (typeof bridalOutfitStatusValues)[number];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(currentStatus);
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleUpdate() {
    setIsSubmitting(true);
    try {
      await updateBridalStatus(bridalOrderId, status, note || undefined);
      toast.success("Status updated");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update stage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as (typeof bridalOutfitStatusValues)[number])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bridalOutfitStatusValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Note (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Fabric cut and handed to tailor"
          />
        </div>
        <Button
          onClick={handleUpdate}
          disabled={isSubmitting || (status === currentStatus && !note)}
          className="w-full"
        >
          {isSubmitting ? "Updating..." : "Move to this stage"}
        </Button>
      </CardContent>
    </Card>
  );
}
