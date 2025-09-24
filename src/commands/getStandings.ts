import { getLeagueStandings } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

// Display league standings with team rankings and win/loss records
export async function getLeagueStandingsCommand({ from, accessToken, leagueKey }: { from: string; accessToken: string | undefined; leagueKey: string }) {
  if (!accessToken) {
    await sendWhatsApp(from, "❌ Access token is missing.");
    return;
  }

  try {
    // Fetch standings data from Yahoo API
    const info = await getLeagueStandings(accessToken, leagueKey);
    if (!info) {
      await sendWhatsApp(from, "❌ Could not fetch league standings.");
      return;
    }

    console.log("Full standings response:", JSON.stringify(info, null, 2));

    // Parse the nested standings structure from Yahoo's response
    const league = info?.fantasy_content?.league;
    const standings = league?.standings;
    const teams = standings?.teams;
    
    if (!teams || !teams.team) {
      await sendWhatsApp(from, "❌ No teams found in league standings.");
      return;
    }

    // Build formatted standings text
    let standingsText = "";
    const teamArray = Array.isArray(teams.team) ? teams.team : [teams.team];
    
    for (let i = 0; i < teamArray.length; i++) {
      const team = teamArray[i];
      if (!team) {
        console.log(`Team at index ${i} is undefined!`, team);
        continue;
      }
      
      // Extract team information and standings data
      const name = team.name || "Unknown";
      const rank = team.team_standings?.rank || "-";
      const wins = team.team_standings?.outcome_totals?.wins || "-";
      const losses = team.team_standings?.outcome_totals?.losses || "-";
      const ties = team.team_standings?.outcome_totals?.ties || "0";
      
      // Format win-loss record (include ties if any)
      const record = `${wins}-${losses}` + (ties !== "0" ? `-${ties}` : "");
      console.log("Team data:", team);
      standingsText += `${rank}. ${name} - Record: ${record}\n`;
    }

    await sendWhatsApp(from, `🏆 Here are your league standings:\n${standingsText}`);
  } catch (error) {
    console.error(`[getLeagueStandingsCommand] Error:`, error);
    await sendWhatsApp(from, "❌ Failed to retrieve league standings.");
  }
}