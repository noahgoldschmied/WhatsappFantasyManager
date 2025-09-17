import { sendWhatsApp } from "../services/twilio";

export async function authRequiredCommand({ from }: { from: string }) {
  await sendWhatsApp(from, `❌ You need to link your Yahoo Fantasy account first!
      
Send "link" to get started.`);
}
