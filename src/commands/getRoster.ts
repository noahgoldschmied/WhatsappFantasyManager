import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

export async function getRosterCommand({
  from,
  accessToken,
  teamKey,
}: {
  from: string;
  accessToken: string;
  teamKey: string;
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

      for (let i = 0; i < count; i++) {
        const p = playersObj[i].player;

        const name = p.find((item: any) => item?.name)?.name?.full || "?";
        const pos = p.find((item: any) => item?.display_position)?.display_position || "";
        const nflTeam = p.find((item: any) => item?.editorial_team_abbr)?.editorial_team_abbr || "";

        players.push(`${name} (${pos}${nflTeam ? " - " + nflTeam : ""})`);
      }
    } catch (e) {
      console.error("Roster parse error:", e);
      players = [
        "⚠️ Could not parse roster data. Raw: " +
          JSON.stringify(rosterData, null, 2).slice(0, 1000),
      ];
    }

    let msg = `📋 *Roster for team:* ${teamKey}\n\n`;
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
