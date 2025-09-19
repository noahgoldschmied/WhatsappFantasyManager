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
    if (!teams || !teams.team) {
      await sendWhatsApp(from, "❌ No teams found in league standings.");
      return;
    }

    let standingsText = "";
    const teamArray = Array.isArray(teams.team) ? teams.team : [teams.team];
    for (let i = 0; i < teamArray.length; i++) {
      const team = teamArray[i];
      if (!team) {
        console.log(`Team at index ${i} is undefined!`, team);
        continue;
      }
      const name = team.name || "Unknown";
      const rank = team.team_standings?.rank || "-";
      const wins = team.team_standings?.outcome_total?.wins || "-";
      const losses = team.team_standings?.outcome_total?.losses || "-";
      const ties = team.team_standings?.outcome_total?.ties || "0";
      const record = `${wins}-${losses}` + (ties !== "0" ? `-${ties}` : "");
      console.log("Team data:", team);
      standingsText += `Team: ${name}, Record: ${record}, Place: ${rank}\n`;
    }

    await sendWhatsApp(from, `🏆 Here are your league standings:\n${standingsText}`);
  } catch (error) {
    console.error(`[getLeagueStandingsCommand] Error:`, error);
    await sendWhatsApp(from, "❌ Failed to retrieve league standings.");
  }
}