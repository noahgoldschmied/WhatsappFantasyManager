// State handler: executes logic based on current state
import { clearConversationState, setConversationState } from "./conversationState";
import { getRosterCommand } from "../commands/getRoster";
import { showTeamsCommand } from "../commands/showTeams";
import { helpCommand } from "../commands/help";
import { linkCommand } from "../commands/link";
import { authRequiredCommand } from "../commands/authRequired";
import { tokenExpiredCommand } from "../commands/tokenExpired";
import { dropPlayerCommand } from "../commands/dropPlayer";
import { confirmDropCommand } from "../commands/confirmDrop";
import { defaultResponseCommand } from "../commands/defaultResponse";
import { modifyLineupCommand } from "../commands/modifyLineup";
import { getLeagueStandingsCommand } from "../commands/getStandings";

import { sendWhatsApp } from "../services/twilio";
import { chooseTeamCommand } from "../commands/chooseTeam";
import { get } from "http";
import { getUserChosenTeam, getUserChosenLeague } from "../services/userStorage";

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
    case "modifyLineup":
      if (state.step === "awaitingPlayerMove") {
        // Ensure user has selected a team and league before proceeding
        const teamKey = getUserChosenTeam(from);
        const leagueKey = getUserChosenLeague(from);
        if (!teamKey) {
          await sendWhatsApp(from, "❌ No team selected. Please choose a team first.");
          clearConversationState(from);
          break;
        }
        if (!leagueKey) {
          await sendWhatsApp(from, "❌ No league selected. Please choose a league first.");
          clearConversationState(from);
          break;
        }
        await modifyLineupCommand({ from, body, userData });
        clearConversationState(from);
      }
      break;
    default:
      await sendWhatsApp(from, "❓ I didn't understand that. Send 'help' to see available commands.");
      clearConversationState(from);
      break;
  }
}
