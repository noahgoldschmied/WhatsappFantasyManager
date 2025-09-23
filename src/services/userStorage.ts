// Simple in-memory user storage for demo purposes
// In production, use a proper database

interface UserData {
  phoneNumber: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  yahooUserId?: string;
  userTeams?: Record<string, string>; // teamName -> teamKey
  leagueDict?: Record<string, string>; // teamName -> teamKey for all teams in league
  userChosenTeam?: string;
  userChosenLeague?: string;
  pendingTransactions?: any[];
}

// Set pending transactions for a user
export function setPendingTransactions(phoneNumber: string, transactions: any[]) {
  const user = users.get(phoneNumber);
  if (user) {
    user.pendingTransactions = transactions;
  }
}

// Get pending transactions for a user
export function getPendingTransactions(phoneNumber: string): any[] {
  const user = users.get(phoneNumber);
  return user?.pendingTransactions ?? [];
}
// Set the user's teams dictionary (teamName -> teamKey)
export function setUserTeams(phoneNumber: string, teams: Record<string, string>) {
  const user = users.get(phoneNumber);
  if (user) {
    user.userTeams = teams;
  }
}

// Get the user's teams dictionary
export function getUserTeamsDict(phoneNumber: string): Record<string, string> | undefined {
  const user = users.get(phoneNumber);
  return user?.userTeams;
}

// In-memory storage (will reset when app restarts)
const users = new Map<string, UserData>();

export function storeUserToken(phoneNumber: string, tokenData: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);
  
  users.set(phoneNumber, {
    phoneNumber,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt,
  });
  
  console.log(`Stored token for user: ${phoneNumber}`);
}

export function getUserToken(phoneNumber: string): UserData | undefined {
  return users.get(phoneNumber);
}

export function isTokenExpired(userData: UserData): boolean {
  return new Date() >= userData.expiresAt;
}

export function getAllUsers(): UserData[] {
  return Array.from(users.values());
}

export function deleteUser(phoneNumber: string): boolean {
  return users.delete(phoneNumber);
}

// Generate a temporary link code for OAuth flow
const linkCodes = new Map<string, string>();

export function generateLinkCode(phoneNumber: string): string {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  linkCodes.set(code, phoneNumber);
  
  // Expire after 10 minutes
  setTimeout(() => {
    linkCodes.delete(code);
  }, 10 * 60 * 1000);
  
  return code;
}

export function getPhoneNumberFromLinkCode(code: string): string | undefined {
  const phoneNumber = linkCodes.get(code);
  if (phoneNumber) {
    linkCodes.delete(code); // One-time use
  }
  return phoneNumber;
}

export function setUserChosenTeam(phoneNumber: string, teamKey: string) {
  const user = users.get(phoneNumber);
  if (user) {
    user.userChosenTeam = teamKey;
    user.userChosenLeague = getLeagueKeyFromTeamKey(teamKey);
    user.leagueDict = undefined; // Clear leagueDict when team changes
  }
}

export function getUserChosenTeam(phoneNumber: string): string {
  const user = users.get(phoneNumber);
  return user?.userChosenTeam ?? "";
}

export function getUserChosenLeague(phoneNumber: string): string {
  const user = users.get(phoneNumber);
  return user?.userChosenLeague ?? "";
}

export function getLeagueKeyFromTeamKey(teamKey: string): string {
  // For keys like '423.l.12345.t.7'
  return teamKey.split('.t.')[0];
}

export function clearUserChosenTeam(phoneNumber: string) {
  const user = users.get(phoneNumber);
  if (user) {
    user.userChosenTeam = undefined;
    user.userChosenLeague = undefined;
    user.leagueDict = undefined;
  }
}

// Set the league dictionary (teamName -> teamKey) for a user
export function setLeagueDict(phoneNumber: string, leagueDict: Record<string, string>) {
  const user = users.get(phoneNumber);
  if (user) {
    user.leagueDict = leagueDict;
  }
}

// Get the league dictionary for a user
export function getLeagueDict(phoneNumber: string): Record<string, string> | undefined {
  const user = users.get(phoneNumber);
  return user?.leagueDict;
}