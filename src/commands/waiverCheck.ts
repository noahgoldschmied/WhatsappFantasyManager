import { isPlayerOnWaivers, getPlayerByName } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

/**
 * WAIVER CLAIM UTILITIES
 * Handles checking player waiver status and preparing waiver claim information
 */

// Check if a player is on waivers and return their status information
export async function checkAndPromptWaiverClaim({ from, accessToken, leagueKey, playerName }: {
  from: string;
  accessToken: string;
  leagueKey: string;
  playerName: string;
}) {
  // Look up the player to get their Yahoo player key
  const playerInfo = await getPlayerByName({ accessToken, leagueKey, playerName });
  if (!playerInfo?.player_key) {
    return { found: false };
  }
  
  // Check if the player is currently on waivers (requires waiver claim vs direct add)
  const isWaiver = await isPlayerOnWaivers({ accessToken, leagueKey, playerKey: playerInfo.player_key });
  
  return { 
    found: true, 
    isWaiver, 
    playerKey: playerInfo.player_key 
  };
}
