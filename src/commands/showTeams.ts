import { getUserTeams } from "../services/yahoo";
import { setUserTeams } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

export async function showTeamsCommand({ from, accessToken }: { from: string; accessToken: string }) {
  try {
    const teamsData = await getUserTeams(accessToken);
    let teamsText = "\ud83c\udfc8 *Your Fantasy Teams:*\n\n";
    const teamsDict = extractTeamsFromYahooResponse(teamsData);
    console.log("Extracted teams:", teamsDict);
    const teamNames = Object.keys(teamsDict);
    if (teamNames.length > 0) {
      for (const name of teamNames) {
        teamsText += `• ${name}\n`;
      }
      setUserTeams(from, teamsDict);
    } else {
      teamsText += "No teams found or unexpected API response format.";
    }
    await sendWhatsApp(from, teamsText);
  } catch (error) {
    console.error("Get teams error:", error);
    await sendWhatsApp(from, "\u274c Failed to get your teams. Please try again later.");
  }
}

function extractTeamsFromYahooResponse(teamsData: any): Record<string, string> {
  const teamsDict: Record<string, string> = {};
  try {
    const users = teamsData?.fantasy_content?.users;
    if (users) {
      for (const userObj of Object.values(users)) {
        if (!userObj || typeof userObj !== 'object' || !('user' in userObj)) continue;
        const userArr = (userObj as any).user;
        if (!Array.isArray(userArr)) continue;
        const gamesObj = userArr[1]?.games;
        if (!gamesObj) continue;
        for (const gameObj of Object.values(gamesObj)) {
          if (!gameObj || typeof gameObj !== 'object' || !('game' in gameObj)) continue;
          const gameArr = (gameObj as any).game;
          if (!Array.isArray(gameArr)) continue;
          for (const g of gameArr) {
            if (!g.teams) continue;
            const teamsObj = g.teams;
            for (const teamObj of Object.values(teamsObj)) {
              if (!teamObj || typeof teamObj !== 'object' || !('team' in teamObj)) continue;
              const teamArr = (teamObj as any).team;
              if (!Array.isArray(teamArr) || !Array.isArray(teamArr[0])) continue;
              const teamProps = teamArr[0];
              let teamKey = null;
              let teamName = null;
              for (const prop of teamProps) {
                if (prop.team_key) teamKey = prop.team_key;
                if (prop.name) teamName = prop.name;
              }
              if (teamKey && teamName) {
                teamsDict[teamName] = teamKey;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // ignore, handled by caller
  }
  return teamsDict;
}