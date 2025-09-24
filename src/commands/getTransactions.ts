import { getPendingTransactionsYahoo } from "../services/yahoo";
import { getUserChosenTeam, getUserChosenLeague, setPendingTransactions, getPendingTransactions } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

// Display user's pending waivers and trades with detailed information
export async function getPendingTransactionsCommand({ from, accessToken }: { from: string; accessToken: string }) {
  const teamKey = getUserChosenTeam(from);
  const leagueKey = getUserChosenLeague(from);
  
  console.log(`[getPendingTransactionsCommand] from=${from} teamKey=${teamKey} leagueKey=${leagueKey}`);
  
  if (!teamKey || !leagueKey) {
    console.log(`[getPendingTransactionsCommand] No team or league selected for user ${from}`);
    await sendWhatsApp(from, "No team or league selected. Please choose your team first.");
    return;
  }
  try {
    // Fetch all pending transactions from Yahoo API
    const rawTransactions = await getPendingTransactionsYahoo(accessToken, teamKey, leagueKey);
    console.log(`[getPendingTransactionsCommand] Raw transactions:`, JSON.stringify(rawTransactions, null, 2));
    
    // Log transaction details for debugging
    rawTransactions.forEach((tx, idx) => {
      console.log(`[getPendingTransactionsCommand] Raw[${idx}]: type=${tx.type}, key=${tx.transaction_key}, status=${tx.status}`);
    });
    
    // Filter for active pending transactions only
    const transactions = rawTransactions.filter(tx =>
      (tx.type === "waiver" && tx.status === "pending") ||
      (tx.type === "pending_trade" && tx.status === "proposed")
    );
    console.log(`[getPendingTransactionsCommand] Filtered transactions:`, JSON.stringify(transactions, null, 2));
    // Transform transactions into simplified format for display and caching
    const mappedTx = transactions.map(tx => ({
      transaction_key: tx.transaction_key,
      type: tx.type,
      status: tx.status,
      note: tx.trade_note || tx.faab_bid || tx.waiver_priority,  // Trade note, FAAB bid, or waiver priority
      players: Array.isArray(tx.players?.player)
        ? (tx.players.player as any[]).map((p: any) => ({
            name: p.name?.full || p.name,
            transaction_type: p.transaction_data?.type,
            transaction_data: p.transaction_data
          }))
        : tx.players?.player
        ? [{
            name: tx.players.player.name?.full || tx.players.player.name,
            transaction_type: tx.players.player.transaction_data?.type,
            transaction_data: tx.players.player.transaction_data
          }]
        : []
    }));
    console.log(`[getPendingTransactionsCommand] Mapped transactions:`, JSON.stringify(mappedTx, null, 2));
    // Cache the transactions for potential future use
    setPendingTransactions(from, mappedTx);
    const memTx = getPendingTransactions(from);
    console.log(`[getPendingTransactionsCommand] In-memory pendingTransactions:`, JSON.stringify(memTx, null, 2));
    
    if (!mappedTx || mappedTx.length === 0) {
      console.log(`[getPendingTransactionsCommand] No pending waivers or trades found for user ${from}`);
      await sendWhatsApp(from, "No pending waivers or trades found for your team.");
      return;
    }
    // Build formatted message showing all pending transactions
    let msg = `⏳ *Pending Transactions*\n`;
    msg += `You currently have the following pending waivers and proposed trades for your team.\n`;
    msg += `Note: You can only view these transactions. Deleting or modifying pending moves is not supported.\n`;
    
    mappedTx.forEach((tx, idx) => {
      console.log(`[getPendingTransactionsCommand] Display[${idx}]: type=${tx.type}, key=${tx.transaction_key}, status=${tx.status}, players=${JSON.stringify(tx.players)}`);
      
      if (tx.type === "waiver") {
        // Format waiver claim information
        msg += `\n${idx + 1}. Waiver\n`;
        const added = tx.players.filter(p => p.transaction_type === "add");
        const dropped = tx.players.filter(p => p.transaction_type === "drop");
        
        if (added.length) {
          msg += `   Joining your team: ${added.map(p => p.name).join(", ")}\n`;
        }
        if (dropped.length) {
          msg += `   Leaving your team: ${dropped.map(p => p.name).join(", ")}\n`;
        }
        if (tx.note) msg += `   Waiver priority: ${tx.note}\n`;
        
      } else if (tx.type === "pending_trade") {
        // Format trade proposal information
        msg += `\n${idx + 1}. Trade\n`;
        
        // Determine which players are joining/leaving the user's team
        const received = tx.players.filter(p => p.transaction_data && p.transaction_data.destination_team_key === teamKey);
        const sent = tx.players.filter(p => p.transaction_data && p.transaction_data.source_team_key === teamKey);
        
        if (received.length) {
          msg += `   If accepted, joining your team: ${received.map(p => p.name).join(", ")}\n`;
        }
        if (sent.length) {
          msg += `   If accepted, leaving your team: ${sent.map(p => p.name).join(", ")}\n`;
        }
        if (tx.note) msg += `   Trade note: ${tx.note}\n`;
      }
    });
    
    await sendWhatsApp(from, msg);
    
  } catch (error) {
    console.error("Get pending transactions error:", error);
    await sendWhatsApp(from, "❌ Failed to get pending transactions. Please try again.");
  }
}
