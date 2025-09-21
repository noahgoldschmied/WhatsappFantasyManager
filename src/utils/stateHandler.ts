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
        await sendWhatsApp(from, "Which player would you like to add? Please reply with the player's name.");
        setConversationState(from, { type: "addPlayer", step: "awaitingConfirmation", addPlayer: body.trim() });
      } else if (state.step === "awaitingConfirmation") {
        if (body.trim().toLowerCase() === "yes") {
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
        } else {
          clearConversationState(from);
        }
      }
      break;
    case "dropPlayer":
      if (state.step === "awaitingName") {
        await sendWhatsApp(from, "Which player would you like to drop? Please reply with the player's name.");
        setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", dropPlayer: body.trim() });
      } else if (state.step === "awaitingConfirmation") {
        if (body.trim().toLowerCase() === "yes") {
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
        } else {
          clearConversationState(from);
        }
      }
      break;
    case "addDropPlayer":
      if (state.step === "awaitingConfirmation") {
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
        } else {
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
