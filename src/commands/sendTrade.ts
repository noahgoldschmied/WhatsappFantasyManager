import { sendWhatsApp } from "../services/twilio";
import { getPlayerByName, postTradeYahoo } from "../services/yahoo";
import { getUserChosenTeam, getLeagueKeyFromTeamKey } from "../services/userStorage";

/**
 * TRADE PROPOSAL COMMAND
 * Handles sending trade proposals between fantasy teams through Yahoo Fantasy API
 */

// Send a trade proposal to another team with specified players
export async function sendTradeCommand({ from, accessToken, tradeeTeamKey, traderPlayers, tradeePlayers, tradeNote }: {
  from: string;
  accessToken: string;
  tradeeTeamKey: string;
  traderPlayers: string[]; // player names to send from user's team
  tradeePlayers: string[]; // player names to receive from other team
  tradeNote?: string;
}) {
  // Get the user's selected team key
  const traderTeamKey = getUserChosenTeam(from);
  if (!traderTeamKey) {
    await sendWhatsApp(from, "Please choose your team first.");
    return;
  }
  
  // Extract league key from team key for API calls
  const leagueKey = getLeagueKeyFromTeamKey(traderTeamKey);
  
  // Convert player names to Yahoo player keys for the user's players (to be sent)
  const traderPlayerKeys = [];
  for (const name of traderPlayers) {
    const info = await getPlayerByName({ accessToken, leagueKey, playerName: name });
    if (!info?.player_key) {
      await sendWhatsApp(from, `Could not find player: ${name}`);
      return;
    }
    traderPlayerKeys.push(info.player_key);
  }
  
  // Convert player names to Yahoo player keys for the other team's players (to be received)
  const tradeePlayerKeys = [];
  for (const name of tradeePlayers) {
    const info = await getPlayerByName({ accessToken, leagueKey, playerName: name });
    if (!info?.player_key) {
      await sendWhatsApp(from, `Could not find player: ${name}`);
      return;
    }
    tradeePlayerKeys.push(info.player_key);
  }
  
  // Submit the trade proposal to Yahoo Fantasy API
  try {
    await postTradeYahoo({
      accessToken,
      leagueKey,
      traderTeamKey,     // User's team (sending players)
      tradeeTeamKey,     // Other team (receiving user's players)
      traderPlayerKeys,  // Players being sent
      tradeePlayerKeys,  // Players being requested in return
      tradeNote,
    });
    
    await sendWhatsApp(from, "✅ Trade proposal sent!");
  } catch (err) {
    console.error("[sendTradeCommand] Error:", err);
    await sendWhatsApp(from, `❌ Trade failed: ${err}`);
  }
}
