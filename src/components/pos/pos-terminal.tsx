"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Barcode, Plus, Trash2, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  findVariantByCode,
  searchCustomers,
  validateCoupon,
  checkout,
} from "@/actions/pos";
import { createCustomer } from "@/actions/customers";
import { paymentMethodValues } from "@/lib/validations/pos";

type CartLine = {
  variantId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  discountAmount: number;
};

type CustomerOption = {
  id: string;
  name: string;
  mobile: string;
  loyaltyPoints: number;
};

type PaymentLine = {
  method: (typeof paymentMethodValues)[number];
  amount: number;
  referenceNumber?: string;
  giftCardCode?: string;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function PosTerminal() {
  const router = useRouter();
  const [scanValue, setScanValue] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerResults, setCustomerResults] = React.useState<CustomerOption[]>([]);
  const [customer, setCustomer] = React.useState<CustomerOption | null>(null);
  const [showNewCustomer, setShowNewCustomer] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState("");
  const [newCustomerMobile, setNewCustomerMobile] = React.useState("");

  const [manualDiscount, setManualDiscount] = React.useState(0);
  const [couponCode, setCouponCode] = React.useState("");
  const [couponDiscount, setCouponDiscount] = React.useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = React.useState(0);

  const [payments, setPayments] = React.useState<PaymentLine[]>([
    { method: "CASH", amount: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const subtotal = round2(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  const itemDiscountTotal = round2(cart.reduce((s, i) => s + i.discountAmount, 0));
  const gstAmount = round2(
    cart.reduce((s, i) => {
      const taxable = i.unitPrice * i.quantity - i.discountAmount;
      return s + (taxable * i.gstRate) / 100;
    }, 0)
  );
  const loyaltyRedemptionValue = round2(loyaltyRedeem * 0.5);
  const totalAmount = Math.max(
    0,
    round2(
      subtotal - itemDiscountTotal - manualDiscount - couponDiscount - loyaltyRedemptionValue + gstAmount
    )
  );
  const paymentsEntered = round2(payments.reduce((s, p) => s + (p.amount || 0), 0));
  const balanceDue = round2(totalAmount - paymentsEntered);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanValue.trim()) return;
    try {
      const variant = await findVariantByCode(scanValue.trim());
      if (!variant) {
        toast.error("No product found for this barcode/SKU");
        return;
      }
      setCart((prev) => {
        const existing = prev.find((l) => l.variantId === variant.variantId);
        if (existing) {
          return prev.map((l) =>
            l.variantId === variant.variantId ? { ...l, quantity: l.quantity + 1 } : l
          );
        }
        return [
          ...prev,
          {
            variantId: variant.variantId,
            sku: variant.sku,
            productName: variant.productName,
            size: variant.size,
            color: variant.color,
            quantity: 1,
            unitPrice: variant.unitPrice,
            gstRate: variant.gstRate,
            discountAmount: 0,
          },
        ];
      });
      setScanValue("");
    } catch {
      toast.error("Could not look up product");
    }
  }

  function updateLine(variantId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)));
  }

  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  async function handleCustomerSearch(value: string) {
    setCustomerQuery(value);
    if (value.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const results = await searchCustomers(value);
    setCustomerResults(
      results.map((r) => ({
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        loyaltyPoints: r.loyaltyPoints,
      }))
    );
  }

  async function handleCreateCustomer() {
    if (!newCustomerName.trim() || !newCustomerMobile.trim()) {
      toast.error("Name and mobile are required");
      return;
    }
    try {
      const created = await createCustomer({
        name: newCustomerName,
        mobile: newCustomerMobile,
      });
      setCustomer({
        id: created.id,
        name: created.name,
        mobile: created.mobile,
        loyaltyPoints: created.loyaltyPoints,
      });
      setShowNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerMobile("");
      toast.success("Customer added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add customer");
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const result = await validateCoupon(couponCode.trim(), subtotal);
      setCouponDiscount(result.discount);
      toast.success(`Coupon applied: -₹${result.discount}`);
    } catch (err) {
      setCouponDiscount(0);
      toast.error(err instanceof Error ? err.message : "Invalid coupon");
    }
  }

  function addPaymentLine() {
    setPayments((prev) => [...prev, { method: "CASH", amount: round2(balanceDue) }]);
  }

  function updatePayment(index: number, patch: Partial<PaymentLine>) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (Math.abs(balanceDue) > 1) {
      toast.error(`Payments must total ₹${totalAmount.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await checkout({
        customerId: customer?.id,
        items: cart.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          gstRate: l.gstRate,
          discountAmount: l.discountAmount,
        })),
        discountAmount: manualDiscount,
        couponCode: couponDiscount > 0 ? couponCode.trim() : undefined,
        loyaltyPointsRedeemed: loyaltyRedeem,
        payments,
      });
      toast.success("Sale completed");
      router.push(`/pos/invoice/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleScan} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-8"
                  placeholder="Scan or type barcode / SKU, then press Enter"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((line) => {
                    const taxable = line.unitPrice * line.quantity - line.discountAmount;
                    const gst = round2((taxable * line.gstRate) / 100);
                    const total = round2(taxable + gst);
                    return (
                      <TableRow key={line.variantId}>
                        <TableCell>
                          <p className="font-medium">{line.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.sku} · {line.size}/{line.color}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="w-16"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.variantId, {
                                quantity: Math.max(1, Number(e.target.value)),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>₹{line.unitPrice.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            value={line.discountAmount}
                            onChange={(e) =>
                              updateLine(line.variantId, {
                                discountAmount: Math.max(0, Number(e.target.value)),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>₹{gst.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="font-medium">
                          ₹{total.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.variantId)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Scan a barcode to add items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((p, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select
                  value={p.method}
                  onValueChange={(v) =>
                    updatePayment(index, { method: v as PaymentLine["method"] })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodValues.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-32"
                  placeholder="Amount"
                  value={p.amount || ""}
                  onChange={(e) => updatePayment(index, { amount: Number(e.target.value) })}
                />
                {p.method === "GIFT_CARD" && (
                  <Input
                    placeholder="Gift card code"
                    className="w-40"
                    value={p.giftCardCode ?? ""}
                    onChange={(e) => updatePayment(index, { giftCardCode: e.target.value })}
                  />
                )}
                {(p.method === "CARD" || p.method === "UPI" || p.method === "BANK_TRANSFER") && (
                  <Input
                    placeholder="Reference no."
                    className="w-40"
                    value={p.referenceNumber ?? ""}
                    onChange={(e) => updatePayment(index, { referenceNumber: e.target.value })}
                  />
                )}
                {payments.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removePayment(index)}>
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPaymentLine}>
              <Plus /> Split payment
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer ? (
              <div className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                  <Badge variant="secondary" className="mt-1">
                    {customer.loyaltyPoints} pts
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCustomer(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : showNewCustomer ? (
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
                <Input
                  placeholder="Mobile"
                  value={newCustomerMobile}
                  onChange={(e) => setNewCustomerMobile(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateCustomer}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewCustomer(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search name or mobile"
                  value={customerQuery}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                />
                {customerResults.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        className="w-full rounded-md border p-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setCustomer(c);
                          setCustomerResults([]);
                          setCustomerQuery("");
                        }}
                      >
                        {c.name} · {c.mobile}
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowNewCustomer(true)}
                >
                  <UserPlus /> New customer
                </Button>
              </>
            )}

            {customer && customer.loyaltyPoints > 0 && (
              <div className="space-y-1 pt-2">
                <Label className="text-xs">Redeem loyalty points (max {customer.loyaltyPoints})</Label>
                <Input
                  type="number"
                  min={0}
                  max={customer.loyaltyPoints}
                  value={loyaltyRedeem}
                  onChange={(e) =>
                    setLoyaltyRedeem(
                      Math.min(customer.loyaltyPoints, Math.max(0, Number(e.target.value)))
                    )
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Manual discount (₹)</Label>
              <Input
                type="number"
                min={0}
                value={manualDiscount}
                onChange={(e) => setManualDiscount(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coupon code</Label>
              <div className="flex gap-2">
                <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <Button variant="outline" onClick={handleApplyCoupon}>
                  Apply
                </Button>
              </div>
              {couponDiscount > 0 && (
                <p className="text-xs text-success">Coupon discount: ₹{couponDiscount}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Subtotal" value={subtotal} />
            <Row label="Item discounts" value={-itemDiscountTotal} />
            <Row label="Manual discount" value={-manualDiscount} />
            <Row label="Coupon discount" value={-couponDiscount} />
            <Row label="Loyalty redemption" value={-loyaltyRedemptionValue} />
            <Row label="GST" value={gstAmount} />
            <div className="border-t pt-2">
              <Row label="Total due" value={totalAmount} bold />
            </div>
            <Row label="Entered" value={paymentsEntered} />
            <Row label="Balance" value={balanceDue} bold={Math.abs(balanceDue) > 0.5} />

            <Button
              className="mt-3 w-full"
              size="lg"
              disabled={isSubmitting || cart.length === 0}
              onClick={handleCheckout}
            >
              {isSubmitting ? "Processing..." : "Complete sale"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
    </div>
  );
}
