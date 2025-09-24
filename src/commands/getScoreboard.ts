import { getScoreboardYahoo } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getUserChosenTeam, getUserChosenLeague } from "../services/userStorage";

// Display user's matchup with scores and projections for current or specified week
export async function getScoreboardCommand({ from, accessToken, week }: { from: string, accessToken: string, week?: number }) {
  const teamKey = getUserChosenTeam(from);
  const leagueKey = getUserChosenLeague(from);
  
  if (!teamKey || !leagueKey) {
    await sendWhatsApp(from, "Please choose a team first.");
    return;
  }

  let data;
  try {
    // Fetch scoreboard data from Yahoo API
    data = await getScoreboardYahoo({ accessToken, leagueKey, week });
    console.log("[getScoreboard] Raw parsed data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[getScoreboard] Error fetching scoreboard:", err);
    await sendWhatsApp(from, "Could not fetch scoreboard.");
    return;
  }
  // Find the user's specific matchup from all league matchups
  const matchups = data.fantasy_content.league.scoreboard.matchups.matchup;
  console.log("[getScoreboard] matchups:", JSON.stringify(matchups, null, 2));
  const matchupArr = Array.isArray(matchups) ? matchups : [matchups];
  
  let userMatchup;
  for (const m of matchupArr) {
    const teams = Array.isArray(m.teams.team) ? m.teams.team : [m.teams.team];
    console.log("[getScoreboard] Checking matchup teams:", JSON.stringify(teams, null, 2));
    
    // Check if user's team is in this matchup
    if (teams.some((t: any) => t.team_key === teamKey)) {
      userMatchup = m;
      break;
    }
  }
  
  if (!userMatchup) {
    console.warn("[getScoreboard] Could not find matchup for teamKey:", teamKey);
    await sendWhatsApp(from, "Could not find your matchup.");
    return;
  }
  // Extract and format matchup information
  const teams = Array.isArray(userMatchup.teams.team) ? userMatchup.teams.team : [userMatchup.teams.team];
  const [teamA, teamB] = teams;
  
  // Identify which team is the user's and which is the opponent
  const userTeam = teamA.team_key === teamKey ? teamA : teamB;
  const oppTeam = teamA.team_key === teamKey ? teamB : teamA;
  console.log(`[getScoreboard] userTeam: ${userTeam.name}, oppTeam: ${oppTeam.name}`);
  
  // Determine if there's a winner (only show if game is completed with actual points)
  let winnerText = "";
  const hasWinner = userMatchup.winner_team_key && 
                   Number(userTeam.team_points.total) > 0 && 
                   Number(oppTeam.team_points.total) > 0;
  
  if (hasWinner) {
    winnerText = `\nWinner: ${userMatchup.winner_team_key === teamKey ? 'You!' : oppTeam.name}`;
  }
  
  // Format the matchup display with scores and projections
  const reply = `Your matchup:\n${userTeam.name}: ${userTeam.team_points.total} pts (proj: ${userTeam.team_projected_points.total})\nvs\n${oppTeam.name}: ${oppTeam.team_points.total} pts (proj: ${oppTeam.team_projected_points.total})${winnerText}`;
  
  await sendWhatsApp(from, reply);
}
