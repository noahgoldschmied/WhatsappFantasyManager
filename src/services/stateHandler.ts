// State handler: executes logic based on current state
import { clearConversationState } from "./conversationState";
import { getRosterCommand } from "../commands/getRoster";
import { showTeamsCommand } from "../commands/showTeams";
import { helpCommand } from "../commands/help";
import { linkCommand } from "../commands/link";
import { authRequiredCommand } from "../commands/authRequired";
import { tokenExpiredCommand } from "../commands/tokenExpired";
import { dropPlayerCommand } from "../commands/dropPlayer";
import { confirmDropCommand } from "../commands/confirmDrop";
import { defaultResponseCommand } from "../commands/defaultResponse";

import { sendWhatsApp } from "./twilio";

export async function stateHandler({ from, body, originalBody, state, userData }: any) {
  if (!state) return;
  switch (state.type) {
    case "help":
      await helpCommand({ from });
      clearConversationState(from);
      break;
    case "link":
      await linkCommand({ from });
      clearConversationState(from);
      break;
    case "authRequired":
      await authRequiredCommand({ from });
      clearConversationState(from); 
      break;
    case "tokenExpired":
      await tokenExpiredCommand({ from });
      clearConversationState(from);
      break;
    case "showTeams":
      await showTeamsCommand({ from, accessToken: userData?.accessToken });
      clearConversationState(from);
      break;
    case "getRoster":
      if (state.step === "awaitingTeam") {
        // Send menu if this is the first prompt (no number reply yet)
        if (!/^[0-9]+$/.test(body.trim())) {
          let msg = 'Which team? Reply with the number:\n';
          state.teamNames.forEach((name: string, idx: number) => {
            msg += `${idx + 1}. ${name}\n`;
          });
          await sendWhatsApp(from, msg);
          break;
        }
        // Handle user reply with a number
        let num = parseInt(body, 10);
        if (!isNaN(num) && state.teamNames && num >= 1 && num <= state.teamNames.length) {
          const teamsDict = userData?.userTeams;
          const teamName = state.teamNames[num - 1];
          const teamKey = teamsDict ? teamsDict[teamName] : undefined;
          clearConversationState(from);
          await getRosterCommand({ from, accessToken: userData?.accessToken, teamKey });
        } else {
          await sendWhatsApp(from, "Invalid selection. Please reply with a valid number.");
        }
        break;
      } else if (state.step === "shown") {
        await getRosterCommand({ from, accessToken: userData?.accessToken, teamKey: state.teamKey });
        clearConversationState(from);
        break;
      } else if (state.step === "noTeams") {
        await sendWhatsApp(from, "No teams found. Please use 'show teams' first.");
        clearConversationState(from);
        break;
      }
      break;
    case "dropPlayer":
      if (state.step === "awaitingConfirmation") {
        if (body.trim().toLowerCase() === "yes") {
          await confirmDropCommand({ from });
          clearConversationState(from);
        } else {
          await sendWhatsApp(from, "❌ Drop cancelled.");
          clearConversationState(from);
        }
        break;
      } else if (state.step === "noPending") {
        await sendWhatsApp(from, "No drop in progress. To drop a player, use 'drop [player name]'.");
        clearConversationState(from);
        break;
      }
      break;
    case "defaultResponse":
      await defaultResponseCommand({ from, body });
      clearConversationState(from);
      break;
    default:
      await sendWhatsApp(from, "❓ I didn't understand that. Send 'help' to see available commands.");
      clearConversationState(from);
      break;
  }
}
