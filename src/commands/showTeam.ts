// Placeholder for 'show team' command
import { sendWhatsApp } from "../services/twilio";

export async function showTeamCommand({ from }: { from: string }) {
  await sendWhatsApp(from, "🔍 Show team details feature coming soon!");
}
