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
  transactions.forEach((tx, idx) => {
    msg += `\n${idx + 1}. ${tx.type === "pending_trade" ? "Trade" : "Waiver"} (${tx.status || "pending"})\n`;
    msg += `   Transaction Key: ${tx.transaction_key}\n`;
    if (tx.players && tx.players.length) {
      tx.players.forEach((p) => {
        msg += `   - ${p.name} (${p.transaction_type})\n`;
      });
    }
    if (tx.note) msg += `   Note: ${tx.note}\n`;
  });
  msg += `\nTo delete or modify a transaction, use:\n  delete transaction [number]\n  modify transaction [number]\n(Where [number] is the transaction's number in this list.)\n`;
  await sendWhatsApp(from, msg);
}
