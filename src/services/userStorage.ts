// In-memory user storage service for WhatsApp bot
// NOTE: In production, this should be replaced with a proper database

interface UserData {
  phoneNumber: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  yahooUserId?: string;
  userTeams?: Record<string, string>; // teamName -> teamKey mapping for user's teams
  leagueDict?: Record<string, string>; // teamName -> teamKey mapping for all league teams
  userChosenTeam?: string;
  userChosenLeague?: string;
  pendingTransactions?: any[];
}

// In-memory storage map (resets on app restart)
const users = new Map<string, UserData>();

// =============================================================================
// CORE TOKEN MANAGEMENT
// =============================================================================

// Set the user's teams dictionary (teamName -> teamKey mapping)
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

// Store OAuth token data for a user
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

// Retrieve user token data
export function getUserToken(phoneNumber: string): UserData | undefined {
  return users.get(phoneNumber);
}

// Check if user's token has expired
export function isTokenExpired(userData: UserData): boolean {
  return new Date() >= userData.expiresAt;
}

// Get all stored users (for admin/debugging)
export function getAllUsers(): UserData[] {
  return Array.from(users.values());
}

// Delete a user's data completely
export function deleteUser(phoneNumber: string): boolean {
  return users.delete(phoneNumber);
}

// =============================================================================
// OAUTH LINK CODE MANAGEMENT
// =============================================================================

// Temporary storage for OAuth linking codes
const linkCodes = new Map<string, string>();

// Generate a temporary link code for OAuth flow
export function generateLinkCode(phoneNumber: string): string {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  linkCodes.set(code, phoneNumber);
  
  // Auto-expire after 10 minutes
  setTimeout(() => {
    linkCodes.delete(code);
  }, 10 * 60 * 1000);
  
  return code;
}

// Retrieve phone number from link code (one-time use)
export function getPhoneNumberFromLinkCode(code: string): string | undefined {
  const phoneNumber = linkCodes.get(code);
  if (phoneNumber) {
    linkCodes.delete(code); // One-time use only
  }
  return phoneNumber;
}

// =============================================================================
// USER TEAM & LEAGUE SELECTION
// =============================================================================

// Set the user's currently chosen team (updates league automatically)
export function setUserChosenTeam(phoneNumber: string, teamKey: string) {
  const user = users.get(phoneNumber);
  if (user) {
    user.userChosenTeam = teamKey;
    user.userChosenLeague = getLeagueKeyFromTeamKey(teamKey);
    user.leagueDict = undefined; // Clear cached league data when team changes
  }
}

// Get the user's currently chosen team key
export function getUserChosenTeam(phoneNumber: string): string {
  const user = users.get(phoneNumber);
  return user?.userChosenTeam ?? "";
}

// Get the user's currently chosen league key
export function getUserChosenLeague(phoneNumber: string): string {
  const user = users.get(phoneNumber);
  return user?.userChosenLeague ?? "";
}

// Extract league key from team key (e.g., '423.l.12345.t.7' -> '423.l.12345')
export function getLeagueKeyFromTeamKey(teamKey: string): string {
  return teamKey.split('.t.')[0];
}

// Clear user's team/league selection and cached data
export function clearUserChosenTeam(phoneNumber: string) {
  const user = users.get(phoneNumber);
  if (user) {
    user.userChosenTeam = undefined;
    user.userChosenLeague = undefined;
    user.leagueDict = undefined;
  }
}

// =============================================================================
// TEAM DICTIONARIES & MAPPINGS
// =============================================================================

// Set the league dictionary (all teams in league: teamName -> teamKey)
export function setLeagueDict(phoneNumber: string, leagueDict: Record<string, string>) {
  const user = users.get(phoneNumber);
  if (user) {
    user.leagueDict = leagueDict;
  }
}

// Get the league dictionary (all teams in user's current league)
export function getLeagueDict(phoneNumber: string): Record<string, string> | undefined {
  const user = users.get(phoneNumber);
  return user?.leagueDict;
}

// =============================================================================
// PENDING TRANSACTIONS CACHE
// =============================================================================

// Set pending transactions cache for a user
export function setPendingTransactions(phoneNumber: string, transactions: any[]) {
  const user = users.get(phoneNumber);
  if (user) {
    user.pendingTransactions = transactions;
  }
}

// Get pending transactions cache for a user
export function getPendingTransactions(phoneNumber: string): any[] {
  const user = users.get(phoneNumber);
  return user?.pendingTransactions ?? [];
}