
import { parseStringPromise } from "xml2js";
// Yahoo Fantasy API client

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface YahooTokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

// Exchange OAuth code for access token
export async function exchangeCodeForToken(code: string): Promise<YahooTokenData> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const redirectUri = process.env.YAHOO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Yahoo OAuth configuration");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }

  const tokenData: TokenResponse = await response.json();
  
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
  };
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<YahooTokenData> {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Yahoo OAuth configuration");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${error}`);
  }

  const tokenData: TokenResponse = await response.json();
  
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
  };
}

// Get user's fantasy teams
export async function getUserTeams(accessToken: string) {
  const response = await fetch('https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nfl/teams?format=json', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user teams: ${response.status}`);
  }

  return response.json();
}

// Get team info
export async function getTeamInfo(teamKey: string, accessToken: string) {
  const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}?format=json`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get team info: ${response.status}`);
  }

  return response.json();
}

// Get team roster
export async function getTeamRoster(teamKey: string, accessToken: string) {
  const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster/players`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get team roster: ${response.status}`);
  }
  const jsonResponse = await XMLtoJSON(response);
  return jsonResponse;
}

export async function getLeagueStandings(accessToken: string, leagueKey: string) {
  console.log("Fetching standings for leagueKey:", leagueKey);
  const response = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/standings`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get league standings: ${response.status}`);
  }

  const jsonResponse = await XMLtoJSON(response);
  return jsonResponse;
}

async function XMLtoJSON(response: Response) {
  const text = await response.text();
  const result = await parseStringPromise(text, { explicitArray: false, mergeAttrs: true });
  return result;
}

// Search for a player by name in a league and return player info (including player_key)
export async function getPlayerByName({ accessToken, leagueKey, playerName }: {
  accessToken: string;
  leagueKey: string;
  playerName: string;
}) {
  // Yahoo API: /league/{league_key}/players;search={playerName}
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/players;search=${encodeURIComponent(playerName)}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to search player: ${response.status}`);
  }
  const jsonResponse = await XMLtoJSON(response);
  // Defensive: Yahoo may return a single player or an array
  const players = jsonResponse?.fantasy_content?.league?.players?.player;
  if (!players) return null;
  if (Array.isArray(players)) {
    return players[0]; // Return first match for now
  }
  return players;
}
// Modify team lineup (PUT request)
export async function modifyLineup(params: {
  accessToken: string;
  teamKey: string;
  playerMoves: Array<{
    playerKey: string;
    position: string;
    isStarting?: boolean;
  }>;
  week: string;
}): Promise<boolean> {
  const { accessToken, teamKey, playerMoves, week } = params;
  // Build XML body for Yahoo's API (with fantasy_content root, week, and coverage_type)
  const movesXml = playerMoves.map(move =>
    `<player><player_key>${move.playerKey}</player_key><position>${move.position}</position></player>`
  ).join("");
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><fantasy_content><roster><coverage_type>week</coverage_type><week>${week}</week><players>${movesXml}</players></roster></fantasy_content>`;

  // Log the XML payload for debugging
  console.log("[modifyLineup] XML payload:", xmlBody);

  const response = await fetch(
    `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/xml",
      },
      body: xmlBody,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to modify lineup: ${response.status} ${error}`);
  }

  return true;
}

export async function getScoreboardYahoo({ accessToken, leagueKey, week }: { accessToken: string, leagueKey: string, week?: number }) {
  let url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/scoreboard`;
  if (week) {
    url += `;week=${week}`;
  }
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Failed to get scoreboard: ${response.status}`);
  const xml = await response.text();
  return await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
}
// Add a player to a team (Yahoo API)
export async function addPlayerYahoo({ accessToken, leagueKey, teamKey, playerKey }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  playerKey: string;
}): Promise<boolean> {
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<fantasy_content>
  <transaction>
    <type>add</type>
    <player>
      <player_key>${playerKey}</player_key>
      <transaction_data>
        <type>add</type>
        <destination_team_key>${teamKey}</destination_team_key>
      </transaction_data>
    </player>
  </transaction>
</fantasy_content>`;
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions`;
  console.log("[addPlayerYahoo] XML payload:", xmlBody);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/xml",
    },
    body: xmlBody,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[addPlayerYahoo] Failed: ${response.status} ${error}`);
  }
  return true;
}

