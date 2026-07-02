import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Shirt,
  Warehouse,
  Users,
  Gem,
  Scissors,
  Truck,
  ClipboardList,
  BarChart3,
  UserCog,
  Gift,
  Sparkles,
  Settings,
} from "lucide-react";
import type { Permission } from "@/lib/rbac";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
      { title: "POS Billing", href: "/pos", icon: ShoppingCart, permission: "pos:use" },
    ],
  },
  {
    label: "Catalog & Stock",
    items: [
      { title: "Products", href: "/products", icon: Shirt, permission: "products:view" },
      { title: "Inventory", href: "/inventory", icon: Warehouse, permission: "inventory:view" },
      { title: "Vendors", href: "/vendors", icon: Truck, permission: "vendors:view" },
      { title: "Purchases", href: "/purchases", icon: ClipboardList, permission: "purchases:view" },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Customers", href: "/customers", icon: Users, permission: "customers:view" },
      { title: "Bridal", href: "/bridal", icon: Gem, permission: "bridal:view" },
      { title: "Alterations", href: "/alterations", icon: Scissors, permission: "alterations:view" },
      { title: "Loyalty", href: "/loyalty", icon: Gift, permission: "loyalty:view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
      { title: "Staff", href: "/staff", icon: UserCog, permission: "staff:view" },
      { title: "Assistant", href: "/assistant", icon: Sparkles, permission: "assistant:use" },
      { title: "Settings", href: "/settings", icon: Settings, permission: "settings:view" },
    ],
  },
];
