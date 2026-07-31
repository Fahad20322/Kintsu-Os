import { betterAuth } from "better-auth";
import { twoFactor, emailOTP } from "better-auth/plugins";
import { createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "SALES_STAFF",
        input: false,
      },
      storeId: {
        type: "string",
        required: false,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    // TOTP-based two-factor authentication (authenticator app + backup
    // codes). See src/components/settings/security-panel.tsx for the
    // enable/verify UI.
    twoFactor({ issuer: "Kintsu OS" }),
    // Passwordless one-time-code login, delivered through the existing
    // notification pipeline (real email adapter if EMAIL_SMTP_* is set,
    // console/dev adapter otherwise — see src/lib/notifications/).
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        await sendNotification({
          channel: "EMAIL",
          event: "SECURITY_CODE",
          recipient: email,
          data: { code: otp, expiresInMinutes: 5, purpose: type },
        });
      },
    }),
  ],
  hooks: {
    // Persistent login/logout audit trail (audit_log survives session
    // expiry/deletion, unlike the session table itself — see
    // src/lib/audit.ts and the "Login History" panel in Settings).
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-out") {
        const session = await getSessionFromCtx(ctx).catch(() => null);
        if (session?.user?.id) {
          await logAudit({
            userId: session.user.id,
            storeId: (session.user as { storeId?: string | null }).storeId ?? null,
            action: "LOGOUT",
            entityType: "user",
            entityId: session.user.id,
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const loginPaths = new Set([
        "/sign-in/email",
        "/sign-in/email-otp",
        "/two-factor/verify-totp",
        "/two-factor/verify-otp",
        "/two-factor/verify-backup-code",
      ]);
      if (!loginPaths.has(ctx.path)) return;

      const returned = ctx.context.returned as
        | { user?: { id: string; storeId?: string | null } }
        | undefined;
      if (returned?.user?.id) {
        await logAudit({
          userId: returned.user.id,
          storeId: returned.user.storeId ?? null,
          action: "LOGIN",
          entityType: "user",
          entityId: returned.user.id,
          metadata: { via: ctx.path },
        });
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
