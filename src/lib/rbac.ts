export const ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "SALES_STAFF",
  "INVENTORY_MANAGER",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:view",
  "products:view",
  "products:manage",
  "inventory:view",
  "inventory:manage",
  "pos:use",
  "pos:discount_override",
  "pos:return",
  "pos:exchange",
  "customers:view",
  "customers:manage",
  "bridal:view",
  "bridal:manage",
  "alterations:view",
  "alterations:manage",
  "vendors:view",
  "vendors:manage",
  "purchases:view",
  "purchases:manage",
  "reports:view",
  "reports:export",
  "staff:view",
  "staff:manage",
  "loyalty:view",
  "loyalty:manage",
  "settings:view",
  "settings:manage",
  "assistant:use",
  "users:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    "dashboard:view",
    "products:view",
    "products:manage",
    "inventory:view",
    "inventory:manage",
    "pos:use",
    "pos:discount_override",
    "pos:return",
    "pos:exchange",
    "customers:view",
    "customers:manage",
    "bridal:view",
    "bridal:manage",
    "alterations:view",
    "alterations:manage",
    "vendors:view",
    "vendors:manage",
    "purchases:view",
    "purchases:manage",
    "reports:view",
    "reports:export",
    "staff:view",
    "staff:manage",
    "loyalty:view",
    "loyalty:manage",
    "settings:view",
    "assistant:use",
  ],
  INVENTORY_MANAGER: [
    "dashboard:view",
    "products:view",
    "products:manage",
    "inventory:view",
    "inventory:manage",
    "vendors:view",
    "vendors:manage",
    "purchases:view",
    "purchases:manage",
    "reports:view",
    "assistant:use",
  ],
  CASHIER: [
    "dashboard:view",
    "products:view",
    "inventory:view",
    "pos:use",
    "pos:return",
    "pos:exchange",
    "customers:view",
    "customers:manage",
    "loyalty:view",
    "assistant:use",
  ],
  SALES_STAFF: [
    "dashboard:view",
    "products:view",
    "pos:use",
    "customers:view",
    "customers:manage",
    "bridal:view",
    "bridal:manage",
    "loyalty:view",
    "assistant:use",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`Forbidden: missing permission "${permission}"`);
    this.name = "ForbiddenError";
  }
}
