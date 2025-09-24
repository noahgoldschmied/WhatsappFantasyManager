import { getUserTeamsDict, setUserChosenTeam } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";
import { setConversationState, clearConversationState } from "../utils/conversationState";

// Interactive team selection command - shows numbered list and handles user choice
export async function chooseTeamCommand({ from, reply }: { from: string, reply?: string }) {
  const userTeams = getUserTeamsDict(from);
  const teamNames = userTeams ? Object.keys(userTeams) : [];

  if (!teamNames.length) {
    await sendWhatsApp(from, "You have no teams available to choose from.");
    return;
  }

  // Handle user's team selection response
  if (reply) {
    const num = parseInt(reply, 10);
    
    if (!isNaN(num) && num >= 1 && num <= teamNames.length && userTeams) {
      // Valid selection - set user's chosen team
      const teamName = teamNames[num - 1];
      const teamKey = userTeams[teamName];
      setUserChosenTeam(from, teamKey);
      clearConversationState(from);
      await sendWhatsApp(from, `✅ Team selected: ${teamName}`);
      return;
    } else {
      // Invalid selection - show options again
      let msg = "Invalid selection. Please reply with a valid number.\n\n";
      msg += "Here are your options:\n";
      teamNames.forEach((name, idx) => {
        msg += `${idx + 1}. ${name}\n`;
      });
      msg += "\nReply with the number of your team.";
      setConversationState(from, { type: "chooseTeam", step: "awaiting", teamNames });
      await sendWhatsApp(from, msg);
      return;
    }
  }

  // Initial call - show team selection menu
  let msg = "Let's pick your team! Here are your options:\n";
  teamNames.forEach((name, idx) => {
    msg += `${idx + 1}. ${name}\n`;
  });
  msg += "\nReply with the number of your team.";
  setConversationState(from, { type: "chooseTeam", step: "awaiting", teamNames });
  await sendWhatsApp(from, msg);
}