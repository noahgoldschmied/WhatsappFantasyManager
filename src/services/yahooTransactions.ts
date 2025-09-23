import { parseStringPromise } from "xml2js";
// Check if a player is on waivers in a league
export async function isPlayerOnWaivers({ accessToken, leagueKey, playerKey }: {
  accessToken: string;
  leagueKey: string;
  playerKey: string;
}): Promise<boolean> {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/players;player_keys=${playerKey}`;
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Failed to get player info: ${response.status}`);
  const xml = await response.text();
  const data = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
  const player = data?.fantasy_content?.league?.players?.player;
  // Yahoo returns player status as 'status'
  return player?.status === "W"; // 'W' means on waivers
}

// Delete a transaction (waiver or trade)
export async function deleteTransactionYahoo({ accessToken, transactionKey }: {
  accessToken: string;
  transactionKey: string;
}): Promise<boolean> {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/transaction/${transactionKey}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Failed to delete transaction: ${response.status}`);
  return true;
}

// Modify a transaction (waiver or trade)
export async function modifyTransactionYahoo({ accessToken, transactionKey, updateXml }: {
  accessToken: string;
  transactionKey: string;
  updateXml: string;
}): Promise<boolean> {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/transaction/${transactionKey}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/xml"
    },
    body: updateXml
  });
  if (!response.ok) throw new Error(`Failed to modify transaction: ${response.status}`);
  return true;
}
