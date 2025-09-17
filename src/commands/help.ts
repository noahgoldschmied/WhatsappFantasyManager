import { sendWhatsApp } from "../services/twilio";

export async function helpCommand({ from }: { from: string }) {
  await sendWhatsApp(from, `🏈 *Fantasy Bot Commands:*
      
*Setup:*
• link - Link your Yahoo Fantasy account

*Team Info:*
• show teams - Show your fantasy teams
• get roster - Show your current roster

*Management:*
• drop [player name] - Drop a player

Send "help" anytime to see this menu!`);
}
