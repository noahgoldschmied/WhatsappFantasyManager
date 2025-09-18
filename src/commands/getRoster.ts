import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { Player } from "../utils/player";

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
      const team = rosterData.fantasy_content.team;
      const roster = team[1].roster[0];
      const playersObj = roster.players;
      const count = playersObj.count;

      for (let i = 0; i < 1; i++) {
        const playerArr = playersObj[i]?.player;
        console.log("playerArr:", playerArr);
        
        if (!playerArr) continue;

  const player_data = new Player(playerArr);
  players.push(player_data.displayLabel());
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
