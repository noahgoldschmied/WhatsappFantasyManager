import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getUserTeamsDict, getLeagueDict } from "../services/userStorage";

/**
 * ROSTER DISPLAY COMMAND
 * Fetches and displays a team's current roster with player positions and team affiliations
 */

// Display the complete roster for a given team with formatted player information
export async function getRosterCommand({
  from,
  accessToken,
  teamKey
}: {
  from: string;
  accessToken: string;
  teamKey: string;
}) {
  console.log(`[getRosterCommand] from=${from} teamKey=${teamKey}`);

  // Resolve team name for user-friendly display
  // Try league dictionary first, then user teams dictionary, fallback to team key
  const leagueDict = getLeagueDict(from);
  let teamName: string | undefined = undefined;
  
  if (leagueDict) {
    teamName = Object.keys(leagueDict).find(name => leagueDict[name] === teamKey);
  }
  
  if (!teamName) {
    const userTeams = getUserTeamsDict(from);
    if (userTeams) {
      teamName = Object.keys(userTeams).find(key => userTeams[key] === teamKey);
    }
  }
  
  if (!teamName) {
    teamName = teamKey;
  }

  try {
    // Fetch roster data from Yahoo Fantasy API
    const rosterData = await getTeamRoster(teamKey, accessToken);
    let players: string[] = [];

    try {
      // Parse Yahoo API response structure: fantasy_content.team.roster.players
      const roster = rosterData.fantasy_content.team.roster;
      const count = roster.players.count || 0;

      // Handle both single player and array of players from Yahoo API
      const playerArr = Array.isArray(roster.players.player)
        ? roster.players.player
        : [roster.players.player];

      // Format each player with name, position, and NFL team
      for (let i = 0; i < count; i++) {
        const playerData = playerArr[i];
        const name = playerData.name.full || "Unknown Player";
        const position = playerData.selected_position.position || "N/A";
        const team = playerData.editorial_team_full_name || "Unknown Team";
        players.push(`• ${name} - ${position} ${team ? `(${team})` : ""}`);
      }
    } catch (e) {
      // If roster parsing fails, provide debug information
      console.error("Roster parse error:", e);
      players = [
        "⚠️ Could not parse roster data. Raw: " +
          JSON.stringify(rosterData, null, 2).slice(0, 1000),
      ];
    }

    // Format and send the roster display message
    let msg = `📋 *Roster for team:* ${teamName ?? teamKey}\n\n`;
    msg += players.length ? players.join("\n") : "No players found.";
    await sendWhatsApp(from, msg);
  } catch (error) {
    console.error("Get roster error:", error);
    await sendWhatsApp(
      from,
      "❌ Failed to get roster. Make sure your team key is correct. Use 'show teams' to see your team keys."
    );
  }
}
