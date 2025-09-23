import { getUserChosenLeague } from "../services/userStorage";

// Fetch all teams in the user's chosen league and store in userStorage
export async function fetchAndStoreLeagueTeamsForUser({ from, accessToken }: {
  from: string;
  accessToken: string;
}) {
  const leagueKey = getUserChosenLeague(from);
  if (!leagueKey) return null;
  return await getLeagueTeamsCommand({ from, accessToken, leagueKey });
}
import { getLeagueTeams } from "../services/yahoo";
import { setLeagueDict } from "../services/userStorage";

// Fetch all teams in a league and store in userStorage
export async function getLeagueTeamsCommand({ from, accessToken, leagueKey }: {
  from: string;
  accessToken: string;
  leagueKey: string;
}) {
  try {
    const data = await getLeagueTeams(accessToken, leagueKey);
    // Yahoo returns teams in fantasy_content.league.teams.team
    const teamsArr = Array.isArray(data.fantasy_content.league.teams.team)
      ? data.fantasy_content.league.teams.team
      : [data.fantasy_content.league.teams.team];
    // Build dict: teamName -> teamKey
    const leagueDict: Record<string, string> = {};
    for (const team of teamsArr) {
      if (team.name && team.team_key) {
        leagueDict[team.name] = team.team_key;
      }
    }
    setLeagueDict(from, leagueDict);
    return leagueDict;
  } catch (err) {
    console.error("getLeagueTeamsCommand error:", err);
    return null;
  }
}
