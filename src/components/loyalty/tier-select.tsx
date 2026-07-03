"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignCustomerTier } from "@/actions/loyalty";

export function TierSelect({
  customerId,
  currentTierId,
  tiers,
}: {
  customerId: string;
  currentTierId: string | null;
  tiers: { id: string; name: string }[];
}) {
  const router = useRouter();

  async function handleChange(value: string) {
    try {
      await assignCustomerTier(customerId, value === "none" ? null : value);
      toast.success("Tier updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update tier");
    }
  }

  return (
    <Select value={currentTierId ?? "none"} onValueChange={handleChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No tier</SelectItem>
        {tiers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
