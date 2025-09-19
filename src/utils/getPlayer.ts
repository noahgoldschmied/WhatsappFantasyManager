import { getPlayerByName } from "../services/yahoo";
import { getUserChosenLeague } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

// Utility to get player info by name (returns player object or null)
// Optionally, if 'from' is provided, will send WhatsApp reply with player key or error
export async function getPlayerInfoByName({ accessToken, leagueKey, playerName, from }: {
  accessToken: string;
  leagueKey?: string;
  playerName: string;
  from?: string;
}) {
  let league = leagueKey;
  if (!league && from) {
    league = getUserChosenLeague(from);
  }
  if (!league) {
    if (from) await sendWhatsApp(from, "❌ No league selected. Please choose a league first.");
    return null;
  }
  try {
    const player = await getPlayerByName({ accessToken, leagueKey: league, playerName });
    if (!player) {
      if (from) await sendWhatsApp(from, `❌ No player found for name: ${playerName}`);
      return null;
    }
    if (from) await sendWhatsApp(from, `Player key for ${playerName}: ${player.player_key}`);
    return player;
  } catch (error) {
    console.error("[getPlayerInfoByName] Error:", error);
    if (from) await sendWhatsApp(from, "❌ Failed to retrieve player key.");
    return null;
  }
}
