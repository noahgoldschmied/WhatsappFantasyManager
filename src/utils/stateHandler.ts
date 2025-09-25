import { clearConversationState, setConversationState } from "./conversationState";
import { getRosterCommand } from "../commands/getRoster";
import { showTeamsCommand } from "../commands/showTeams";
import { helpCommand } from "../commands/help";
import { linkCommand } from "../commands/link";
import { authRequiredCommand } from "../commands/authRequired";
import { tokenExpiredCommand } from "../commands/tokenExpired";
import { defaultResponseCommand } from "../commands/defaultResponse";
import { modifyLineupCommand } from "../commands/modifyLineup";
import { addPlayer, dropPlayer, addDropPlayer } from "../commands/rosterMoves";
import { getLeagueStandingsCommand } from "../commands/getStandings";
import { getScoreboardCommand } from "../commands/getScoreboard";
import { sendWhatsApp } from "../services/twilio";
import { chooseTeamCommand } from "../commands/chooseTeam";
import { getUserChosenTeam, getUserChosenLeague, getLeagueKeyFromTeamKey, getUserTeamsDict } from "../services/userStorage";
import { fetchAndStoreLeagueTeamsForUser } from "../commands/getLeague";

// Central state handler for all bot flows. Each case represents a conversational state.
export async function stateHandler({ from, body, originalBody, state, userData }: any) {
  if (!state) return;
  switch (state.type) {
    case "showAvailable": {
      // Handles 'show available' and 'show available [POSITION]' commands
      if (userData?.accessToken) {
        const leagueKey = getUserChosenLeague(from);
        if (!leagueKey) {
          await sendWhatsApp(from, "You must choose your team first.");
        } else {
          const { getAvailablePlayersCommand } = await import("../commands/getAvailable");
          // Parse position from body if present (e.g., 'show available QB')
          let position: string | undefined = undefined;
          const match = body.trim().match(/^show available\s+(\w+)$/i);
          if (match && match[1]) {
            position = match[1].toUpperCase();
          }
          await getAvailablePlayersCommand({ from, accessToken: userData.accessToken, leagueKey, position });
        }
      } else {
        await sendWhatsApp(from, "You must link your Yahoo account first.");
      }
      clearConversationState(from);
      break;
    }
    case "waiverClaimPrompt": {
      // Handles user response to waiver claim prompt
      const lower = body.trim().toLowerCase();
      if (lower === "yes") {
        const teamKey = getUserChosenTeam(from);
        await addPlayer({
          accessToken: userData?.accessToken,
          leagueKey: state.leagueKey,
          teamKey,
          playerName: state.playerName,
          from,
          isWaiverClaim: true
        });
        clearConversationState(from);
      } else if (lower === "no") {
        await sendWhatsApp(from, "Waiver claim cancelled.");
        clearConversationState(from);
      } else {
        await sendWhatsApp(from, "Reply 'yes' to put in a waiver claim or 'no' to cancel.");
      }
      return;
    }
    case "showTransactions":
      // Handles 'show transactions' and 'pending moves' commands
      if (userData?.accessToken) {
        const { getPendingTransactionsCommand } = await import("../commands/getTransactions");
        await getPendingTransactionsCommand({ from, accessToken: userData.accessToken });
      } else {
        await sendWhatsApp(from, "You must link your Yahoo account first.");
      }
      clearConversationState(from);
      break;
    case "trade":
      // Handles the step-by-step trade proposal flow
      // This is a complex multi-step flow: tradee team → send players → receive players → note → confirm
      if (state.step === "awaitingTradeeTeam") {
        // Step 1: Get the team they want to trade with
        const input = body ? body.trim().toLowerCase() : "";
        if (!input || input === "propose trade") {
          await sendWhatsApp(from, "Which team do you want to trade with? Please reply with the team name.");
          return;
        }
        // Validate the team name exists in the user's league
        let validTeamName = "";
        const leagueDict = userData?.leagueDict || {};
        for (const name of Object.keys(leagueDict)) {
          if (name.toLowerCase() === input) {
            validTeamName = name;
            break;
        }
      }
        if (!validTeamName) {
          await sendWhatsApp(from, `Team '${body.trim()}' not found. Please reply with a valid team name from your league.`);
          return;
        }
        // Move to step 2: collecting players to send
        setConversationState(from, { type: "trade", step: "awaitingSendPlayers", tradeeTeamName: validTeamName });
        await sendWhatsApp(from, `Which player(s) from your team do you want to send? (comma-separated names)`);
        return;
      }
      if (state.step === "awaitingSendPlayers" && state.tradeeTeamName) {
        // Step 2: Get the players user wants to send
        if (!body || body.trim() === "") {
          await sendWhatsApp(from, `Which player(s) from your team do you want to send? (comma-separated names)`);
          return;
        }
        // Parse comma-separated player names and move to step 3
        setConversationState(from, { type: "trade", step: "awaitingReceivePlayers", tradeeTeamName: state.tradeeTeamName, sendPlayers: body.split(",").map((s: string) => s.trim()).filter(Boolean) });
        await sendWhatsApp(from, `Which player(s) from ${state.tradeeTeamName} do you want to receive? (comma-separated names)`);
        return;
      }
      if (state.step === "awaitingReceivePlayers" && state.tradeeTeamName && state.sendPlayers) {
        // Step 3: Get the players user wants to receive
        if (!body || body.trim() === "") {
          await sendWhatsApp(from, `Which player(s) from ${state.tradeeTeamName} do you want to receive? (comma-separated names)`);
          return;
        }
        // Parse receive players and move to step 4: optional trade note
        setConversationState(from, { type: "trade", step: "awaitingTradeNote", tradeeTeamName: state.tradeeTeamName, sendPlayers: state.sendPlayers, receivePlayers: body.split(",").map((s: string) => s.trim()).filter(Boolean) });
        await sendWhatsApp(from, `Add a note for your trade proposal, or reply 'skip' to continue.`);
        return;
      }
      if (state.step === "awaitingTradeNote" && state.tradeeTeamName && state.sendPlayers && state.receivePlayers) {
        // Step 4: Get optional trade note (or skip)
        let note = body.trim().toLowerCase() === "skip" ? "" : body.trim();
        // Move to final step: confirmation with trade summary
        setConversationState(from, { type: "trade", step: "awaitingConfirmation", tradeeTeamName: state.tradeeTeamName, sendPlayers: state.sendPlayers, receivePlayers: state.receivePlayers, tradeNote: note });
        await sendWhatsApp(from, `You are proposing to send ${state.sendPlayers.join(", ")} to ${state.tradeeTeamName} for ${state.receivePlayers.join(", ")}${note ? ". Note: " + note : ""}. Reply 'yes' to confirm or 'no' to cancel.`);
        return;
      }
      if (state.step === "awaitingConfirmation" && state.tradeeTeamName && state.sendPlayers && state.receivePlayers) {
        // Step 5: Final confirmation and trade execution
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          // Look up the tradee team's key for the API call
          let tradeeTeamKey = "";
          const leagueDict = userData?.leagueDict || {};
          if (leagueDict && Object.keys(leagueDict).length > 0) {
            for (const [name, key] of Object.entries(leagueDict)) {
              if (name.toLowerCase() === state.tradeeTeamName.toLowerCase()) {
                tradeeTeamKey = String(key);
                break;
              }
            }
          }
          // Fallback to userTeams if not found in leagueDict
          if (!tradeeTeamKey) {
            const userTeams = userData?.userTeams || {};
            for (const [name, key] of Object.entries(userTeams)) {
              if (name.toLowerCase() === state.tradeeTeamName.toLowerCase()) {
                tradeeTeamKey = String(key);
                break;
              }
            }
          }
          if (!tradeeTeamKey) {
            await sendWhatsApp(from, `Could not find team: ${state.tradeeTeamName}. Trade cancelled.`);
            clearConversationState(from);
            return;
          }
          // Execute the trade proposal via Yahoo API
          const { sendTradeCommand } = await import("../commands/sendTrade");
          await sendTradeCommand({
            from,
            accessToken: userData?.accessToken,
            tradeeTeamKey,
            traderPlayers: state.sendPlayers,
            tradeePlayers: state.receivePlayers,
            tradeNote: state.tradeNote,
          });
          clearConversationState(from);
        } else if (lower === "no") {
          // User cancelled the trade
          await sendWhatsApp(from, "❌ Trade cancelled.");
          clearConversationState(from);
        } else if (!state.confirmPromptSent) {
          // Show confirmation prompt if not already shown and answer wasn't yes/no
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You are proposing to send ${state.sendPlayers.join(", ")} to ${state.tradeeTeamName} for ${state.receivePlayers.join(", ")}${state.tradeNote ? ". Note: " + state.tradeNote : ""}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
        // If confirmation prompt already sent and response isn't yes/no, ignore
      }
      break;
    case "help":
      // Show available commands and clear state
      await helpCommand({ from });
      clearConversationState(from);
      break;
    case "link":
      // Show OAuth linking instructions and clear state
      await linkCommand({ from });
      clearConversationState(from);
      break;
    case "authRequired":
      // Inform user they need to authenticate first
      await authRequiredCommand({ from });
      clearConversationState(from); 
      break;
    case "tokenExpired":
      // Inform user their token expired and they need to re-authenticate
      await tokenExpiredCommand({ from });
      clearConversationState(from);
      break;
    case "showTeams":
      // Display all teams in the user's league
      await showTeamsCommand({ from, accessToken: userData?.accessToken });
      clearConversationState(from);
      break;
    case "chooseTeam":
      // Multi-step team/league selection flow
      if (state.step === "noTeams") {
        // No teams available, show teams and prompt for selection
        await showTeamsCommand({ from, accessToken: userData?.accessToken });
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "chooseTeam"})
      } else if (state.step === "shown"){
        // Teams have been shown, prompt for user selection
        await chooseTeamCommand({ from });
      } else {
        // User has provided a selection, process their choice
        await chooseTeamCommand({ from, reply: body });
      }
      break;
    case "getRoster":
      // Show roster for user's team or a specific team
      if (getUserChosenTeam(from) === "") {
        // User hasn't chosen a team yet, prompt them to choose
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "getRoster", teamName: state?.teamName });
      } else {
        let teamKey = getUserChosenTeam(from);
        // If specific teamName provided, look up the team key
        if (state?.teamName) {
          let foundTeamKey: string | undefined = undefined;
          
          // Ensure leagueDict is populated for team lookups
          let leagueDict = userData?.leagueDict || {};
          if (!leagueDict || Object.keys(leagueDict).length === 0) {
            if (userData?.accessToken) {
              await fetchAndStoreLeagueTeamsForUser({ from, accessToken: userData.accessToken });
              // Refresh userData after fetching
              const updatedUserData = require("../services/userStorage").getUserToken(from);
              leagueDict = updatedUserData?.leagueDict || {};
            }
          }
          
          // First, try to find in leagueDict (all teams in current league)
          if (leagueDict && Object.keys(leagueDict).length > 0) {
            for (const [name, key] of Object.entries(leagueDict)) {
              if (name.toLowerCase() === state.teamName.toLowerCase()) {
                foundTeamKey = String(key);
                break;
              }
            }
          }
          
          // Fallback to userTeamsDict if not found in leagueDict
          if (!foundTeamKey) {
            const userTeams = getUserTeamsDict(from) || {};
            for (const [name, key] of Object.entries(userTeams)) {
              if (name.toLowerCase() === state.teamName.toLowerCase()) {
                foundTeamKey = String(key);
                break;
              }
            }
          }
          
          if (!foundTeamKey) {
            // Show available teams if lookup failed
            const availableTeams = Object.keys(leagueDict).length > 0 
              ? Object.keys(leagueDict).slice(0, 10).join(", ")
              : "None found";
            await sendWhatsApp(from, `❌ Could not find team: "${state.teamName}"\n\nAvailable teams: ${availableTeams}\n\nUse "show league" to see all teams.`);
            clearConversationState(from);
            return;
          }
          
          teamKey = foundTeamKey;
        }
        // Execute the roster command and clear state
        await getRosterCommand({ from, accessToken: userData?.accessToken, teamKey });
        clearConversationState(from);
      }
      break;
    case "getStandings":
      // Show league standings
      console.log("user league", getUserChosenLeague(from))
      if (getUserChosenLeague(from) === "") {
        // User hasn't chosen a league yet, prompt them to choose
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "getStandings" });
      } else {
        // User has chosen league, show standings
        const userLeagueKey = getUserChosenLeague(from)
        await getLeagueStandingsCommand({ from, accessToken: userData?.accessToken, leagueKey: userLeagueKey})
        clearConversationState(from)
      }
      break;  
    case "addPlayer":
      // Two-step flow: get player name → confirm addition
      if (state.step === "awaitingName") {
        // Step 1: Get the player name from user
        if (!body || body.trim().toLowerCase() === "add player") {
          await sendWhatsApp(from, "Which player would you like to add? Please reply with the player's name.");
          return;
        } else {
          // User provided a player name, move to confirmation step
          setConversationState(from, { type: "addPlayer", step: "awaitingConfirmation", addPlayer: body.trim() });
          await sendWhatsApp(from, `You want to add ${body.trim()}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
      } else if (state.step === "awaitingConfirmation" && state.addPlayer) {
        // Step 2: Handle user's confirmation response
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          const teamKey = getUserChosenTeam(from);
          const leagueKey = getLeagueKeyFromTeamKey(teamKey);
          // Check if player is available or on waivers before adding
          const { checkAndPromptWaiverClaim } = require("../commands/waiverCheck");
          const waiverResult = await checkAndPromptWaiverClaim({
            from,
            accessToken: userData?.accessToken,
            leagueKey,
            playerName: state.addPlayer
          });
          if (!waiverResult.found) {
            await sendWhatsApp(from, `❌ Could not find player: ${state.addPlayer}`);
            clearConversationState(from);
            return;
          }
          if (waiverResult.isWaiver) {
            // Player is on waivers, transition to waiver claim flow
            setConversationState(from, { type: "addPlayerWaiverPrompt", addPlayer: state.addPlayer, leagueKey, teamKey, playerKey: waiverResult.playerKey });
            await sendWhatsApp(from, `${state.addPlayer} is currently on waivers. Would you like to put in a claim? Reply 'yes' to claim or 'no' to cancel.`);
            return;
          } else {
            // Player is available, add them directly
            await addPlayer({
              accessToken: userData?.accessToken,
              leagueKey,
              teamKey,
              playerName: state.addPlayer,
              from
            });
            clearConversationState(from);
            return;
          }
        } else if (lower === "no") {
          // User cancelled, clear state
          clearConversationState(from);
        } else if (!state.confirmPromptSent) {
          // Show confirmation prompt if not already shown and answer wasn't yes/no
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You want to add ${state.addPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
        // If prompt already sent and not yes/no, do nothing
      }
      break;
    case "addPlayerWaiverPrompt":
      // Handle waiver claim confirmation for players on waivers
      {
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          // User confirmed waiver claim, submit it
          await addPlayer({
            accessToken: userData?.accessToken,
            leagueKey: state.leagueKey,
            teamKey: state.teamKey,
            playerName: state.addPlayer,
            from,
            isWaiverClaim: true
          });
          clearConversationState(from);
        } else if (lower === "no") {
          // User cancelled waiver claim
          await sendWhatsApp(from, "Waiver claim cancelled.");
          clearConversationState(from);
        } else {
          // Invalid response, prompt again
          await sendWhatsApp(from, "Reply 'yes' to put in a waiver claim or 'no' to cancel.");
        }
      }
      break;
    case "dropPlayer":
      // Two-step flow: get player name → confirm drop
      if (state.step === "awaitingName") {
        // Step 1: Get the player name from user
        if (!body || body.trim().toLowerCase() === "drop player") {
          await sendWhatsApp(from, "Which player would you like to drop? Please reply with the player's name.");
          return;
        } else {
          // User provided a player name, move to confirmation step
          setConversationState(from, { type: "dropPlayer", step: "awaitingConfirmation", dropPlayer: body.trim() });
          await sendWhatsApp(from, `You want to drop ${body.trim()}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
      } else if (state.step === "awaitingConfirmation" && state.dropPlayer) {
        // Step 2: Handle user's confirmation response
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          // User confirmed drop, execute it
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
          // User cancelled drop
          clearConversationState(from);
        } else if (!state.confirmPromptSent) {
          // Show confirmation prompt if not already shown and answer wasn't yes/no
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You want to drop ${state.dropPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
        // If confirmation prompt already sent and response isn't yes/no, ignore
      }
      break;
    case "addDropPlayer":
      // Handle add/drop player transaction confirmation (triggered from available players list)
      if (state.step === "awaitingConfirmation") {
        if (!body || (body.trim().toLowerCase() !== "yes" && body.trim().toLowerCase() !== "no")) {
          // Show confirmation prompt if user hasn't given yes/no response
          await sendWhatsApp(from, `You want to add ${state.addPlayer} and drop ${state.dropPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
          return;
        }
        if (body.trim().toLowerCase() === "yes") {
          // User confirmed the add/drop transaction
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
          // User cancelled the add/drop transaction
          clearConversationState(from);
        }
      }
      break;
    case "defaultResponse":
      // Handle unknown commands or general responses
      await defaultResponseCommand({ from, body });
      clearConversationState(from);
      break;
    case "modifyLineup":
      // Interactive lineup modification flow - allows multiple consecutive moves
      if (state.step === "awaitingPlayerMove") {
        const lowerBody = body.trim().toLowerCase();
        if (lowerBody === "done" || lowerBody === "cancel") {
          // User finished making lineup changes
          await sendWhatsApp(from, lowerBody === "done" ? "✅ Lineup modification complete." : "❌ Lineup modification cancelled.");
          clearConversationState(from);
        } else {
          // Process the lineup move command
          const result = await modifyLineupCommand({ from, body, userData });
          // If the command succeeded, prompt for more moves
          if (result === true) {
            await sendWhatsApp(from, "Would you like to make another move? Reply with another command, or send 'done' if finished.");
          }
          // Stay in modifyLineup state to allow consecutive moves
        }
      }
      break;
    case "getScoreboard":
      // Show league scoreboard for a specific week
      if (getUserChosenTeam(from) === "") {
        // User hasn't chosen a team/league yet, prompt them to choose
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "getScoreboard", week: state?.week });
      } else {
        // User has chosen team/league, show scoreboard
        await getScoreboardCommand({ from, accessToken: userData?.accessToken, week: state?.week });
        clearConversationState(from);
      }
      break;
    default:
      // Handle unrecognized conversation states
      await sendWhatsApp(from, "❓ I didn't understand that. Send 'help' to see available commands.");
      clearConversationState(from);
      break;
  }
}
