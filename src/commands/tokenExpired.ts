import { sendWhatsApp } from "../services/twilio";

export async function tokenExpiredCommand({ from }: { from: string }) {
  await sendWhatsApp(from, `❌ Your Yahoo login has expired. Please send "link" to reconnect.`);
}
