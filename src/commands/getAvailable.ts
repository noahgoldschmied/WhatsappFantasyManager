import { getAvailablePlayersYahoo } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

export async function getAvailablePlayersCommand({ from, accessToken, leagueKey, position }: { from: string; accessToken: string; leagueKey: string; position?: string }) {
  const players = await getAvailablePlayersYahoo(accessToken, leagueKey, position);
  if (!players || players.length === 0) {
    await sendWhatsApp(from, "No available free agents found in your league.");
    return;
  }
  // Show top 10 free agents
  let msg = `🟢 *Available Players to Add*\n`;
  players.slice(0, 10).forEach((p: any, idx: number) => {
    msg += `\n${idx + 1}. ${p.name?.full || p.name} (${p.display_position || ""})`;
  });
  msg += `\n\nReply 'add [player name]' to add a player.`;
  await sendWhatsApp(from, msg);
}
