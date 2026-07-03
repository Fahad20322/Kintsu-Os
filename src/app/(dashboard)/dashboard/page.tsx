import Link from "next/link";
import {
  IndianRupee,
  ShoppingBag,
  Users,
  PackageX,
  AlertTriangle,
  Scissors,
  Gem,
  TrendingUp,
} from "lucide-react";
import { getDashboardStats } from "@/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of today&apos;s store performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(stats.todaySales.total)}
          hint={`${stats.todaySales.count} orders`}
          icon={IndianRupee}
        />
        <StatCard
          label="Monthly Sales"
          value={formatCurrency(stats.monthSales.total)}
          hint={`${stats.monthSales.count} orders`}
          icon={TrendingUp}
        />
        <StatCard
          label="Monthly Profit"
          value={formatCurrency(stats.monthProfit)}
          hint={`Revenue ${formatCurrency(stats.monthRevenue)}`}
          icon={ShoppingBag}
          tone="success"
        />
        <StatCard
          label="Customers"
          value={stats.customerCount.toLocaleString("en-IN")}
          icon={Users}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats.lowStockCount.toString()}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStockCount.toString()}
          icon={PackageX}
          tone="destructive"
        />
        <StatCard
          label="Pending Alterations"
          value={stats.pendingAlterations.toString()}
          icon={Scissors}
        />
        <StatCard
          label="Active Bridal Orders"
          value={stats.activeBridalOrders.toString()}
          icon={Gem}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store performance — last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={stats.chartData} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Best selling products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Units sold</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.bestSellers.map((b) => (
                  <TableRow key={b.articleCode}>
                    <TableCell>
                      <p className="font-medium">{b.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{b.articleCode}</p>
                    </TableCell>
                    <TableCell>{b.totalQuantity}</TableCell>
                    <TableCell>{formatCurrency(b.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
                {stats.bestSellers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No sales yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/pos/invoice/${s.id}`} className="font-medium hover:underline">
                        {s.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{s.customerName ?? "Walk-in"}</TableCell>
                    <TableCell>{formatCurrency(Number(s.totalAmount))}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "COMPLETED" ? "success" : "warning"}>
                        {s.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.recentSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No sales yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
