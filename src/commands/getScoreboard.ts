import { getScoreboardYahoo } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getUserChosenTeam, getUserChosenLeague } from "../services/userStorage";

export async function getScoreboardCommand({ from, accessToken, week }: { from: string, accessToken: string, week?: number }) {
	const teamKey = getUserChosenTeam(from);
	const leagueKey = getUserChosenLeague(from);
	if (!teamKey || !leagueKey) {
		await sendWhatsApp(from, "Please choose a team first.");
		return;
	}
	let data;
	try {
		data = await getScoreboardYahoo({ accessToken, leagueKey, week });
		console.log("[getScoreboard] Raw parsed data:", JSON.stringify(data, null, 2));
	} catch (err) {
		console.error("[getScoreboard] Error fetching scoreboard:", err);
		await sendWhatsApp(from, "Could not fetch scoreboard.");
		return;
	}
	// Find user's matchup
	const matchups = data.fantasy_content.league.scoreboard.matchups.matchup;
	console.log("[getScoreboard] matchups:", JSON.stringify(matchups, null, 2));
	const matchupArr = Array.isArray(matchups) ? matchups : [matchups];
	let userMatchup;
	for (const m of matchupArr) {
		const teams = Array.isArray(m.teams.team) ? m.teams.team : [m.teams.team];
		console.log("[getScoreboard] Checking matchup teams:", JSON.stringify(teams, null, 2));
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
	// Format reply
	const teams = Array.isArray(userMatchup.teams.team) ? userMatchup.teams.team : [userMatchup.teams.team];
	const [teamA, teamB] = teams;
	const userTeam = teamA.team_key === teamKey ? teamA : teamB;
	const oppTeam = teamA.team_key === teamKey ? teamB : teamA;
	console.log(`[getScoreboard] userTeam: ${userTeam.name}, oppTeam: ${oppTeam.name}`);
	let winnerText = "";
	// Only announce winner if winner_team_key is present and both teams have nonzero points
	const hasWinner = userMatchup.winner_team_key && Number(userTeam.team_points.total) > 0 && Number(oppTeam.team_points.total) > 0;
	if (hasWinner) {
		winnerText = `\nWinner: ${userMatchup.winner_team_key === teamKey ? 'You!' : oppTeam.name}`;
	}
	const reply = `Your matchup:\n${userTeam.name}: ${userTeam.team_points.total} pts (proj: ${userTeam.team_projected_points.total})\nvs\n${oppTeam.name}: ${oppTeam.team_points.total} pts (proj: ${oppTeam.team_projected_points.total})${winnerText}`;
	await sendWhatsApp(from, reply);
}
