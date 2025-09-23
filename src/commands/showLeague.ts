import { getUserToken } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

// Command to show all teams in the user's current league
export async function showLeagueCommand({ from }: { from: string }) {
  const userData = getUserToken(from);
  const leagueDict = userData?.leagueDict;
  if (!leagueDict || Object.keys(leagueDict).length === 0) {
    await sendWhatsApp(from, "No league teams found. Please choose your team or refresh your league.");
    return;
  }
  const teamList = Object.entries(leagueDict)
    .map(([name, key], idx) => `${idx + 1}. ${name}`)
    .join("\n");
  await sendWhatsApp(from, `🏆 League Teams:\n${teamList}`);
}
