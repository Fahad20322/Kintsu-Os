import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getBridalOrder } from "@/actions/bridal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTrialDialog } from "@/components/bridal/add-trial-dialog";
import { RecordPaymentDialog } from "@/components/bridal/record-payment-dialog";
import { StatusUpdateCard } from "@/components/bridal/status-update-card";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  SELECTION: "secondary",
  MEASUREMENT: "outline",
  STITCHING: "warning",
  EMBROIDERY: "warning",
  TRIAL: "default",
  READY: "default",
  DELIVERED: "success",
};

const MEASUREMENT_LABELS: Record<string, string> = {
  bust: "Bust",
  waist: "Waist",
  hips: "Hips",
  shoulder: "Shoulder",
  sleeveLength: "Sleeve length",
  blouseLength: "Blouse length",
};

export default async function BridalOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getBridalOrder(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{order.brideName}</h1>
            <Badge variant={STATUS_VARIANT[order.status] ?? "default"}>{order.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Wedding date: {order.weddingDate}
            {order.groomName ? ` · Groom: ${order.groomName}` : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/bridal">Back to bridal orders</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bride & groom</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Attr label="Bride's name" value={order.brideName} />
            <Attr label="Bride's mobile" value={order.brideMobile} />
            <Attr label="Groom's name" value={order.groomName} />
            <Attr label="Groom's mobile" value={order.groomMobile} />
            <Attr label="Wedding date" value={order.weddingDate} />
            <Attr
              label="Linked customer"
              value={order.customer ? `${order.customer.name} (${order.customer.mobile})` : "—"}
            />
          </CardContent>
        </Card>

        <StatusUpdateCard bridalOrderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outfit details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Attr label="Outfit description" value={order.outfitDescription} />
            <Attr label="Fabric" value={order.fabric} />
            <Attr label="Embroidery details" value={order.embroideryDetails} />
            <Attr label="Tailor assigned" value={order.tailor?.name} />
            <Attr label="Expected delivery date" value={order.deliveryDate} />
            <Attr label="Actual delivery date" value={order.actualDeliveryDate} />
            <Attr label="Notes" value={order.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measurements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => (
              <Attr
                key={key}
                label={label}
                value={(order.measurements as Record<string, string | undefined>)[key]}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Attr label="Total amount" value={`₹${Number(order.totalAmount).toLocaleString("en-IN")}`} />
          <Attr label="Advance paid" value={`₹${Number(order.advancePaid).toLocaleString("en-IN")}`} />
          <Attr
            label="Additional payments"
            value={`₹${order.paymentsTotal.toLocaleString("en-IN")}`}
          />
          <Attr
            label="Pending amount"
            value={`₹${order.pendingAmount.toLocaleString("en-IN")}`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payments</CardTitle>
            <RecordPaymentDialog bridalOrderId={order.id} />
          </CardHeader>
          <CardContent className="space-y-3">
            {order.payments.length === 0 && (
              <p className="text-sm text-muted-foreground">No additional payments recorded.</p>
            )}
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.method} · {format(new Date(p.createdAt), "d MMM yyyy")}
                  </p>
                </div>
                {p.note && <p className="max-w-40 truncate text-xs text-muted-foreground">{p.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Trials</CardTitle>
            <AddTrialDialog bridalOrderId={order.id} />
          </CardHeader>
          <CardContent className="space-y-3">
            {order.trials.length === 0 && (
              <p className="text-sm text-muted-foreground">No trials scheduled yet.</p>
            )}
            {order.trials.map((t) => (
              <div key={t.id} className="flex items-start justify-between border-b pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{format(new Date(t.trialDate), "d MMM yyyy, h:mm a")}</p>
                  {t.outcome && <p className="text-xs text-muted-foreground">{t.outcome}</p>}
                </div>
                {t.completed && <Badge variant="success">Completed</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 border-l pl-4">
            {order.timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[event.status] ?? "default"}>{event.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.createdAt), "d MMM yyyy, h:mm a")}
                  </span>
                </div>
                {event.note && <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>}
              </li>
            ))}
            {order.timeline.length === 0 && (
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
            )}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Attr({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
