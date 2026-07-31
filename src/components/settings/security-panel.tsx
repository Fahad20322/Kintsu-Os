"use client";

import * as React from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Laptop, ShieldCheck, ShieldOff, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authClient, useSession } from "@/lib/auth-client";
import { listMySessions, revokeMySession, getMyLoginHistory } from "@/actions/security";

type SessionRow = Awaited<ReturnType<typeof listMySessions>>[number];
type LoginHistoryRow = Awaited<ReturnType<typeof getMyLoginHistory>>[number];

export function SecurityPanel() {
  const { data: session } = useSession();
  const twoFactorEnabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled
  );

  const [sessions, setSessions] = React.useState<SessionRow[]>([]);
  const [history, setHistory] = React.useState<LoginHistoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [setupOpen, setSetupOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [step, setStep] = React.useState<"password" | "scan" | "backup">("password");
  const [qrDataUrl, setQrDataUrl] = React.useState("");
  const [totpCode, setTotpCode] = React.useState("");
  const [backupCodes, setBackupCodes] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const [disableOpen, setDisableOpen] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([listMySessions(), getMyLoginHistory(20)]);
      setSessions(s);
      setHistory(h);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load security info");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch, not a render-time derivation
    refresh();
  }, [refresh]);

  async function startEnable() {
    setBusy(true);
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) throw new Error(error.message ?? "Could not verify password");
      const uri = data?.totpURI;
      if (uri) {
        setQrDataUrl(await QRCode.toDataURL(uri));
      }
      if (data?.backupCodes) setBackupCodes(data.backupCodes);
      setStep("scan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndFinish() {
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code: totpCode });
      if (error) throw new Error(error.message ?? "Invalid code");
      toast.success("Two-factor authentication enabled");
      setStep("backup");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  function closeSetup() {
    setSetupOpen(false);
    setStep("password");
    setPassword("");
    setTotpCode("");
    setQrDataUrl("");
    setBackupCodes([]);
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) throw new Error(error.message ?? "Could not disable 2FA");
      toast.success("Two-factor authentication disabled");
      setDisableOpen(false);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disable 2FA");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(token: string) {
    try {
      await revokeMySession(token);
      toast.success("Session revoked");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke session");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Require an authenticator app code (TOTP) in addition to your password when
            signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </Badge>
          {twoFactorEnabled ? (
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              <ShieldOff /> Disable 2FA
            </Button>
          ) : (
            <Button onClick={() => setSetupOpen(true)}>
              <ShieldCheck /> Enable 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Every device currently signed in to your account. Revoke any you don&apos;t
            recognize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP address</TableHead>
                <TableHead>Signed in</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="flex items-center gap-2">
                    <Laptop className="size-4 text-muted-foreground" />
                    <span className="truncate max-w-[280px]">{s.userAgent ?? "Unknown device"}</span>
                    {s.isCurrent && <Badge variant="outline">This device</Badge>}
                  </TableCell>
                  <TableCell>{s.ipAddress ?? "—"}</TableCell>
                  <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(s.token)}
                      disabled={s.isCurrent}
                    >
                      <LogOut className="size-4" /> Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No active sessions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login history</CardTitle>
          <CardDescription>Recent sign-ins and sign-outs on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>IP address</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.action === "LOGIN" ? "Signed in" : "Signed out"}</TableCell>
                  <TableCell>{h.ipAddress ?? "—"}</TableCell>
                  <TableCell className="truncate max-w-[280px]">{h.userAgent ?? "—"}</TableCell>
                  <TableCell>{new Date(h.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {!loading && history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No login history yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={setupOpen} onOpenChange={(open) => (open ? setSetupOpen(true) : closeSetup())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable two-factor authentication</DialogTitle>
            <DialogDescription>
              {step === "password" &&
                "Confirm your password to start setup."}
              {step === "scan" &&
                "Scan this QR code with an authenticator app (Google Authenticator, Authy, ...), then enter the 6-digit code it shows."}
              {step === "backup" &&
                "Save these backup codes somewhere safe. Each can be used once if you lose access to your authenticator app."}
            </DialogDescription>
          </DialogHeader>

          {step === "password" && (
            <div className="space-y-2">
              <Label htmlFor="2fa-password">Password</Label>
              <Input
                id="2fa-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {step === "scan" && (
            <div className="space-y-4">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="TOTP QR code" className="mx-auto size-48" />
              )}
              <div className="space-y-2">
                <Label htmlFor="totp-code">6-digit code</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === "backup" && (
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code) => (
                <div key={code} className="rounded border px-2 py-1">
                  {code}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {step === "password" && (
              <Button onClick={startEnable} disabled={busy || !password}>
                {busy ? "Verifying..." : "Continue"}
              </Button>
            )}
            {step === "scan" && (
              <Button onClick={verifyAndFinish} disabled={busy || totpCode.length !== 6}>
                {busy ? "Verifying..." : "Verify & enable"}
              </Button>
            )}
            {step === "backup" && (
              <Button
                onClick={() => {
                  closeSetup();
                  refresh();
                }}
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication?</DialogTitle>
            <DialogDescription>
              Confirm your password to turn off 2FA for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={busy || !password}>
              {busy ? "Disabling..." : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
