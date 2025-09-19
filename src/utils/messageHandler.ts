// Message handler: assigns/updates state based on user input
// State handler: processes logic based on current state
import { getConversationState, setConversationState, clearConversationState } from "../utils/conversationState";
import { stateHandler } from "../utils/stateHandler";
import { getUserChosenTeam, getUserToken, isTokenExpired } from "../services/userStorage";
import { refreshAccessToken } from "../services/yahoo";

export async function conversationRouter({ from, body, originalBody }: { from: string, body: string, originalBody: string }) {
  const lowerBody = body.toLowerCase();
  let userData = getUserToken(from);
  let state = getConversationState(from);
  console.log(`[messageHandler] from=${from} state=`, state);

    // 0. If user says 'restart', clear state and return immediately
    if (body.trim().toLowerCase() === "restart") {
      clearConversationState(from);
      await stateHandler({ from, body, originalBody, state: null, userData });
      return;
    }

    // 1. Message handler: assign/update state based on input
  if (!state) {
    // help
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
    } else if (lowerBody === "get standings") {
      setConversationState(from, { type: "getStandings" });
    } else if (lowerBody === "modify lineup") {
      setConversationState(from, { type: "modifyLineup", step: "awaitingPlayerMove" });
    } else if (lowerBody.startsWith("drop ")) {
      const player = originalBody.slice(5).trim();
      setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", player });
    } else if (lowerBody === "yes") {
      setConversationState(from, { type: "dropPlayer", step: "noPending" });
    } else {
      setConversationState(from, { type: "defaultResponse", step: "shown", body });
    }
    state = getConversationState(from);
  }

  // 2. State handler: process logic for current state
  await stateHandler({ from, body, originalBody, state, userData });
}
