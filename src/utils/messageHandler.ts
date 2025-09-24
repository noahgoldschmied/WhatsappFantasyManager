import { showLeagueCommand } from "../commands/showLeague";
import { getConversationState, setConversationState, clearConversationState } from "../utils/conversationState";
import { stateHandler } from "../utils/stateHandler";
import { getUserToken, isTokenExpired, clearUserChosenTeam } from "../services/userStorage";
import { fetchAndStoreLeagueTeamsForUser } from "../commands/getLeague";
import { refreshAccessToken } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

// Main message router - parses incoming messages and sets appropriate conversational states
export async function conversationRouter({ from, body, originalBody }: { from: string, body: string, originalBody: string }) {
  const lowerBody = body.toLowerCase();
  let userData = getUserToken(from);
  let state = getConversationState(from);
  console.log(`[messageHandler] from=${from} state=`, state);

  // Handle session restart command - clears all user state and data
  if (body.trim().toLowerCase() === "restart") {
    clearConversationState(from);
    clearUserChosenTeam(from);
    if (userData) userData.leagueDict = {};
    await sendWhatsApp(from, "🔄 Session restarted. Please choose your team again.");
    await stateHandler({ from, body, originalBody, state: null, userData });
    return;
  }

  // Parse initial commands when no active conversational state exists
  if (!state) {
    if (lowerBody === "help") {
      setConversationState(from, { type: "help", step: "shown" });
    } else if (lowerBody === "link") {
      setConversationState(from, { type: "link", step: "shown" });
    } else if (/\b(show|list|pending) (transactions|moves)\b/i.test(lowerBody)) {
      setConversationState(from, { type: "showTransactions" });
      state = getConversationState(from);
    } else if (!userData) {
      // User not authenticated, redirect to auth flow
      setConversationState(from, { type: "authRequired", step: "shown" });
    } else if (isTokenExpired(userData)) {
      // Token expired, try to refresh it automatically
      try {
        const refreshedTokens = await refreshAccessToken(userData.refreshToken);
        userData.accessToken = refreshedTokens.accessToken;
        userData.refreshToken = refreshedTokens.refreshToken;
        userData.expiresAt = new Date(Date.now() + refreshedTokens.expiresIn * 1000);
        console.log(`Refreshed token for user: ${from}`);
      } catch (error) {
        // Refresh failed, user needs to re-authenticate
        setConversationState(from, { type: "tokenExpired", step: "shown" });
      }
    } else if (/^show available( \w+)?$/i.test(lowerBody)) {
      // Handle 'show available' or 'show available QB' commands
      setConversationState(from, { type: "showAvailable" });
      state = getConversationState(from);
    } else if (lowerBody === "show teams") {
      setConversationState(from, { type: "showTeams", step: "shown" });
    } else if (lowerBody === "choose team") {
      if (!userData.userTeams || Object.keys(userData.userTeams).length === 0) {
        // No teams available, need to fetch them first
        setConversationState(from, { type: "chooseTeam", step: "noTeams" });
      } else {
        // Teams available, show selection options
        setConversationState(from, { type: "chooseTeam", step: "shown"})
        // Fetch league team data for enhanced functionality
        if (userData.accessToken) {
          await fetchAndStoreLeagueTeamsForUser({ from, accessToken: userData.accessToken });
        }
      }
    } else if (lowerBody === "show league") {
      // Ensure league data is available before showing
      if (!userData?.leagueDict || Object.keys(userData.leagueDict).length === 0) {
        if (userData?.accessToken) {
          await fetchAndStoreLeagueTeamsForUser({ from, accessToken: userData.accessToken });
        }
      }
      await showLeagueCommand({ from });
      return;
    } else if (/^get roster( [\w\s'.-]+)?$/i.test(body)) {
      // Handle 'get roster' or 'get roster Team Name' commands
      const match = body.match(/^get roster( [\w\s'.-]+)?$/i);
      if (match && match[1]) {
        setConversationState(from, { type: "getRoster", teamName: match[1].trim() });
      } else {
        setConversationState(from, { type: "getRoster" });
      }
    } else if (lowerBody === "propose trade") {
      // Start multi-step trade proposal flow
      setConversationState(from, { type: "trade", step: "awaitingTradeeTeam" });
    } else if (lowerBody.startsWith("get matchup")) {
      // Handle matchup commands with optional week parameter
      const weekMatch = lowerBody.match(/get matchup(?: week (\d+))?/);
      if (weekMatch && weekMatch[1]) {
        setConversationState(from, { type: "getScoreboard", week: parseInt(weekMatch[1], 10) });
      } else {
        setConversationState(from, { type: "getScoreboard" });
      }
    } else if (lowerBody.startsWith("get scoreboard")) {
      // Handle scoreboard commands with optional week parameter  
      const weekMatch = lowerBody.match(/get scoreboard(?: week (\d+))?/);
      if (weekMatch && weekMatch[1]) {
        setConversationState(from, { type: "getScoreboard", week: parseInt(weekMatch[1], 10) });
      } else {
        setConversationState(from, { type: "getScoreboard" });
      }
    } else if (lowerBody === "get standings") {
      setConversationState(from, { type: "getStandings" });
    } else if (lowerBody === "modify lineup") {
      // Start interactive lineup modification flow
      setConversationState(from, { type: "modifyLineup", step: "awaitingPlayerMove" });
    } else if (state && state.type === "modifyLineup" && state.step === "awaitingPlayerMove") {
      // Maintain lineup modification state for consecutive moves
      setConversationState(from, { type: "modifyLineup", step: "awaitingPlayerMove" });
    } else if (/^add [\w\s'.-]+ drop [\w\s'.-]+$/i.test(body)) {
      // Handle combined add/drop commands like 'add Nico Collins drop Mike Evans'
      const match = body.match(/^add ([\w\s'.-]+) drop ([\w\s'.-]+)$/i);
      if (match) {
        const addPlayer = match[1].trim();
        const dropPlayer = match[2].trim();
        setConversationState(from, { type: "addDropPlayer", step: "awaitingConfirmation", addPlayer, dropPlayer });
      }
    } else if (lowerBody === "add player") {
      // Generic add player command - will prompt for player name
      setConversationState(from, { type: "addPlayer", step: "awaitingName" });
    } else if (lowerBody === "drop player") {
      // Generic drop player command - will prompt for player name
      setConversationState(from, { type: "dropPlayer", step: "awaitingName" });
    } else if (/^add ([\w'.-]+ ?)+$/i.test(body)) {
      // Handle specific add commands like 'add Nico Collins'
      const match = body.match(/^add ([\w\s'.-]+)$/i);
      if (match && match[1].trim().toLowerCase() !== "player") {
        const addPlayer = match[1].trim();
        setConversationState(from, { type: "addPlayer", step: "awaitingConfirmation", addPlayer });
      }
    } else if (/^drop ([\w'.-]+ ?)+$/i.test(body)) {
      // Handle specific drop commands like 'drop Mike Evans'
      const match = body.match(/^drop ([\w\s'.-]+)$/i);
      if (match && match[1].trim().toLowerCase() !== "player") {
        const dropPlayer = match[1].trim();
        setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", dropPlayer });
      }
    } else if (lowerBody === "yes") {
      // Handle standalone "yes" responses
      setConversationState(from, { type: "confirmTransaction", step: "confirmed" });
    } else {
      // Unrecognized command, show default response
      setConversationState(from, { type: "defaultResponse", step: "shown", body });
    }
    state = getConversationState(from);
  }
  
  // Pass control to state handler for conversational flow management
  await stateHandler({ from, body, originalBody, state, userData });
}
