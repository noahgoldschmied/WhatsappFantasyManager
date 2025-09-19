import { getLeagueStandings } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

export async function getLeagueStandingsCommand({ from, accessToken, leagueKey }: { from: string; accessToken: string | undefined; leagueKey: string }) {
  if (!accessToken) {
    await sendWhatsApp(from, "❌ Access token is missing.");
    return;
  }

  try {
    const info = await getLeagueStandings(accessToken, leagueKey);
    if (!info) {
      await sendWhatsApp(from, "❌ Could not fetch league standings.");
      return;
    }

    console.log("Full standings response:", JSON.stringify(info, null, 2));

    const league = info?.fantasy_content?.league;
    const standings = league?.standings;
    const teams = standings?.teams;
    if (!teams || (!Array.isArray(teams) && typeof teams !== 'object')) {
      await sendWhatsApp(from, "❌ No teams found in league standings.");
      return;
    }

    let standingsText = "";
    const count = parseInt(teams.count) || 0;

    // Yahoo API sometimes returns teams as an object with numeric keys
    for (let i = 0; i < count; i++) {
      const team = Array.isArray(teams) ? teams[i] : teams[i];
      if (!team) {
        console.log(`Team at index ${i} is undefined!`, team);
        continue;
      }
      const name = team?.name || team?.team?.name || "Unknown";
      const points = team?.team_points?.total || team?.team?.team_points?.total || "-";
      const rank = team?.team_standings?.rank || team?.team?.team_standings?.rank || "-";
      console.log("Team data:", team);
      standingsText += `Team: ${name}, Points: ${points}, Place: ${rank}\n`;
    }

    await sendWhatsApp(from, `🏆 Here are your league standings:\n${standingsText}`);
  } catch (error) {
    console.error(`[getLeagueStandingsCommand] Error:`, error);
    await sendWhatsApp(from, "❌ Failed to retrieve league standings.");
  }
}