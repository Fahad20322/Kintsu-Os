import type {
  NotificationAdapter,
  NotificationSendInput,
  NotificationSendResult,
} from "../types";

/**
 * The dev/default adapter. This is genuinely what runs when no real
 * provider credentials are configured — it does not simulate failure paths,
 * it always "succeeds", because its entire job is to make the notification
 * pipeline (template render -> adapter.send -> notificationLog row)
 * exercisable end-to-end without any third-party account.
 *
 * It intentionally prints a clearly-labeled line to the server console so
 * it's never mistaken for a real delivery in logs.
 */
export class ConsoleAdapter implements NotificationAdapter {
  constructor(private readonly channel: string) {}

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    console.log(
      `[DEV NOTIFICATION ADAPTER] channel=${this.channel} recipient=${input.recipient}` +
        (input.subject ? ` subject=${JSON.stringify(input.subject)}` : "") +
        ` body=${JSON.stringify(input.body)}`
    );
    return { success: true };
  }
}
