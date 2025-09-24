import { getAvailablePlayersYahoo } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

// Display available free agents in the league with optional position filtering
export async function getAvailablePlayersCommand({ 
  from, 
  accessToken, 
  leagueKey, 
  position 
}: { 
  from: string; 
  accessToken: string; 
  leagueKey: string; 
  position?: string; 
}) {
  try {
    const players = await getAvailablePlayersYahoo(accessToken, leagueKey, position);
    
    if (!players || players.length === 0) {
      const positionText = position ? ` at ${position}` : "";
      await sendWhatsApp(from, `No available free agents found${positionText} in your league.`);
      return;
    }
    
    // Format and display top 10 available players
    const positionText = position ? ` (${position})` : "";
    let msg = `🟢 *Available Players to Add${positionText}*\n`;
    
    players.slice(0, 10).forEach((player: any, idx: number) => {
      const playerName = player.name?.full || player.name || "Unknown Player";
      const playerPosition = player.display_position || "N/A";
      const team = player.editorial_team_abbr || "";
      msg += `\n${idx + 1}. ${playerName} (${playerPosition}${team ? ` - ${team}` : ""})`;
    });
    
    msg += `\n\nReply 'add [player name]' to add a player.`;
    await sendWhatsApp(from, msg);
    
  } catch (error) {
    console.error("Get available players error:", error);
    await sendWhatsApp(from, "❌ Failed to get available players. Please try again.");
  }
}
