import { getUserTeams } from "../services/yahoo";
import { setUserTeams, getUserTeamsDict } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

// Display all of the user's fantasy teams across all leagues
export async function showTeamsCommand({ from, accessToken }: { from: string; accessToken: string }) {
  try {
    // Fetch user's teams from Yahoo API
    const teamsData = await getUserTeams(accessToken);
    let teamsText = "🏈 *Your Fantasy Teams:*\n\n";
    
    // Parse and extract team information from Yahoo's nested response
    const teamsDict = extractTeamsFromYahooResponse(teamsData);
    console.log("Extracted teams:", teamsDict);
    
    // Store teams for future use and display
    setUserTeams(from, teamsDict);
    const teamNames = getUserTeamsDict(from) ? Object.keys(getUserTeamsDict(from)!) : [];
    
    if (teamNames.length > 0) {
      for (const name of teamNames) {
        teamsText += `• ${name}\n`;
      }
    } else {
      teamsText += "No teams found or unexpected API response format.";
    }
    
    await sendWhatsApp(from, teamsText);
  } catch (error) {
    console.error("Get teams error:", error);
    await sendWhatsApp(from, "❌ Failed to get your teams. Please try again later.");
  }
}

// Parse Yahoo's deeply nested team response structure to extract team name/key pairs
function extractTeamsFromYahooResponse(teamsData: any): Record<string, string> {
  const teamsDict: Record<string, string> = {};
  
  try {
    // Navigate Yahoo's complex nested structure: users -> user -> games -> game -> teams -> team
    const users = teamsData?.fantasy_content?.users;
    if (users) {
      for (const userObj of Object.values(users)) {
        if (!userObj || typeof userObj !== 'object' || !('user' in userObj)) continue;
        
        const userArr = (userObj as any).user;
        if (!Array.isArray(userArr)) continue;
        
        const gamesObj = userArr[1]?.games;
        if (!gamesObj) continue;
        
        // Process each game (NFL fantasy leagues)
        for (const gameObj of Object.values(gamesObj)) {
          if (!gameObj || typeof gameObj !== 'object' || !('game' in gameObj)) continue;
          
          const gameArr = (gameObj as any).game;
          if (!Array.isArray(gameArr)) continue;
          
          // Extract teams from each game
          for (const g of gameArr) {
            if (!g.teams) continue;
            
            const teamsObj = g.teams;
            for (const teamObj of Object.values(teamsObj)) {
              if (!teamObj || typeof teamObj !== 'object' || !('team' in teamObj)) continue;
              
              const teamArr = (teamObj as any).team;
              if (!Array.isArray(teamArr) || !Array.isArray(teamArr[0])) continue;
              
              // Extract team key and name from properties array
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
    // Parsing errors are handled by the caller
    console.error("Error parsing Yahoo teams response:", e);
  }
  
  return teamsDict;
}