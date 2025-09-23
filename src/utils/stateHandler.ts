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
import { getUserChosenTeam, getUserChosenLeague, getLeagueKeyFromTeamKey } from "../services/userStorage";

export async function stateHandler({ from, body, originalBody, state, userData }: any) {
  if (!state) return;
  switch (state.type) {
    case "waiverClaimPrompt": {
      const lower = body.trim().toLowerCase();
      if (lower === "yes") {
        // User wants to put in a waiver claim
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
  if (!state) return;
  switch (state.type) {
    case "modifyTransaction": {
      const { getPendingTransactions } = await import("../services/userStorage");
      const txList = getPendingTransactions(from);
      const idx = state.transactionIndex;
      const tx = txList[idx];
      if (!tx) {
        await sendWhatsApp(from, "❌ Invalid transaction number.");
        clearConversationState(from);
        return;
      }
      // Step 1: Ask what to change
      if (state.step === "start") {
        await sendWhatsApp(from, `You selected transaction #${idx + 1}: ${tx.type === "pending_trade" ? "Trade" : "Waiver"}. What would you like to change? (e.g. 'players', 'note', 'cancel')`);
        setConversationState(from, { type: "modifyTransaction", transactionIndex: idx, step: "awaitingField" });
        return;
      }
      // Step 2: Collect field to change
      if (state.step === "awaitingField") {
        const field = body.trim().toLowerCase();
        if (field === "cancel") {
          await sendWhatsApp(from, "❌ Modification cancelled.");
          clearConversationState(from);
          return;
        }
        if (field === "players") {
          await sendWhatsApp(from, "Which player(s) do you want to add or remove? Reply with names, e.g. 'add Nico Collins', 'remove Mike Evans'.");
          setConversationState(from, { type: "modifyTransaction", transactionIndex: idx, step: "awaitingPlayers", changes: {} });
          return;
        }
        if (field === "note") {
          await sendWhatsApp(from, "Enter the new note for this transaction.");
          setConversationState(from, { type: "modifyTransaction", transactionIndex: idx, step: "awaitingNote", changes: {} });
          return;
        }
        await sendWhatsApp(from, "❓ Unknown field. Reply 'players', 'note', or 'cancel'.");
        return;
      }
      // Step 3: Collect player changes
      if (state.step === "awaitingPlayers") {
        // For demo: just echo back and confirm
        setConversationState(from, { ...state, step: "awaitingConfirmation", changes: { ...state.changes, players: body.trim() } });
        await sendWhatsApp(from, `You want to change players: ${body.trim()}. Reply 'yes' to confirm or 'no' to cancel.`);
        return;
      }
      // Step 4: Collect note change
      if (state.step === "awaitingNote") {
        setConversationState(from, { ...state, step: "awaitingConfirmation", changes: { ...state.changes, note: body.trim() } });
        await sendWhatsApp(from, `You want to change the note to: ${body.trim()}. Reply 'yes' to confirm or 'no' to cancel.`);
        return;
      }
      // Step 5: Confirm and build XML
      if (state.step === "awaitingConfirmation") {
        const lower = body.trim().toLowerCase();
        if (lower === "no") {
          await sendWhatsApp(from, "❌ Modification cancelled.");
          clearConversationState(from);
          return;
        }
        if (lower === "yes") {
          // Build XML (demo: just update note or echo player change)
          let updateXml = "";
          if (state.changes.note) {
            updateXml = `<?xml version='1.0'?><fantasy_content><transaction><type>${tx.type}</type><note>${state.changes.note}</note></transaction></fantasy_content>`;
          } else if (state.changes.players) {
            // In real use, parse player changes and build XML
            updateXml = `<?xml version='1.0'?><fantasy_content><transaction><type>${tx.type}</type><players>${state.changes.players}</players></transaction></fantasy_content>`;
          }
          const { modifyPendingTransactionCommand } = await import("../commands/transactionActions");
          await modifyPendingTransactionCommand({ from, accessToken: userData?.accessToken, transactionKey: tx.transaction_key, updateXml });
          clearConversationState(from);
          return;
        }
        await sendWhatsApp(from, "Reply 'yes' to confirm or 'no' to cancel.");
        return;
      }
      // Fallback
      await sendWhatsApp(from, "❓ I didn't understand. Modification cancelled.");
      clearConversationState(from);
      return;
    }
    // ...existing cases...
  // ...existing code...
    case "showTransactions":
      if (userData?.accessToken) {
        const { getPendingTransactionsCommand } = await import("../commands/getTransactions");
        await getPendingTransactionsCommand({ from, accessToken: userData.accessToken });
      } else {
        await sendWhatsApp(from, "You must link your Yahoo account first.");
      }
      clearConversationState(from);
      break;
    case "trade":
      // Only allow trade flow to start with 'propose trade'
      if (state.step === "awaitingTradeeTeam") {
        // Prompt for team name if not provided or if user repeats 'propose trade'
        const input = body ? body.trim().toLowerCase() : "";
        if (!input || input === "propose trade") {
          await sendWhatsApp(from, "Which team do you want to trade with? Please reply with the team name.");
          return;
        }
        // Validate team name against leagueDict
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
        setConversationState(from, { type: "trade", step: "awaitingSendPlayers", tradeeTeamName: validTeamName });
        await sendWhatsApp(from, `Which player(s) from your team do you want to send? (comma-separated names)`);
        return;
      }
      if (state.step === "awaitingSendPlayers" && state.tradeeTeamName) {
        if (!body || body.trim() === "") {
          await sendWhatsApp(from, `Which player(s) from your team do you want to send? (comma-separated names)`);
          return;
        }
        setConversationState(from, { type: "trade", step: "awaitingReceivePlayers", tradeeTeamName: state.tradeeTeamName, sendPlayers: body.split(",").map((s: string) => s.trim()).filter(Boolean) });
        await sendWhatsApp(from, `Which player(s) from ${state.tradeeTeamName} do you want to receive? (comma-separated names)`);
        return;
      }
      if (state.step === "awaitingReceivePlayers" && state.tradeeTeamName && state.sendPlayers) {
        if (!body || body.trim() === "") {
          await sendWhatsApp(from, `Which player(s) from ${state.tradeeTeamName} do you want to receive? (comma-separated names)`);
          return;
        }
        setConversationState(from, { type: "trade", step: "awaitingTradeNote", tradeeTeamName: state.tradeeTeamName, sendPlayers: state.sendPlayers, receivePlayers: body.split(",").map((s: string) => s.trim()).filter(Boolean) });
        await sendWhatsApp(from, `Add a note for your trade proposal, or reply 'skip' to continue.`);
        return;
      }
      if (state.step === "awaitingTradeNote" && state.tradeeTeamName && state.sendPlayers && state.receivePlayers) {
        let note = body.trim().toLowerCase() === "skip" ? "" : body.trim();
        setConversationState(from, { type: "trade", step: "awaitingConfirmation", tradeeTeamName: state.tradeeTeamName, sendPlayers: state.sendPlayers, receivePlayers: state.receivePlayers, tradeNote: note });
        await sendWhatsApp(from, `You are proposing to send ${state.sendPlayers.join(", ")} to ${state.tradeeTeamName} for ${state.receivePlayers.join(", ")}${note ? ". Note: " + note : ""}. Reply 'yes' to confirm or 'no' to cancel.`);
        return;
      }
      if (state.step === "awaitingConfirmation" && state.tradeeTeamName && state.sendPlayers && state.receivePlayers) {
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          // Find tradee team key from leagueDict, fallback to userTeams
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
          // Call sendTradeCommand
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
          await sendWhatsApp(from, "❌ Trade cancelled.");
          clearConversationState(from);
        } else if (!state.confirmPromptSent) {
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You are proposing to send ${state.sendPlayers.join(", ")} to ${state.tradeeTeamName} for ${state.receivePlayers.join(", ")}${state.tradeNote ? ". Note: " + state.tradeNote : ""}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
        // If prompt already sent and not yes/no, do nothing
      }
      break;
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
        setConversationState(from, { type: "getRoster", teamName: state?.teamName });
      } else {
        let teamKey = getUserChosenTeam(from);
        // If teamName is provided, look up key from leagueDict, fallback to userTeams
        if (state?.teamName) {
          const leagueDict = userData?.leagueDict || {};
          if (leagueDict && Object.keys(leagueDict).length > 0) {
            for (const [name, key] of Object.entries(leagueDict)) {
              if (name.toLowerCase() === state.teamName.toLowerCase()) {
                teamKey = String(key);
                break;
              }
            }
          }
          // Fallback to userTeams if not found in leagueDict
          if (!teamKey) {
            const userTeams = userData?.userTeams || {};
            for (const [name, key] of Object.entries(userTeams)) {
              if (name.toLowerCase() === state.teamName.toLowerCase()) {
                teamKey = String(key);
                break;
              }
            }
          }
          if (!teamKey) {
            await sendWhatsApp(from, `Could not find team: ${state.teamName}`);
            clearConversationState(from);
            return;
          }
        }
        await getRosterCommand({ from, accessToken: userData?.accessToken, teamKey });
        clearConversationState(from);
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
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
          const teamKey = getUserChosenTeam(from);
          const leagueKey = getLeagueKeyFromTeamKey(teamKey);
          // Check if player is on waivers
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
            setConversationState(from, { type: "addPlayerWaiverPrompt", addPlayer: state.addPlayer, leagueKey, teamKey, playerKey: waiverResult.playerKey });
            await sendWhatsApp(from, `${state.addPlayer} is currently on waivers. Would you like to put in a claim? Reply 'yes' to claim or 'no' to cancel.`);
            return;
          } else {
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
          clearConversationState(from);
        } else if (!state.confirmPromptSent) {
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You want to add ${state.addPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
        // If prompt already sent and not yes/no, do nothing
      }
      break;
    case "addPlayerWaiverPrompt":
      {
        const lower = body.trim().toLowerCase();
        if (lower === "yes") {
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
          await sendWhatsApp(from, "Waiver claim cancelled.");
          clearConversationState(from);
        } else {
          await sendWhatsApp(from, "Reply 'yes' to put in a waiver claim or 'no' to cancel.");
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
        } else if (!state.confirmPromptSent) {
          setConversationState(from, { ...state, confirmPromptSent: true });
          await sendWhatsApp(from, `You want to drop ${state.dropPlayer}. Reply 'yes' to confirm or 'no' to cancel.`);
        }
        // If prompt already sent and not yes/no, do nothing
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
    case "getScoreboard":
      if (getUserChosenTeam(from) === "") {
        await chooseTeamCommand({ from });
        setConversationState(from, { type: "getScoreboard", week: state?.week });
      } else {
        await getScoreboardCommand({ from, accessToken: userData?.accessToken, week: state?.week });
        clearConversationState(from);
      }
      break;
    default:
      await sendWhatsApp(from, "❓ I didn't understand that. Send 'help' to see available commands.");
  }
      clearConversationState(from);
      break;
  }
}
