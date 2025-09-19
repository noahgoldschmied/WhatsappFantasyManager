import { sendWhatsApp } from "../services/twilio";
import { getUserChosenTeam, getUserChosenLeague } from "../services/userStorage";
import { modifyLineup } from "../services/yahoo";
import { getPlayerInfoByName } from "../utils/getPlayer";

// Modify Yahoo Fantasy lineup (change player positions or starters)
// Handles parsing, player lookup, and API call for lineup changes
export async function modifyLineupCommand({ from, body, userData }: {
  from: string;
  body: string;
  userData: any;
}) {
  const accessToken = userData?.accessToken;
  const teamKey = getUserChosenTeam(from);
  const leagueKey = getUserChosenLeague(from);
  if (!accessToken) {
    await sendWhatsApp(from, "❌ Access token is missing.");
    return;
  }
  if (!teamKey) {
    await sendWhatsApp(from, "❌ No team selected. Please choose a team first.");
    return;
  }
  if (!leagueKey) {
    await sendWhatsApp(from, "❌ No league selected. Please choose a league first.");
    return;
  }
  // Parse command: "start Patrick Mahomes at QB" or "bench Ezekiel Elliott"
  const match = body.match(/^(start|bench)\s+([\w\s'.-]+)(?:\s+at\s+(\w+))?/i);
  if (!match) {
    await sendWhatsApp(from, "Please specify your move, e.g. 'start Patrick Mahomes at QB' or 'bench Ezekiel Elliott'.");
    return;
  }
  const action = match[1].toLowerCase();
  const playerName = match[2].trim();
  const position = match[3] ? match[3].trim().toUpperCase() : undefined;
  if (!position && action === "start") {
    await sendWhatsApp(from, "Please specify a position, e.g. 'start Patrick Mahomes at QB'.");
    return;
  }
  if (action !== "start" && action !== "bench") {
    await sendWhatsApp(from, "Only 'start' or 'bench' actions are supported.");
    return;
  }
  // Look up player key
  const player = await getPlayerInfoByName({ accessToken, leagueKey, playerName });
  if (!player || !player.player_key) {
    await sendWhatsApp(from, `❌ Could not find player key for ${playerName}`);
    return;
  }
  // Build playerMoves for modifyLineup
  const playerMoves = [{
    playerKey: player.player_key,
    position: action === "start" ? (position as string) : "BN",
  }];
  try {
    await modifyLineup({ accessToken, teamKey, playerMoves });
    await sendWhatsApp(from, `✅ ${action === "start" ? "Started" : "Benched"} ${playerName} at ${playerMoves[0].position}`);
  } catch (error) {
    console.error("[modifyLineupCommand] Error:", error);
    await sendWhatsApp(from, "❌ Failed to update lineup.");
  }
}
