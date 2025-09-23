import { isPlayerOnWaivers } from "../services/yahooTransactions";
import { getPlayerByName } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

// Check if a player is on waivers and prompt for claim
export async function checkAndPromptWaiverClaim({ from, accessToken, leagueKey, playerName }: {
  from: string;
  accessToken: string;
  leagueKey: string;
  playerName: string;
}) {
  const playerInfo = await getPlayerByName({ accessToken, leagueKey, playerName });
  if (!playerInfo?.player_key) {
    await sendWhatsApp(from, `Could not find player: ${playerName}`);
    return;
  }
  const isWaiver = await isPlayerOnWaivers({ accessToken, leagueKey, playerKey: playerInfo.player_key });
  if (isWaiver) {
    await sendWhatsApp(from, `${playerName} is currently on waivers. Would you like to put in a claim? Reply 'yes' to claim or 'no' to cancel.`);
    // You can set a state here to handle the user's reply for claim
  } else {
    await sendWhatsApp(from, `${playerName} is not on waivers and can be added directly.`);
  }
}
