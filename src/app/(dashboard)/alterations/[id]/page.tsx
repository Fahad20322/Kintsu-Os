import { notFound } from "next/navigation";
import { getAlteration } from "@/actions/alterations";
import { listTailors } from "@/actions/tailors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdateStatusDialog } from "@/components/alterations/update-status-dialog";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  RECEIVED: "secondary",
  ASSIGNED: "outline",
  IN_PROGRESS: "warning",
  READY: "default",
  DELIVERED: "success",
};

export default async function AlterationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [alterationData, tailors] = await Promise.all([getAlteration(id), listTailors()]);
  if (!alterationData) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{alterationData.jobNumber}</h1>
            <Badge variant={STATUS_VARIANT[alterationData.status] ?? "default"}>
              {alterationData.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Received {new Date(alterationData.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <UpdateStatusDialog
          alterationId={alterationData.id}
          currentStatus={alterationData.status}
          currentTailorId={alterationData.tailorId}
          tailors={tailors}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Attr label="Item description" value={alterationData.itemDescription} />
            <Attr label="Alteration details" value={alterationData.alterationDetails} />
            <div className="grid grid-cols-2 gap-4">
              <Attr
                label="Charge"
                value={`₹${Number(alterationData.charge).toLocaleString("en-IN")}`}
              />
              <Attr
                label="Expected delivery"
                value={alterationData.expectedDeliveryDate ?? "—"}
              />
              <Attr
                label="Actual delivery"
                value={alterationData.actualDeliveryDate ?? "—"}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {alterationData.customer ? (
                <>
                  <p className="font-medium">{alterationData.customer.name}</p>
                  <p className="text-muted-foreground">{alterationData.customer.mobile}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No customer linked</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tailor</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {alterationData.tailor ? (
                <>
                  <p className="font-medium">{alterationData.tailor.name}</p>
                  <p className="text-muted-foreground">{alterationData.tailor.mobile ?? "—"}</p>
                  {alterationData.tailor.specialization && (
                    <p className="text-muted-foreground">{alterationData.tailor.specialization}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Not yet assigned</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 border-l pl-4">
            {alterationData.statusHistory.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[h.status] ?? "default"}>
                    {h.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                {h.note && <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>}
              </li>
            ))}
            {alterationData.statusHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">No status history yet.</p>
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
