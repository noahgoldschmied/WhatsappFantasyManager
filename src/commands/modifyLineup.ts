import { sendWhatsApp } from "../services/twilio";
import { getUserChosenTeam, getUserChosenLeague } from "../services/userStorage";
import { modifyLineup } from "../services/yahoo";
import { getPlayerInfoByName } from "../utils/getPlayer";

/**
 * LINEUP MODIFICATION COMMAND
 * Handles starting/benching players in Yahoo Fantasy lineups with natural language parsing
 * Supports commands like "start Patrick Mahomes at QB week 3" or "bench Ezekiel Elliott week 3"
 */

export async function modifyLineupCommand({ from, body, userData }: {
  from: string;
  body: string;
  userData: any;
}) {
  // Validate required authentication and team selection
  const accessToken = userData?.accessToken;
  const teamKey = getUserChosenTeam(from);
  const leagueKey = getUserChosenLeague(from);
  
  if (!accessToken) {
    await sendWhatsApp(from, "❌ Access token is missing.");
    return false;
  }
  if (!teamKey) {
    await sendWhatsApp(from, "❌ No team selected. Please choose a team first.");
    return false;
  }
  if (!leagueKey) {
    await sendWhatsApp(from, "❌ No league selected. Please choose a league first.");
    return false;
  }
  // Parse natural language command using regex pattern matching
  // Supports: "start Patrick Mahomes at QB week 3" or "bench Ezekiel Elliott week 3"
  const match = body.match(/^(start|bench)\s+([\w\s'.-]+?)(?:\s+at\s+(\w+))?\s+week\s+(\d+)/i);
  if (!match) {
    await sendWhatsApp(from, "Please specify your move, e.g. 'start Patrick Mahomes at QB week 3' or 'bench Ezekiel Elliott week 3'.");
    return false;
  }
  
  // Extract command components from regex groups
  const action = match[1].toLowerCase();           // "start" or "bench"
  const playerName = match[2].trim();              // Player full name
  let position = match[3] ? match[3].trim().toUpperCase() : undefined;  // Position code
  const week = match[4];                           // Week number
  
  // Convert common position aliases to Yahoo Fantasy position codes
  if (position && position.replace(/[^A-Z]/gi, '').toUpperCase() === 'FLEX') {
    position = 'W/R/T';  // Yahoo's flex position code
  }
  
  // Validate command parameters
  if (!position && action === "start") {
    await sendWhatsApp(from, "Please specify a position, e.g. 'start Patrick Mahomes at QB week 3'.");
    return false;
  }
  if (action !== "start" && action !== "bench") {
    await sendWhatsApp(from, "Only 'start' or 'bench' actions are supported.");
    return false;
  }
  // Look up player information to get Yahoo player key
  const player = await getPlayerInfoByName({ accessToken, leagueKey, playerName });
  if (!player || !player.player_key) {
    await sendWhatsApp(from, `❌ Could not find player key for ${playerName}`);
    return false;
  }
  
  // Construct player move object for Yahoo API
  // "start" action uses specified position, "bench" action uses "BN" (bench position)
  const playerMoves = [{
    playerKey: player.player_key,
    position: action === "start" ? (position as string) : "BN",
  }];
  
  // Submit lineup modification to Yahoo Fantasy API
  try {
    await modifyLineup({ accessToken, teamKey, playerMoves, week });
    
    const actionText = action === "start" ? "Started" : "Benched";
    const positionText = playerMoves[0].position;
    await sendWhatsApp(from, `✅ ${actionText} ${playerName} at ${positionText} for week ${week}`);
    return true;
  } catch (error) {
    console.error("[modifyLineupCommand] Error:", error);
    await sendWhatsApp(from, "❌ Failed to update lineup.");
    return false;
  }
}
