import { sendWhatsApp } from "../services/twilio";
import { getPlayerByName } from "../services/yahoo";
import { getUserChosenTeam, getLeagueKeyFromTeamKey } from "../services/userStorage";
import { postTradeYahoo } from "../services/yahoo";

export async function sendTradeCommand({ from, accessToken, tradeeTeamKey, traderPlayers, tradeePlayers, tradeNote }: {
  from: string;
  accessToken: string;
  tradeeTeamKey: string;
  traderPlayers: string[]; // player names to send
  tradeePlayers: string[]; // player names to receive
  tradeNote?: string;
}) {
  const traderTeamKey = getUserChosenTeam(from);
  if (!traderTeamKey) {
    await sendWhatsApp(from, "Please choose your team first.");
    return;
  }
  const leagueKey = getLeagueKeyFromTeamKey(traderTeamKey);
  // Lookup player keys
  const traderPlayerKeys = [];
  for (const name of traderPlayers) {
    const info = await getPlayerByName({ accessToken, leagueKey, playerName: name });
    if (!info?.player_key) {
      await sendWhatsApp(from, `Could not find player: ${name}`);
      return;
    }
    traderPlayerKeys.push(info.player_key);
  }
  const tradeePlayerKeys = [];
  for (const name of tradeePlayers) {
    const info = await getPlayerByName({ accessToken, leagueKey, playerName: name });
    if (!info?.player_key) {
      await sendWhatsApp(from, `Could not find player: ${name}`);
      return;
    }
    tradeePlayerKeys.push(info.player_key);
  }
  // Call Yahoo API to post trade
  try {
    await postTradeYahoo({
      accessToken,
      leagueKey,
      traderTeamKey,
      tradeeTeamKey,
      traderPlayerKeys,
      tradeePlayerKeys,
      tradeNote,
    });
    await sendWhatsApp(from, "✅ Trade proposal sent!");
  } catch (err) {
    await sendWhatsApp(from, `❌ Trade failed: ${err}`);
  }
}
