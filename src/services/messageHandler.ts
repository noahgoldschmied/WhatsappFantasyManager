// Message handler: assigns/updates state based on user input
// State handler: processes logic based on current state
import { getConversationState, setConversationState, clearConversationState } from "./conversationState";
import { stateHandler } from "./stateHandler";
import { getUserToken, isTokenExpired } from "./userStorage";
import { refreshAccessToken } from "./yahoo";

export async function conversationRouter({ from, body, originalBody }: { from: string, body: string, originalBody: string }) {
  const lowerBody = body.toLowerCase();
  let userData = getUserToken(from);
  let state = getConversationState(from);
  console.log(`[messageHandler] from=${from} state=`, state);

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
    } else if (lowerBody === "show team") {
      setConversationState(from, { type: "showTeam", step: "shown" });
    } else if (lowerBody.startsWith("get roster")) {
      const parts = body.split(/\s+/);
      if (parts.length < 3) {
        const teamsDict = userData.userTeams;
        const teamNames = teamsDict ? Object.keys(teamsDict) : [];
        if (!teamsDict || teamNames.length === 0) {
          setConversationState(from, { type: "getRoster", step: "noTeams" });
        } else {
          setConversationState(from, { type: "getRoster", step: "awaitingTeam", teamNames });
        }
      } else {
        let teamInput = parts.slice(2).join(" ").trim();
        teamInput = teamInput.replace(/^"|"$/g, '').trim();
        setConversationState(from, { type: "getRoster", step: "shown", teamKey: teamInput });
      }
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
