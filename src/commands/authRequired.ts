import { sendWhatsApp } from "../services/twilio";

/**
 * AUTHENTICATION REQUIRED HANDLER
 * Prompts users to authenticate with Yahoo Fantasy when they attempt protected actions
 */

export async function authRequiredCommand({ from }: { from: string }) {
  await sendWhatsApp(from, `❌ You need to link your Yahoo Fantasy account first!
      
Send "link" to get started.`);
}
