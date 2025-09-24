import { getUserToken } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

/**
 * LEAGUE TEAMS DISPLAY COMMAND
 * Shows all teams in the user's current fantasy league with numbered list format
 */

// Display all teams in the user's current league with team names
export async function showLeagueCommand({ from }: { from: string }) {
  // Retrieve user data to access league team dictionary
  const userData = getUserToken(from);
  const leagueDict = userData?.leagueDict;
  
  // Validate that league team data exists
  if (!leagueDict || Object.keys(leagueDict).length === 0) {
    await sendWhatsApp(from, "No league teams found. Please choose your team or refresh your league.");
    return;
  }
  
  // Format team list as numbered entries for easy reference
  const teamList = Object.entries(leagueDict)
    .map(([name, key], idx) => `${idx + 1}. ${name}`)
    .join("\n");
  
  // Send formatted league roster to user
  await sendWhatsApp(from, `🏆 League Teams:\n${teamList}`);
}
