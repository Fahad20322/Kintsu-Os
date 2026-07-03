import type {
  NotificationAdapter,
  NotificationSendInput,
  NotificationSendResult,
} from "../types";

/**
 * Real SMS gateway adapter (generic — shape matches most REST SMS gateways,
 * e.g. MSG91/Twilio SMS). Drop-in once SMS_API_KEY and SMS_SENDER_ID are
 * provisioned (see .env.example). No SMS gateway account exists in this
 * environment, so the request is left commented out.
 */
export class SmsAdapter implements NotificationAdapter {
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor() {
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID;
    if (!apiKey || !senderId) {
      throw new Error("SMS adapter not configured — set SMS_API_KEY and SMS_SENDER_ID");
    }
    this.apiKey = apiKey;
    this.senderId = senderId;
  }

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    try {
      // TODO: uncomment when SMS_API_KEY is provisioned. Example shape for a
      // generic REST SMS gateway:
      //
      // const response = await fetch("https://api.sms-gateway.example/v1/send", {
      //   method: "POST",
      //   headers: {
      //     Authorization: `Bearer ${this.apiKey}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     sender_id: this.senderId,
      //     to: input.recipient,
      //     message: input.body,
      //   }),
      // });
      // if (!response.ok) {
      //   const detail = await response.text();
      //   return { success: false, error: `SMS gateway error ${response.status}: ${detail}` };
      // }
      // return { success: true };

      throw new Error(
        "SMS adapter is configured but no real API call is wired up yet — " +
          "this is a Tier-3 module without a live integration in this environment."
      );
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown SMS send error",
      };
    }
  }
}
