import { getTeamRoster } from "../services/yahoo";
import { Player } from "../utils/playerParser";
import { sendWhatsApp } from "../services/twilio";

export async function getRosterCommand({
  from,
  accessToken,
  teamKey,
  teamName,
}: {
  from: string;
  accessToken: string;
  teamKey: string;
  teamName: string;
}) {
  console.log(`[getRosterCommand] from=${from} teamKey=${teamKey}`);

  try {
    const rosterData = await getTeamRoster(teamKey, accessToken);
    let players: string[] = [];

    try {
      const team = rosterData[0].roster[0];
      console.log("Team data:", JSON.stringify(team, null, 2));
      const roster = team.roster;
      const playersObj = roster.players;
      const count = playersObj.count;

      for (let i = 0; i < count; i++) {
        const playerArr = playersObj[i]?.player;
        
        if (!playerArr) continue;

      const player_data = new Player(playerArr);
      players.push(`• ${player_data.name} - ${player_data.position} (${player_data.nflTeam})`);
      }
    } catch (e) {
      console.error("Roster parse error:", e);
      players = [
        "⚠️ Could not parse roster data. Raw: " +
          JSON.stringify(rosterData, null, 2).slice(0, 1000),
      ];
    }

    let msg = `📋 *Roster for team:* ${teamName}\n\n`;
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
