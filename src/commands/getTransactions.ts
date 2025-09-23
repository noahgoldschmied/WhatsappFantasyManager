import { getPendingTransactionsYahoo } from "../services/yahoo";
import { getUserChosenLeague } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

export async function getPendingTransactionsCommand({ from, accessToken }: { from: string; accessToken: string }) {
  const leagueKey = getUserChosenLeague(from);
  console.log(`[getPendingTransactionsCommand] from=${from} leagueKey=${leagueKey}`);
  if (!leagueKey) {
    console.log(`[getPendingTransactionsCommand] No league selected for user ${from}`);
    await sendWhatsApp(from, "No league selected. Please choose your team first.");
    return;
  }
  const rawTransactions = await getPendingTransactionsYahoo(accessToken, leagueKey);
  console.log(`[getPendingTransactionsCommand] Raw transactions:`, JSON.stringify(rawTransactions, null, 2));
  // Log each raw transaction type and key
  rawTransactions.forEach((tx, idx) => {
    console.log(`[getPendingTransactionsCommand] Raw[${idx}]: type=${tx.type}, key=${tx.transaction_key}, status=${tx.status}`);
  });
  // Filter for pending trades and waivers
  const transactions = rawTransactions.filter(tx => tx.type === "pending_trade" || tx.type === "waiver");
  console.log(`[getPendingTransactionsCommand] Filtered transactions:`, JSON.stringify(transactions, null, 2));
  // Map to simplified objects, include transaction_key
  const mappedTx = transactions.map(tx => ({
    transaction_key: tx.transaction_key,
    type: tx.type,
    status: tx.status,
    note: tx.trade_note || tx.faab_bid || tx.waiver_priority,
    players: Array.isArray(tx.players?.player)
      ? (tx.players.player as any[]).map((p: any) => ({
          name: p.name?.full || p.name,
          transaction_type: p.transaction_data?.type
        }))
      : tx.players?.player
      ? [{
          name: tx.players.player.name?.full || tx.players.player.name,
          transaction_type: tx.players.player.transaction_data?.type
        }]
      : []
  }));
  console.log(`[getPendingTransactionsCommand] Mapped transactions:`, JSON.stringify(mappedTx, null, 2));
  const { setPendingTransactions, getPendingTransactions } = await import("../services/userStorage");
  setPendingTransactions(from, mappedTx);
  const memTx = getPendingTransactions(from);
  console.log(`[getPendingTransactionsCommand] In-memory pendingTransactions:`, JSON.stringify(memTx, null, 2));
  if (!mappedTx || mappedTx.length === 0) {
    console.log(`[getPendingTransactionsCommand] No pending waivers or trades found for user ${from}`);
    await sendWhatsApp(from, "No pending waivers or trades found for your team.");
    return;
  }
  let msg = `⏳ *Pending Transactions*\n`;
  mappedTx.forEach((tx, idx) => {
    console.log(`[getPendingTransactionsCommand] Display[${idx}]: type=${tx.type}, key=${tx.transaction_key}, status=${tx.status}, players=${JSON.stringify(tx.players)}`);
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
