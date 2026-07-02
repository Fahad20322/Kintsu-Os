import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ForbiddenError,
  hasPermission,
  type Permission,
  type Role,
} from "@/lib/rbac";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session.user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  const role = user.role as Role;
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(permission);
  }
  return user;
}
