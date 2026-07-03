import type {
  NotificationAdapter,
  NotificationSendInput,
  NotificationSendResult,
} from "../types";

/**
 * Real WhatsApp Cloud API adapter — drop-in once WHATSAPP_API_KEY and
 * WHATSAPP_PHONE_ID are provisioned (see .env.example). This repo does not
 * hold a WhatsApp Business account, so the actual fetch call is left
 * commented out; `getAdapter()` in ../index.ts only constructs this class
 * when both env vars are present, and if it's constructed without them this
 * throws loudly rather than silently doing nothing.
 */
export class WhatsAppAdapter implements NotificationAdapter {
  private readonly apiKey: string;
  private readonly phoneId: string;

  constructor() {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!apiKey || !phoneId) {
      throw new Error(
        "WhatsApp adapter not configured — set WHATSAPP_API_KEY and WHATSAPP_PHONE_ID"
      );
    }
    this.apiKey = apiKey;
    this.phoneId = phoneId;
  }

  async send(_input: NotificationSendInput): Promise<NotificationSendResult> {
    try {
      // TODO: uncomment when WHATSAPP_API_KEY is provisioned.
      // WhatsApp Cloud API shape (https://developers.facebook.com/docs/whatsapp/cloud-api):
      //
      // const response = await fetch(
      //   `https://graph.facebook.com/v19.0/${this.phoneId}/messages`,
      //   {
      //     method: "POST",
      //     headers: {
      //       Authorization: `Bearer ${this.apiKey}`,
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       messaging_product: "whatsapp",
      //       to: input.recipient,
      //       type: "text",
      //       text: { body: input.body },
      //     }),
      //   }
      // );
      // if (!response.ok) {
      //   const detail = await response.text();
      //   return { success: false, error: `WhatsApp API error ${response.status}: ${detail}` };
      // }
      // return { success: true };

      throw new Error(
        "WhatsApp adapter is configured but no real API call is wired up yet — " +
          "this is a Tier-3 module without a live integration in this environment."
      );
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown WhatsApp send error",
      };
    }
  }
}
