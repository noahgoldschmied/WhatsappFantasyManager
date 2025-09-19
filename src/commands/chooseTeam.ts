import { getUserTeamsDict, setUserChosenTeam } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";
import { setConversationState, clearConversationState } from "../services/conversationState";


export async function chooseTeamCommand({ from, reply }: { from: string, reply?: string }) {
  const userTeams = getUserTeamsDict(from);
  const teamNames = userTeams ? Object.keys(userTeams) : [];

  if (!teamNames.length) {
    await sendWhatsApp(from, "You have no teams available to choose from.");
    return;
  }

  // If reply is present, handle selection
  if (reply) {
    const num = parseInt(reply, 10);
    if (!isNaN(num) && num >= 1 && num <= teamNames.length && userTeams) {
      const teamName = teamNames[num - 1];
      const teamKey = userTeams[teamName];
      setUserChosenTeam(from, teamKey);
      clearConversationState(from);
      await sendWhatsApp(from, `✅ Team selected: ${teamName}`);
      return;
    } else {
      // Invalid reply, prompt again
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

  // Otherwise, show menu and set state to awaiting
  let msg = "Let's pick your team! Here are your options:\n";
  teamNames.forEach((name, idx) => {
    msg += `${idx + 1}. ${name}\n`;
  });
  msg += "\nReply with the number of your team.";
  setConversationState(from, { type: "chooseTeam", step: "awaiting", teamNames });
  await sendWhatsApp(from, msg);
}