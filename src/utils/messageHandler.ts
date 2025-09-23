import { showLeagueCommand } from "../commands/showLeague";
import { getConversationState, setConversationState, clearConversationState } from "../utils/conversationState";
import { stateHandler } from "../utils/stateHandler";
import { getUserToken, isTokenExpired, clearUserChosenTeam } from "../services/userStorage";
import { fetchAndStoreLeagueTeamsForUser } from "../commands/getLeague";
import { refreshAccessToken } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

export async function conversationRouter({ from, body, originalBody }: { from: string, body: string, originalBody: string }) {
  const lowerBody = body.toLowerCase();
  let userData = getUserToken(from);
  let state = getConversationState(from);
  console.log(`[messageHandler] from=${from} state=`, state);

  //If user says 'restart', clear state, team selection, and leagueDict, then return immediately
  if (body.trim().toLowerCase() === "restart") {
    clearConversationState(from);
    clearUserChosenTeam(from);
    // Clear leagueDict by setting to empty
    if (userData) userData.leagueDict = {};
    await sendWhatsApp(from, "🔄 Session restarted. Please choose your team again.");
    await stateHandler({ from, body, originalBody, state: null, userData });
    return;
  }

  if (!state) {
    if (lowerBody === "help") {
      setConversationState(from, { type: "help", step: "shown" });
    } else if (lowerBody === "link") {
      setConversationState(from, { type: "link", step: "shown" });
    } else if (!userData) {
      setConversationState(from, { type: "authRequired", step: "shown" });
    } else if (isTokenExpired(userData)) {
      try {
        const refreshedTokens = await refreshAccessToken(userData.refreshToken);
        userData.accessToken = refreshedTokens.accessToken;
        userData.refreshToken = refreshedTokens.refreshToken;
        userData.expiresAt = new Date(Date.now() + refreshedTokens.expiresIn * 1000);
        console.log(`Refreshed token for user: ${from}`);
      } catch (error) {
        setConversationState(from, { type: "tokenExpired", step: "shown" });
      }
    } else if (lowerBody === "show teams") {
      setConversationState(from, { type: "showTeams", step: "shown" });
    } else if (lowerBody === "choose team") {
      if (!userData.userTeams || Object.keys(userData.userTeams).length === 0) {
        setConversationState(from, { type: "chooseTeam", step: "noTeams" });
      } else {
        setConversationState(from, { type: "chooseTeam", step: "shown"})
        // After showing teams, fetch and store leagueDict for user's chosen league
        if (userData.accessToken) {
          await fetchAndStoreLeagueTeamsForUser({ from, accessToken: userData.accessToken });
        }
      }
    } else if (lowerBody === "show league") {
      // If leagueDict is missing, try to fetch and store it
      if (!userData?.leagueDict || Object.keys(userData.leagueDict).length === 0) {
        if (userData?.accessToken) {
          await fetchAndStoreLeagueTeamsForUser({ from, accessToken: userData.accessToken });
        }
      }
      await showLeagueCommand({ from });
      return;
    } else if (/^get roster( [\w\s'.-]+)?$/i.test(body)) {
      // e.g. 'get roster' or 'get roster Team Name'
      const match = body.match(/^get roster( [\w\s'.-]+)?$/i);
      if (match && match[1]) {
        setConversationState(from, { type: "getRoster", teamName: match[1].trim() });
      } else {
        setConversationState(from, { type: "getRoster" });
      }
    } else if (lowerBody === "propose trade") {
      setConversationState(from, { type: "trade", step: "awaitingTradeeTeam" });
    } else if (lowerBody.startsWith("get matchup")) {
      // Parse week if present, e.g. "get matchup week 2"
      const weekMatch = lowerBody.match(/get matchup(?: week (\d+))?/);
      if (weekMatch && weekMatch[1]) {
        setConversationState(from, { type: "getScoreboard", week: parseInt(weekMatch[1], 10) });
      } else {
        setConversationState(from, { type: "getScoreboard" });
      }
    } else if (lowerBody.startsWith("get scoreboard")) {
      // Parse week if present, e.g. "get scoreboard week 5"
      const weekMatch = lowerBody.match(/get scoreboard(?: week (\d+))?/);
      if (weekMatch && weekMatch[1]) {
        setConversationState(from, { type: "getScoreboard", week: parseInt(weekMatch[1], 10) });
      } else {
        setConversationState(from, { type: "getScoreboard" });
      }
    } else if (lowerBody === "get standings") {
      setConversationState(from, { type: "getStandings" });
    } else if (lowerBody === "modify lineup") {
      setConversationState(from, { type: "modifyLineup", step: "awaitingPlayerMove" });
    } else if (state && state.type === "modifyLineup" && state.step === "awaitingPlayerMove") {
      // If already in modifyLineup flow, keep state so follow-up like 'bench Nico Collins' is handled
      setConversationState(from, { type: "modifyLineup", step: "awaitingPlayerMove" });
    } else if (/^add [\w\s'.-]+ drop [\w\s'.-]+$/i.test(body)) {
      // e.g. 'add Nico Collins drop Mike Evans'
      const match = body.match(/^add ([\w\s'.-]+) drop ([\w\s'.-]+)$/i);
      if (match) {
        const addPlayer = match[1].trim();
        const dropPlayer = match[2].trim();
        setConversationState(from, { type: "addDropPlayer", step: "awaitingConfirmation", addPlayer, dropPlayer });
      }
    } else if (lowerBody === "add player") {
      setConversationState(from, { type: "addPlayer", step: "awaitingName" });
    } else if (lowerBody === "drop player") {
      setConversationState(from, { type: "dropPlayer", step: "awaitingName" });
    } else if (/^add ([\w'.-]+ ?)+$/i.test(body)) {
      // e.g. 'add Nico Collins'
      const match = body.match(/^add ([\w\s'.-]+)$/i);
      if (match && match[1].trim().toLowerCase() !== "player") {
        const addPlayer = match[1].trim();
        setConversationState(from, { type: "addPlayer", step: "awaitingConfirmation", addPlayer });
      }
    } else if (/^drop ([\w'.-]+ ?)+$/i.test(body)) {
      // e.g. 'drop Mike Evans'
      const match = body.match(/^drop ([\w\s'.-]+)$/i);
      if (match && match[1].trim().toLowerCase() !== "player") {
        const dropPlayer = match[1].trim();
        setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", dropPlayer });
      }
    } else if (lowerBody === "yes") {
      setConversationState(from, { type: "confirmTransaction", step: "confirmed" });
    } else {
      setConversationState(from, { type: "defaultResponse", step: "shown", body });
    }
    state = getConversationState(from);
  }
  await stateHandler({ from, body, originalBody, state, userData });
}
