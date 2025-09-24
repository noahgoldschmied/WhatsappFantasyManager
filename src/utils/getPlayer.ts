import { getPlayerByName } from "../services/yahoo";
import { getUserChosenLeague } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

// Player lookup utility - searches for player by name and optionally sends WhatsApp response
// Returns player object with player_key for API calls, or null if not found
export async function getPlayerInfoByName({ accessToken, leagueKey, playerName, from }: {
  accessToken: string;
  leagueKey?: string;  // Optional - will use user's chosen league if not provided
  playerName: string;
  from?: string;       // Optional - if provided, sends WhatsApp responses
}) {
  // Determine which league to search in
  let league = leagueKey;
  if (!league && from) {
    league = getUserChosenLeague(from);
  }
  
  if (!league) {
    if (from) await sendWhatsApp(from, "❌ No league selected. Please choose a league first.");
    return null;
  }
  
  try {
    // Search for player in the specified league
    const player = await getPlayerByName({ accessToken, leagueKey: league, playerName });
    
    if (!player) {
      if (from) await sendWhatsApp(from, `❌ No player found for name: ${playerName}`);
      return null;
    }
    
    // Optionally send success response to user
    if (from) await sendWhatsApp(from, `Player key for ${playerName}: ${player.player_key}`);
    return player;
    
  } catch (error) {
    console.error("[getPlayerInfoByName] Error:", error);
    if (from) await sendWhatsApp(from, "❌ Failed to retrieve player key.");
    return null;
  }
}
