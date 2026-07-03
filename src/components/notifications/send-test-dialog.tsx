"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { triggerNotification } from "@/actions/notifications";
import { notificationChannelValues, notificationEventValues } from "@/lib/validations/notifications";

export function SendTestDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [channel, setChannel] = React.useState<(typeof notificationChannelValues)[number]>("WHATSAPP");
  const [event, setEvent] = React.useState<(typeof notificationEventValues)[number]>("ORDER_READY");
  const [recipient, setRecipient] = React.useState("");
  const [dataJson, setDataJson] = React.useState('{\n  "customerName": "Jane Doe",\n  "orderRef": "INV-000001",\n  "storeName": "Kintsu Bridal Couture"\n}');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit() {
    let data: Record<string, string | number> = {};
    try {
      data = JSON.parse(dataJson || "{}");
    } catch {
      toast.error("Data must be valid JSON");
      return;
    }
    if (!recipient.trim()) {
      toast.error("Recipient is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await triggerNotification({ channel, event, recipient, data });
      if (result.success) {
        toast.success("Notification sent (see log below)");
      } else {
        toast.error(result.error ?? "Notification failed");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send notification");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send /> Send test notification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send test notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationChannelValues.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event</Label>
              <Select value={event} onValueChange={(v) => setEvent(v as typeof event)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationEventValues.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Recipient (phone/email)</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Template data (JSON)</Label>
            <Textarea
              rows={5}
              className="font-mono text-xs"
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
