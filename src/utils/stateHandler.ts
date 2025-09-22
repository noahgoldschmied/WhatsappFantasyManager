// State handler: executes logic based on current state
import { clearConversationState, setConversationState } from "./conversationState";
import { getRosterCommand } from "../commands/getRoster";
import { showTeamsCommand } from "../commands/showTeams";
import { helpCommand } from "../commands/help";
import { linkCommand } from "../commands/link";
import { authRequiredCommand } from "../commands/authRequired";
import { tokenExpiredCommand } from "../commands/tokenExpired";
// Removed old dropPlayerCommand and confirmDropCommand imports
import { defaultResponseCommand } from "../commands/defaultResponse";
import { modifyLineupCommand } from "../commands/modifyLineup";
import { addPlayer, dropPlayer, addDropPlayer } from "../commands/rosterMoves";
import { getLeagueStandingsCommand } from "../commands/getStandings";

import { sendWhatsApp } from "../services/twilio";
import { chooseTeamCommand } from "../commands/chooseTeam";
import { get } from "http";
import { getUserChosenTeam, getUserChosenLeague, getLeagueKeyFromTeamKey } from "../services/userStorage";

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
    case "chooseTeam":
      if (state.step === "noTeams") {
        await showTeamsCommand({ from, accessToken: userData?.accessToken });
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "chooseTeam"})
      } else if (state.step === "shown"){
        await chooseTeamCommand({ from });
      } else {
        await chooseTeamCommand({ from, reply: body });
      }
      break;
    case "getRoster":
      if (getUserChosenTeam(from) === "") {
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "getRoster" });
      } else {
        const userTeamKey = getUserChosenTeam(from)
        await getRosterCommand({ from, accessToken: userData?.accessToken, teamKey: userTeamKey})
        clearConversationState(from)
      }
      break;
    case "getStandings":
      console.log("user league", getUserChosenLeague(from))
      if (getUserChosenLeague(from) === "") {
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "getStandings" });
      } else {
        const userLeagueKey = getUserChosenLeague(from)
        await getLeagueStandingsCommand({ from, accessToken: userData?.accessToken, leagueKey: userLeagueKey})
        clearConversationState(from)
      }
      break;  
    case "addPlayer":
      if (state.step === "awaitingName") {
        // If the body is the same as the trigger, prompt for name
        if (!body || body.trim().toLowerCase() === "add player") {
          await sendWhatsApp(from, "Which player would you like to add? Please reply with the player's name.");
          return;
        } else {
          // User replied with a name
          setConversationState(from, { type: "addPlayer", step: "awaitingConfirmation", addPlayer: body.trim() });
          await sendWhatsApp(from, `You want to add ${body.trim()}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
      } else if (state.step === "awaitingConfirmation" && state.addPlayer) {
        // If this is the first time in awaitingConfirmation, send the prompt and set a flag
        if (!state.confirmPromptSent) {
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You want to add ${state.addPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          const teamKey = getUserChosenTeam(from);
          const leagueKey = getLeagueKeyFromTeamKey(teamKey);
          await addPlayer({
            accessToken: userData?.accessToken,
            leagueKey,
            teamKey,
            playerName: state.addPlayer,
            from
          });
          clearConversationState(from);
        } else if (lower === "no") {
          clearConversationState(from);
        } else {
          await sendWhatsApp(from, `You want to add ${state.addPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
      }
      break;
    case "dropPlayer":
      if (state.step === "awaitingName") {
        // If the body is the same as the trigger, prompt for name
        if (!body || body.trim().toLowerCase() === "drop player") {
          await sendWhatsApp(from, "Which player would you like to drop? Please reply with the player's name.");
          return;
        } else {
          // User replied with a name
          setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", dropPlayer: body.trim() });
          await sendWhatsApp(from, `You want to drop ${body.trim()}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
      } else if (state.step === "awaitingConfirmation" && state.dropPlayer) {
        // If this is the first time in awaitingConfirmation, send the prompt and set a flag
        if (!state.confirmPromptSent) {
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You want to drop ${state.dropPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          const teamKey = getUserChosenTeam(from);
          const leagueKey = getLeagueKeyFromTeamKey(teamKey);
          await dropPlayer({
            accessToken: userData?.accessToken,
            leagueKey,
            teamKey,
            playerName: state.dropPlayer,
            from
          });
          clearConversationState(from);
        } else if (lower === "no") {
          clearConversationState(from);
        } else {
          await sendWhatsApp(from, `You want to drop ${state.dropPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
      }
      break;
    case "addDropPlayer":
      if (state.step === "awaitingConfirmation") {
        if (!body || (body.trim().toLowerCase() !== "yes" && body.trim().toLowerCase() !== "no")) {
          // Prompt for confirmation if not already confirmed/denied
          await sendWhatsApp(from, `You want to add ${state.addPlayer} and drop ${state.dropPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
        if (body.trim().toLowerCase() === "yes") {
          const teamKey = getUserChosenTeam(from);
          const leagueKey = getLeagueKeyFromTeamKey(teamKey);
          await addDropPlayer({
            accessToken: userData?.accessToken,
            leagueKey,
            teamKey,
            addPlayerName: state.addPlayer,
            dropPlayerName: state.dropPlayer,
            from
          });
          clearConversationState(from);
        } else if (body.trim().toLowerCase() === "no") {
          clearConversationState(from);
        }
      }
      break;
    case "defaultResponse":
      await defaultResponseCommand({ from, body });
      clearConversationState(from);
      break;
    case "modifyLineup":
      if (state.step === "awaitingPlayerMove") {
        const lowerBody = body.trim().toLowerCase();
        if (lowerBody === "done" || lowerBody === "cancel") {
          await sendWhatsApp(from, lowerBody === "done" ? "✅ Lineup modification complete." : "❌ Lineup modification cancelled.");
          clearConversationState(from);
        } else {
          const result = await modifyLineupCommand({ from, body, userData });
          // If the command succeeded (returns true), prompt for more moves
          if (result === true) {
            await sendWhatsApp(from, "Would you like to make another move? Reply with another command, or send 'done' if finished.");
          }
          // Stay in modifyLineup state for further changes
        }
      }
      break;
    default:
      await sendWhatsApp(from, "❓ I didn't understand that. Send 'help' to see available commands.");
      clearConversationState(from);
      break;
  }
}
