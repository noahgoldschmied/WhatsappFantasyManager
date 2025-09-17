import { sendWhatsApp } from "../services/twilio";

export async function defaultResponseCommand({ from, body }: { from: string; body: string }) {
  await sendWhatsApp(from, `❓ I didn't understand "${body}". Send "help" to see available commands.`);
}
