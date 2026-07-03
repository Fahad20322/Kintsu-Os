import { listNotificationLog } from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SendTestDialog } from "@/components/notifications/send-test-dialog";

export default async function NotificationsPage() {
  const logs = await listNotificationLog();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp, SMS and email activity for order/bridal/alteration/stock alerts. No
            provider is configured yet, so sends run through a console/dev adapter that
            always logs here — plug in real credentials in Settings later.
          </p>
        </div>
        <SendTestDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline">{log.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.event.replace("_", " ")}</TableCell>
                  <TableCell>{log.recipient}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {log.body}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === "SENT" ? "success" : log.status === "FAILED" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(log.createdAt).toLocaleString("en-IN")}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No notifications sent yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
