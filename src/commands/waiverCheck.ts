import { isPlayerOnWaivers } from "../services/yahoo";
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
    return { found: false };
  }
  const isWaiver = await isPlayerOnWaivers({ accessToken, leagueKey, playerKey: playerInfo.player_key });
  return { found: true, isWaiver, playerKey: playerInfo.player_key };
}
