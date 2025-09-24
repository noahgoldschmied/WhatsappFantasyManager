import { addPlayerYahoo, dropPlayerYahoo, addDropPlayerYahoo } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getPlayerInfoByName } from "../utils/getPlayer";

/**
 * ROSTER MANAGEMENT COMMANDS
 * Handles player additions, drops, and add/drop combinations for Yahoo Fantasy teams
 */

// Add a player to a team roster (handles both regular adds and waiver claims)
export async function addPlayer({ accessToken, leagueKey, teamKey, playerName, from, isWaiverClaim }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  playerName: string;
  from: string;
  isWaiverClaim?: boolean;
}) {
  try {
    // Look up player information using their name
    const player = await getPlayerInfoByName({ accessToken, leagueKey, playerName });
    if (!player || !player.player_key) {
      await sendWhatsApp(from, `❌ Could not find player: ${playerName}`);
      return false;
    }
    
    // Submit the add player request to Yahoo Fantasy API
    await addPlayerYahoo({ accessToken, leagueKey, teamKey, playerKey: player.player_key });
    
    // Send different success message based on whether it's a waiver claim or direct add
    const successMessage = isWaiverClaim 
      ? `✅ Player ${playerName} waiver claim submitted!` 
      : `✅ Player ${playerName} added successfully!`;
    
    await sendWhatsApp(from, successMessage);
    return true;
  } catch (error) {
    console.error("[addPlayer] Error:", error);
    await sendWhatsApp(from, "❌ Failed to add player.");
    return false;
  }
}

// Drop a player from a team roster
export async function dropPlayer({ accessToken, leagueKey, teamKey, playerName, from }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  playerName: string;
  from: string;
}) {
  try {
    // Look up player information to get their player key
    const player = await getPlayerInfoByName({ accessToken, leagueKey, playerName });
    if (!player || !player.player_key) {
      await sendWhatsApp(from, `❌ Could not find player: ${playerName}`);
      return false;
    }
    
    // Submit the drop player request to Yahoo Fantasy API
    await dropPlayerYahoo({ accessToken, leagueKey, teamKey, playerKey: player.player_key });
    await sendWhatsApp(from, `✅ Player ${playerName} dropped successfully!`);
    return true;
  } catch (error) {
    console.error("[dropPlayer] Error:", error);
    await sendWhatsApp(from, "❌ Failed to drop player.");
    return false;
  }
}

// Add and drop players in one atomic transaction
export async function addDropPlayer({ accessToken, leagueKey, teamKey, addPlayerName, dropPlayerName, from }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  addPlayerName: string;
  dropPlayerName: string;
  from: string;
}) {
  try {
    // Look up both players to get their player keys
    const addPlayer = await getPlayerInfoByName({ accessToken, leagueKey, playerName: addPlayerName });
    const dropPlayer = await getPlayerInfoByName({ accessToken, leagueKey, playerName: dropPlayerName });
    
    // Validate both players were found before proceeding
    if (!addPlayer || !addPlayer.player_key) {
      await sendWhatsApp(from, `❌ Could not find player to add: ${addPlayerName}`);
      return false;
    }
    if (!dropPlayer || !dropPlayer.player_key) {
      await sendWhatsApp(from, `❌ Could not find player to drop: ${dropPlayerName}`);
      return false;
    }
    
    // Execute the add/drop transaction as a single operation
    await addDropPlayerYahoo({ 
      accessToken, 
      leagueKey, 
      teamKey, 
      addPlayerKey: addPlayer.player_key, 
      dropPlayerKey: dropPlayer.player_key 
    });
    
    await sendWhatsApp(from, `✅ Added ${addPlayerName} and dropped ${dropPlayerName} successfully!`);
    return true;
  } catch (error) {
    console.error("[addDropPlayer] Error:", error);
    await sendWhatsApp(from, "❌ Failed to add/drop player.");
    return false;
  }
}
