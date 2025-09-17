import { sendWhatsApp } from "../services/twilio";

export async function dropPlayerCommand({ from, player }: { from: string; player: string }) {
  await sendWhatsApp(from, `⚠️ You asked to drop *${player}*.
      
This would remove them from your roster permanently. Reply *YES* to confirm or anything else to cancel.`);
}
