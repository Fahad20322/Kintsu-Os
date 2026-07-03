import { Cake } from "lucide-react";
import {
  listCustomersByTier,
  listLoyaltyTiers,
  listUpcomingBirthdays,
} from "@/actions/loyalty";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TierFormDialog } from "@/components/loyalty/tier-form-dialog";
import { AdjustPointsDialog } from "@/components/loyalty/adjust-points-dialog";
import { TierSelect } from "@/components/loyalty/tier-select";

export default async function LoyaltyPage() {
  const [tiers, customers, birthdays] = await Promise.all([
    listLoyaltyTiers(),
    listCustomersByTier(),
    listUpcomingBirthdays(30),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Loyalty program</h1>
        <p className="text-sm text-muted-foreground">
          Tiers, points, and birthday offer candidates.
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="birthdays">Birthdays</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total spend</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.mobile}</p>
                      </TableCell>
                      <TableCell>₹{Number(c.totalSpend).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{c.loyaltyPoints}</TableCell>
                      <TableCell>
                        <TierSelect
                          customerId={c.id}
                          currentTierId={c.loyaltyTierId}
                          tiers={tiers}
                        />
                      </TableCell>
                      <TableCell>
                        {c.suggestedTierId && c.suggestedTierId !== c.loyaltyTierId ? (
                          <Badge variant="warning">{c.suggestedTierName}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AdjustPointsDialog customerId={c.id} customerName={c.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No customers yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Membership tiers</CardTitle>
              <TierFormDialog />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Min. spend</TableHead>
                    <TableHead>Points multiplier</TableHead>
                    <TableHead>Benefits</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>₹{Number(t.minSpend).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{t.pointsMultiplier}x</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.benefits ?? "—"}
                      </TableCell>
                      <TableCell>
                        <TierFormDialog tier={t} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {tiers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No tiers configured yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="birthdays">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming birthdays (next 30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {birthdays.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Cake className="size-4 text-primary" />
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.mobile}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {b.birthday && new Date(b.birthday).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Badge>
                  </div>
                ))}
                {birthdays.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">
                    No birthdays in the next 30 days
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
