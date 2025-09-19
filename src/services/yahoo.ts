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
}): Promise<boolean> {
  const { accessToken, teamKey, playerMoves } = params;
  // Build XML body for Yahoo's API
  const movesXml = playerMoves.map(move => `
    <player>
      <player_key>${move.playerKey}</player_key>
      <position>${move.position}</position>
    </player>`).join("");
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
  <roster>
    <coverage_type>date</coverage_type>
    <players>${movesXml}</players>
  </roster>`;

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
// (Removed stray closing brace)