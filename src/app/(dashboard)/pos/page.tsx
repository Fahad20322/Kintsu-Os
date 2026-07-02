import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosTerminal } from "@/components/pos/pos-terminal";

export default function PosPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Scan items, apply discounts, and take split payments.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/pos/history">
            <History /> Sale history
          </Link>
        </Button>
      </div>
      <PosTerminal />
    </div>
  );
}
