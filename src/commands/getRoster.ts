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
    console.log(`[getRosterCommand] Fetching roster for teamKey=${teamKey}`);
    const rosterData = await getTeamRoster(teamKey, accessToken);

    let players: string[] = [];

    try {
      const team = rosterData.fantasy_content.team;
      const roster = team[1].roster[0]; // Yahoo weird nesting
      const playersObj = roster.players;
      const count = playersObj.count;

      for (let i = 0; i < count; i++) {
        const player = playersObj[i].player;
        const details = player[0] && player[1] ? player[1] : player[0];

        const name = details?.name?.full || "?";
        const pos =
          details?.display_position ||
          details?.primary_position ||
          details?.position_type ||
          "";

        players.push(`${name} (${pos})`);
      }
    } catch (e) {
      console.error("Roster parse error:", e);
      players = [
        "⚠️ Could not parse roster data. Raw: " +
          JSON.stringify(rosterData, null, 2),
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
