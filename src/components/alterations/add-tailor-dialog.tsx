"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTailor } from "@/actions/tailors";

type Tailor = { id: string; name: string; mobile: string | null; specialization: string | null };

export function AddTailorDialog({ onCreated }: { onCreated: (tailor: Tailor) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [specialization, setSpecialization] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Tailor name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createTailor({
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        specialization: specialization.trim() || undefined,
      });
      onCreated(created);
      toast.success("Tailor added");
      setName("");
      setMobile("");
      setSpecialization("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add tailor");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="shrink-0">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add tailor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Kumar" />
          </div>
          <div className="space-y-2">
            <Label>Mobile</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" />
          </div>
          <div className="space-y-2">
            <Label>Specialization</Label>
            <Input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Blouse fitting, hemming"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add tailor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
