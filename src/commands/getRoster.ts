
import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getUserTeamsDict } from "../services/userStorage";
import { getConversationState, setConversationState, clearConversationState } from "../services/conversationState";

export async function getRosterCommand({ from, accessToken, teamKey }: { from: string; accessToken: string; teamKey?: string }) {
  console.log(`[getRosterCommand] from=${from} teamKey=${teamKey}`);
  // If no teamKey, check state or prompt
  if (!teamKey) {
    const teamsDict = getUserTeamsDict(from);
    const teamNames = teamsDict ? Object.keys(teamsDict) : [];
    if (!teamsDict || teamNames.length === 0) {
      await sendWhatsApp(from, "No teams found. Please use 'show teams' first.");
      return;
    }
    let msg = 'Which team? Reply with the number:\n';
    teamNames.forEach((name, idx) => {
      msg += `${idx + 1}. ${name}\n`;
    });
    setConversationState(from, { type: "getRoster", step: "awaitingTeam", teamNames });
    await sendWhatsApp(from, msg);
    return;
  }

  // If teamKey is a number, resolve from state
  let resolvedTeamKey = teamKey;
  const state = getConversationState(from);
  if (state && state.type === "getRoster" && state.step === "awaitingTeam" && state.teamNames) {
    const num = parseInt(teamKey, 10);
    if (!isNaN(num) && num >= 1 && num <= state.teamNames.length) {
      const teamsDict = getUserTeamsDict(from);
      const teamName = state.teamNames[num - 1];
      resolvedTeamKey = teamsDict ? teamsDict[teamName] : teamKey;
      console.log(`[getRosterCommand] User selected team #${num}: ${teamName} -> ${resolvedTeamKey}`);
      clearConversationState(from);
    } else {
      await sendWhatsApp(from, "Invalid selection. Please reply with a valid number.");
      return;
    }
  }

  try {
    console.log(`[getRosterCommand] Fetching roster for teamKey=${resolvedTeamKey}`);
    const rosterData = await getTeamRoster(resolvedTeamKey, accessToken);
    let players = [];
    try {
      const team = rosterData.fantasy_content.team;
      const roster = team[1].roster;
      const playerArray = roster[0].players;
      for (const p of playerArray) {
        const player = p.player;
        const name = player[1].name?.full || player[1].name || "?";
        const pos = player[1].display_position || player[1].position_type || "";
        players.push(`${name} (${pos})`);
      }
    } catch (e) {
      players = ["Could not parse roster data. Raw: " + JSON.stringify(rosterData)];
    }
    let msg = `📋 *Roster for team:* ${resolvedTeamKey}\n\n`;
    msg += players.length ? players.join("\n") : "No players found.";
    await sendWhatsApp(from, msg);
  } catch (error) {
    console.error("Get roster error:", error);
    await sendWhatsApp(from, "❌ Failed to get roster. Make sure your team key is correct. Use 'show teams' to see your team keys.");
  }
}
