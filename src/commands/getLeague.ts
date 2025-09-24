import { getLeagueTeams } from "../services/yahoo";
import { getUserChosenLeague, setLeagueDict } from "../services/userStorage";

/**
 * LEAGUE TEAM MANAGEMENT
 * Handles fetching and storing league team information from Yahoo Fantasy API
 */

// Fetch all teams in the user's chosen league and store in userStorage
export async function fetchAndStoreLeagueTeamsForUser({ from, accessToken }: {
  from: string;
  accessToken: string;
}) {
  const leagueKey = getUserChosenLeague(from);
  if (!leagueKey) return null;
  return await getLeagueTeamsCommand({ from, accessToken, leagueKey });
}

// Fetch all teams in a specific league and store team mapping in userStorage
export async function getLeagueTeamsCommand({ from, accessToken, leagueKey }: {
  from: string;
  accessToken: string;
  leagueKey: string;
}) {
  try {
    // Fetch league team data from Yahoo Fantasy API
    const data = await getLeagueTeams(accessToken, leagueKey);
    
    // Yahoo API returns teams in fantasy_content.league.teams.team
    // Handle both single team and multiple teams responses
    const teamsArr = Array.isArray(data.fantasy_content.league.teams.team)
      ? data.fantasy_content.league.teams.team
      : [data.fantasy_content.league.teams.team];
    
    // Build mapping dictionary: teamName -> teamKey for easy lookup
    const leagueDict: Record<string, string> = {};
    for (const team of teamsArr) {
      if (team.name && team.team_key) {
        leagueDict[team.name] = team.team_key;
      }
    }
    
    // Store the team mapping for this user
    setLeagueDict(from, leagueDict);
    return leagueDict;
  } catch (err) {
    console.error("getLeagueTeamsCommand error:", err);
    return null;
  }
}
