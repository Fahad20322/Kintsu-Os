"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddWarehouseDialog } from "@/components/inventory/add-warehouse-dialog";

const ALL_WAREHOUSES = "all";

export function InventoryFilters({
  warehouses,
  search,
  warehouseId,
  lowStockOnly,
}: {
  warehouses: { id: string; name: string }[];
  search?: string;
  warehouseId?: string;
  lowStockOnly?: boolean;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = React.useState(search ?? "");

  function navigate(overrides: {
    search?: string;
    warehouseId?: string;
    lowStockOnly?: boolean;
  }) {
    const nextSearch = overrides.search ?? search ?? "";
    const nextWarehouseId = overrides.warehouseId ?? warehouseId ?? "";
    const nextLowStockOnly = overrides.lowStockOnly ?? lowStockOnly ?? false;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextWarehouseId) params.set("warehouseId", nextWarehouseId);
    if (nextLowStockOnly) params.set("lowStockOnly", "1");

    const query = params.toString();
    router.push(`/inventory${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: searchValue });
        }}
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by product, article code or SKU"
            className="w-72 pl-8"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex items-center gap-1">
        <Select
          value={warehouseId || ALL_WAREHOUSES}
          onValueChange={(value) =>
            navigate({ warehouseId: value === ALL_WAREHOUSES ? "" : value })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_WAREHOUSES}>All warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddWarehouseDialog />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="low-stock-only"
          checked={lowStockOnly ?? false}
          onCheckedChange={(checked) => navigate({ lowStockOnly: checked })}
        />
        <Label htmlFor="low-stock-only">Low stock only</Label>
      </div>
    </div>
  );
}
