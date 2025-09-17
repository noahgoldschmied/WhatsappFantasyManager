import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

export async function getRosterCommand({ from, accessToken, teamKey }: { from: string; accessToken: string; teamKey: string }) {
  try {
    const rosterData = await getTeamRoster(teamKey, accessToken);
    let players = [];
    try {
      const team = rosterData.fantasy_content.team;
      const roster = team[1].roster;
      const playerArray = roster[0].players;
      for (const p of playerArray) {
        const player = p.player;
        const name = player[1].name?.full || player[1].name || "?";
        const pos = player[1].display_position || player[1].position_type || "";
        players.push(`${name} (${pos})`);
      }
    } catch (e) {
      players = ["Could not parse roster data. Raw: " + JSON.stringify(rosterData)];
    }
    let msg = `📋 *Roster for team:* ${teamKey}\n\n`;
    msg += players.length ? players.join("\n") : "No players found.";
    await sendWhatsApp(from, msg);
  } catch (error) {
    console.error("Get roster error:", error);
    await sendWhatsApp(from, "❌ Failed to get roster. Make sure your team key is correct. Use 'show teams' to see your team keys.");
  }
}
