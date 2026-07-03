import type {
  NotificationAdapter,
  NotificationSendInput,
  NotificationSendResult,
} from "../types";

/**
 * Real SMTP email adapter (shape matches nodemailer, the standard choice for
 * Node SMTP). Drop-in once EMAIL_SMTP_HOST / EMAIL_SMTP_PORT /
 * EMAIL_SMTP_USER / EMAIL_SMTP_PASSWORD / EMAIL_FROM are provisioned (see
 * .env.example). No SMTP credentials exist in this environment, so the
 * actual send is left commented out and `nodemailer` is not installed as a
 * dependency yet — add it when wiring this up for real.
 */
export class EmailAdapter implements NotificationAdapter {
  private readonly host: string;
  private readonly port: string;
  private readonly user: string;
  private readonly password: string;
  private readonly from: string;

  constructor() {
    const host = process.env.EMAIL_SMTP_HOST;
    const port = process.env.EMAIL_SMTP_PORT;
    const user = process.env.EMAIL_SMTP_USER;
    const password = process.env.EMAIL_SMTP_PASSWORD;
    const from = process.env.EMAIL_FROM;
    if (!host || !port || !user || !password || !from) {
      throw new Error(
        "Email adapter not configured — set EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, " +
          "EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD and EMAIL_FROM"
      );
    }
    this.host = host;
    this.port = port;
    this.user = user;
    this.password = password;
    this.from = from;
  }

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    try {
      // TODO: uncomment when EMAIL_SMTP_* is provisioned (requires `npm install nodemailer`).
      //
      // import nodemailer from "nodemailer";
      // const transport = nodemailer.createTransport({
      //   host: this.host,
      //   port: Number(this.port),
      //   secure: Number(this.port) === 465,
      //   auth: { user: this.user, pass: this.password },
      // });
      // await transport.sendMail({
      //   from: this.from,
      //   to: input.recipient,
      //   subject: input.subject ?? "Notification from Kintsu OS",
      //   text: input.body,
      // });
      // return { success: true };

      throw new Error(
        "Email adapter is configured but no real SMTP call is wired up yet — " +
          "this is a Tier-3 module without a live integration in this environment."
      );
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown email send error",
      };
    }
  }
}
