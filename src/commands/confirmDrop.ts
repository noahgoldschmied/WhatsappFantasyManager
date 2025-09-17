import { sendWhatsApp } from "../services/twilio";

export async function confirmDropCommand({ from }: { from: string }) {
  await sendWhatsApp(from, "✅ Confirmed! (Drop functionality would execute here - coming soon!)");
}
