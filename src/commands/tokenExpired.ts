import { sendWhatsApp } from "../services/twilio";

/**
 * TOKEN EXPIRATION HANDLER
 * Notifies users when their Yahoo Fantasy OAuth token has expired
 */

export async function tokenExpiredCommand({ from }: { from: string }) {
  await sendWhatsApp(from, `❌ Your Yahoo login has expired. Please send "link" to reconnect.`);
}
