// A stateful conversation router for WhatsApp commands
// This will route based on conversation state, falling back to command detection if no state is set
import { getConversationState, setConversationState, clearConversationState } from "./conversationState";
import { getRosterCommand } from "../commands/getRoster";
import { showTeamsCommand } from "../commands/showTeams";
import { helpCommand } from "../commands/help";
import { linkCommand } from "../commands/link";
import { authRequiredCommand } from "../commands/authRequired";
import { tokenExpiredCommand } from "../commands/tokenExpired";
import { dropPlayerCommand } from "../commands/dropPlayer";
import { confirmDropCommand } from "../commands/confirmDrop";
import { defaultResponseCommand } from "../commands/defaultResponse";
import { showTeamCommand } from "../commands/showTeam";
import { getUserToken, isTokenExpired } from "./userStorage";
import { sendWhatsApp } from "./twilio";
import { refreshAccessToken } from "./yahoo";

export async function conversationRouter({ from, body, originalBody }: { from: string, body: string, originalBody: string }) {
  const lowerBody = body.toLowerCase();
  const userData = getUserToken(from);
  const state = getConversationState(from);
  console.log(`[conversationRouter] from=${from} state=`, state);


  // 1. If there is a pending state, route to the correct handler
  if (state) {
    // getRoster flow: awaiting team selection
    if (state.type === "getRoster" && state.step === "awaitingTeam") {
      if (!userData || !userData.accessToken) {
        await authRequiredCommand({ from });
        return;
      }
      await getRosterCommand({ from, accessToken: userData.accessToken, teamKey: body });
      return;
    }

    // dropPlayer flow: awaiting confirmation
    if (state.type === "dropPlayer" && state.step === "awaitingConfirmation") {
      if (body.trim().toLowerCase() === "yes") {
        await confirmDropCommand({ from });
        clearConversationState(from);
      } else {
        await sendWhatsApp(from, "❌ Drop cancelled.");
        clearConversationState(from);
      }
      return;
    }

    // showTeam flow: could be extended for multi-step (e.g., select team)
    // ...

    // If state is not handled, clear it and fall through
    clearConversationState(from);
  }

  // 2. If no state, proceed with normal command detection
  // 2. If no state, proceed with normal command detection
  if (lowerBody === "help") {
    await helpCommand({ from });
    return;
  }
  if (lowerBody === "link") {
    await linkCommand({ from });
    return;
  }
  if (!userData) {
    await authRequiredCommand({ from });
    return;
  }
  if (isTokenExpired(userData)) {
    try {
      const refreshedTokens = await refreshAccessToken(userData.refreshToken);
      userData.accessToken = refreshedTokens.accessToken;
      userData.refreshToken = refreshedTokens.refreshToken;
      userData.expiresAt = new Date(Date.now() + refreshedTokens.expiresIn * 1000);
      console.log(`Refreshed token for user: ${from}`);
    } catch (error) {
      console.error("Token refresh failed:", error);
      await tokenExpiredCommand({ from });
      return;
    }
  }

  // show teams (single step, but could be extended)
  if (lowerBody === "show teams") {
    await showTeamsCommand({ from, accessToken: userData.accessToken });
    return;
  }

  // show team (placeholder, could be multi-step in future)
  if (lowerBody === "show team") {
    await showTeamCommand({ from });
    return;
  }

  // get roster (multi-step: prompt for team if not provided)
  if (lowerBody.startsWith("get roster")) {
    const parts = body.split(/\s+/);
    if (parts.length < 3) {
      await getRosterCommand({ from, accessToken: userData.accessToken });
      return;
    }
    let teamInput = parts.slice(2).join(" ").trim();
    teamInput = teamInput.replace(/^"|"$/g, '').trim();
    await getRosterCommand({ from, accessToken: userData.accessToken, teamKey: teamInput });
    return;
  }

  // drop player (multi-step: prompt for confirmation)
  if (lowerBody.startsWith("drop ")) {
    const player = originalBody.slice(5).trim();
    setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", player });
    await dropPlayerCommand({ from, player });
    return;
  }

  // confirm drop (should only be handled in state, but fallback for stray 'yes')
  if (lowerBody === "yes") {
    await sendWhatsApp(from, "No drop in progress. To drop a player, use 'drop [player name]'.");
    return;
  }

  // fallback/default
  await defaultResponseCommand({ from, body });
}
