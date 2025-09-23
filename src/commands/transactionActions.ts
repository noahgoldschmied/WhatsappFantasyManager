import { deleteTransactionYahoo, modifyTransactionYahoo } from "../services/yahooTransactions";
import { sendWhatsApp } from "../services/twilio";
import { getPendingTransactions } from "../services/userStorage";

// Delete a pending transaction
export async function deletePendingTransactionCommand({ from, accessToken, transactionKey }: {
  from: string;
  accessToken: string;
  transactionKey: string;
}) {
  // transactionKey is now an index (1-based)
  const idx = parseInt(transactionKey, 10) - 1;
  const txList = getPendingTransactions(from);
  if (!txList[idx]) {
    await sendWhatsApp(from, `❌ Invalid transaction number.`);
    return;
  }
  try {
    await deleteTransactionYahoo({ accessToken, transactionKey: txList[idx].transaction_key });
    await sendWhatsApp(from, `✅ Transaction ${transactionKey} deleted.`);
  } catch (err) {
    await sendWhatsApp(from, `❌ Failed to delete transaction: ${err}`);
  }
}

// Modify a pending transaction
export async function modifyPendingTransactionCommand({ from, accessToken, transactionKey, updateXml }: {
  from: string;
  accessToken: string;
  transactionKey: string;
  updateXml: string;
}) {
  // transactionKey is now an index (1-based)
  const idx = parseInt(transactionKey, 10) - 1;
  const txList = getPendingTransactions(from);
  if (!txList[idx]) {
    await sendWhatsApp(from, `❌ Invalid transaction number.`);
    return;
  }
  try {
    await modifyTransactionYahoo({ accessToken, transactionKey: txList[idx].transaction_key, updateXml });
    await sendWhatsApp(from, `✅ Transaction ${transactionKey} updated.`);
  } catch (err) {
    await sendWhatsApp(from, `❌ Failed to update transaction: ${err}`);
  }
}
