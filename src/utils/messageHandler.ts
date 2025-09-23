import { getConversationState, setConversationState, clearConversationState } from "../utils/conversationState";
import { stateHandler } from "../utils/stateHandler";
import { getUserToken, isTokenExpired } from "../services/userStorage";
import { refreshAccessToken } from "../services/yahoo";

export async function conversationRouter({ from, body, originalBody }: { from: string, body: string, originalBody: string }) {
  const lowerBody = body.toLowerCase();
  let userData = getUserToken(from);
  let state = getConversationState(from);
  console.log(`[messageHandler] from=${from} state=`, state);

    //If user says 'restart', clear state and return immediately
    if (body.trim().toLowerCase() === "restart") {
      clearConversationState(from);
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
      } 
    } else if (lowerBody === "get roster") {
      setConversationState(from, { type: "getRoster" });
    } else if (lowerBody === "get matchup") {
      setConversationState(from, { type: "getScoreboard" });
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
