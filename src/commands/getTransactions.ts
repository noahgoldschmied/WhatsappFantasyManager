import { getPendingTransactionsYahoo } from "../services/yahoo";
import { getUserChosenLeague } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

export async function getPendingTransactionsCommand({ from, accessToken }: { from: string; accessToken: string }) {
  const leagueKey = getUserChosenLeague(from);
  if (!leagueKey) {
    await sendWhatsApp(from, "No league selected. Please choose your team first.");
    return;
  }
  const transactions = await getPendingTransactionsYahoo(accessToken, leagueKey);
  if (!transactions || transactions.length === 0) {
    await sendWhatsApp(from, "No pending waivers or trades found for your team.");
    return;
  }
  let msg = `⏳ *Pending Transactions*\n`;
  for (const tx of transactions) {
    msg += `\n• ${tx.type === "pending_trade" ? "Trade" : "Waiver"} (${tx.status || "pending"})\n`;
    if (tx.players && tx.players.length) {
      for (const p of tx.players) {
        msg += `   - ${p.name} (${p.transaction_type})\n`;
      }
    }
    if (tx.note) msg += `   Note: ${tx.note}\n`;
  }
  await sendWhatsApp(from, msg);
}