// Drop a player from a team (Yahoo API)
export async function dropPlayerYahoo({ accessToken, leagueKey, teamKey, playerKey }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  playerKey: string;
}): Promise<boolean> {
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<fantasy_content>
  <transaction>
    <type>drop</type>
    <player>
      <player_key>${playerKey}</player_key>
      <transaction_data>
        <type>drop</type>
        <source_team_key>${teamKey}</source_team_key>
      </transaction_data>
    </player>
  </transaction>
</fantasy_content>`;
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions`;
  console.log("[dropPlayerYahoo] XML payload:", xmlBody);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/xml",
    },
    body: xmlBody,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[dropPlayerYahoo] Failed: ${response.status} ${error}`);
  }
  return true;
}

// Add and drop in one move (Yahoo API)
export async function addDropPlayerYahoo({ accessToken, leagueKey, teamKey, addPlayerKey, dropPlayerKey }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  addPlayerKey: string;
  dropPlayerKey: string;
}): Promise<boolean> {
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<fantasy_content>
  <transaction>
    <type>add/drop</type>
    <players>
      <player>
        <player_key>${addPlayerKey}</player_key>
        <transaction_data>
          <type>add</type>
          <destination_team_key>${teamKey}</destination_team_key>
        </transaction_data>
      </player>
      <player>
        <player_key>${dropPlayerKey}</player_key>
        <transaction_data>
          <type>drop</type>
          <source_team_key>${teamKey}</source_team_key>
        </transaction_data>
      </player>
    </players>
  </transaction>
</fantasy_content>`;
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions`;
  console.log("[addDropPlayerYahoo] XML payload:", xmlBody);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/xml",
    },
    body: xmlBody,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[addDropPlayerYahoo] Failed: ${response.status} ${error}`);
  }
  return true;
}

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
// Get all pending transactions (waivers/trades) for a league
export async function getPendingTransactionsYahoo(accessToken: string, teamKey: string, leagueKey?: string) {
  // Use Yahoo API filters for waivers and pending trades
  if (!leagueKey) throw new Error("leagueKey required for filtered transaction fetch");
  // Waivers
  const urlWaiver = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions;team_key=${teamKey};type=waiver`;
  const responseWaiver = await fetch(urlWaiver, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!responseWaiver.ok) throw new Error(`Failed to get team waivers: ${responseWaiver.status}`);
  const xmlWaiver = await responseWaiver.text();
  const dataWaiver = await parseStringPromise(xmlWaiver, { explicitArray: false, mergeAttrs: true });
  const txArrWaiver = dataWaiver?.fantasy_content?.league?.transactions?.transaction;
  const waivers = Array.isArray(txArrWaiver) ? txArrWaiver : txArrWaiver ? [txArrWaiver] : [];

  // Pending trades
  const urlTrade = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions;team_key=${teamKey};type=pending_trade`;
  const responseTrade = await fetch(urlTrade, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!responseTrade.ok) throw new Error(`Failed to get team pending trades: ${responseTrade.status}`);
  const xmlTrade = await responseTrade.text();
  const dataTrade = await parseStringPromise(xmlTrade, { explicitArray: false, mergeAttrs: true });
  const txArrTrade = dataTrade?.fantasy_content?.league?.transactions?.transaction;
  const trades = Array.isArray(txArrTrade) ? txArrTrade : txArrTrade ? [txArrTrade] : [];

  // Combine and return
  return [...waivers, ...trades];
}
// Get all teams in a league
export async function getLeagueTeams(accessToken: string, leagueKey: string) {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams`;
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Failed to get league teams: ${response.status}`);
  const xml = await response.text();
  return await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
}
// Post a trade transaction (pending_trade)
export async function postTradeYahoo({ accessToken, leagueKey, traderTeamKey, tradeeTeamKey, traderPlayerKeys, tradeePlayerKeys, tradeNote }: {
  accessToken: string;
  leagueKey: string;
  traderTeamKey: string;
  tradeeTeamKey: string;
  traderPlayerKeys: string[];
  tradeePlayerKeys: string[];
  tradeNote?: string;
}): Promise<boolean> {
  // Build XML for trade
  let playersXml = "";
  for (const pk of traderPlayerKeys) {
    playersXml += `<player>\n<player_key>${pk}</player_key>\n<transaction_data>\n<type>pending_trade</type>\n<source_team_key>${traderTeamKey}</source_team_key>\n<destination_team_key>${tradeeTeamKey}</destination_team_key>\n</transaction_data>\n</player>\n`;
  }
  for (const pk of tradeePlayerKeys) {
    playersXml += `<player>\n<player_key>${pk}</player_key>\n<transaction_data>\n<type>pending_trade</type>\n<source_team_key>${tradeeTeamKey}</source_team_key>\n<destination_team_key>${traderTeamKey}</destination_team_key>\n</transaction_data>\n</player>\n`;
  }
  const xmlBody = `<?xml version='1.0'?>\n<fantasy_content>\n  <transaction>\n    <type>pending_trade</type>\n    <trader_team_key>${traderTeamKey}</trader_team_key>\n    <tradee_team_key>${tradeeTeamKey}</tradee_team_key>\n    ${tradeNote ? `<trade_note>${tradeNote}</trade_note>` : ''}\n    <players>\n${playersXml}    </players>\n  </transaction>\n</fantasy_content>`;
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions`;
  console.log("[postTradeYahoo] XML payload:", xmlBody);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/xml",
    },
    body: xmlBody,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[postTradeYahoo] Failed: ${response.status} ${error}`);
  }
  return true;
}