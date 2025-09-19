import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getUserTeamsDict } from "../services/userStorage";

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

  const userTeams = getUserTeamsDict(from);
  const teamName = userTeams ? getKeyByValue(userTeams, teamKey) : undefined;


  try {
    const rosterData = await getTeamRoster(teamKey, accessToken);
    let players: string[] = [];

    try {
      const roster = rosterData.fantasy_content.team.roster
      const count = roster.players.count || 0;

      for (let i = 0; i < count; i++) {
        const playerData = roster.players.player[i];
        const name = playerData.name.full || "Unknown Player";
        const position = playerData.selected_position.position || "N/A";
        const team = playerData.editorial_team_full_name || "Unknown Team";
        players.push(`• ${name} - ${position} ${team ? `(${team})` : ""}`);
      }
    } catch (e) {
      console.error("Roster parse error:", e);
      players = [
        "⚠️ Could not parse roster data. Raw: " +
          JSON.stringify(rosterData, null, 2).slice(0, 1000),
      ];
    }

    let msg = `📋 *Roster for team:* ${teamName ?? "Unknown"}\n\n`;
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

function getKeyByValue(dict: Record<string, string>, value: string): string | undefined {
  return Object.keys(dict).find(key => dict[key] === value);
}
