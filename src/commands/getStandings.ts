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

    const teams = info.fantasy_content.league.standings.teams;
    if (!teams || teams.length === 0) {
        await sendWhatsApp(from, "❌ No teams found in league standings.");
        return;
    }

    let standings = "";
    const count = parseInt(teams.count) || 0;

    for (let i = 0; i < count; i++) {
      const team = teams[i];
      console.log("Team data:", team);
      standings += `Team: ${team.name}, Points: ${team.team_points.total}, Place: ${team.team_standings.rank}\n`;
    }

    await sendWhatsApp(from, `🏆 Here are your league standings:\n${standings}`);
  } catch (error) {
    console.error(`[getLeagueStandingsCommand] Error: ${error}`);
    await sendWhatsApp(from, "❌ Failed to retrieve league standings.");
  }
}