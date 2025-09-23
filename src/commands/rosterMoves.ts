

import { addPlayerYahoo, dropPlayerYahoo, addDropPlayerYahoo } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";
import { getPlayerInfoByName } from "../utils/getPlayer";

// Add a player to a team (business logic + messaging)
export async function addPlayer({ accessToken, leagueKey, teamKey, playerName, from }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  playerName: string;
  from: string;
  isWaiverClaim?: boolean;
}) {
  try {
    const player = await getPlayerInfoByName({ accessToken, leagueKey, playerName });
    if (!player || !player.player_key) {
      await sendWhatsApp(from, `❌ Could not find player: ${playerName}`);
      return false;
    }
    // If isWaiverClaim is true, you could add custom logic here (e.g. log, special handling)
    await addPlayerYahoo({ accessToken, leagueKey, teamKey, playerKey: player.player_key });
    await sendWhatsApp(from, `✅ Player ${playerName} ${isWaiverClaim ? 'waiver claim submitted!' : 'added successfully!'}`);
    return true;
  } catch (error) {
    console.error("[addPlayer] Error:", error);
    await sendWhatsApp(from, "❌ Failed to add player.");
    return false;
  }
}

// Drop a player from a team (business logic + messaging)
export async function dropPlayer({ accessToken, leagueKey, teamKey, playerName, from }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  playerName: string;
  from: string;
}) {
  try {
    const player = await getPlayerInfoByName({ accessToken, leagueKey, playerName });
    if (!player || !player.player_key) {
      await sendWhatsApp(from, `❌ Could not find player: ${playerName}`);
      return false;
    }
    await dropPlayerYahoo({ accessToken, leagueKey, teamKey, playerKey: player.player_key });
    await sendWhatsApp(from, `✅ Player ${playerName} dropped successfully!`);
    return true;
  } catch (error) {
    console.error("[dropPlayer] Error:", error);
    await sendWhatsApp(from, "❌ Failed to drop player.");
    return false;
  }
}

// Add and drop in one move (business logic + messaging)
export async function addDropPlayer({ accessToken, leagueKey, teamKey, addPlayerName, dropPlayerName, from }: {
  accessToken: string;
  leagueKey: string;
  teamKey: string;
  addPlayerName: string;
  dropPlayerName: string;
  from: string;
}) {
  try {
    const addPlayer = await getPlayerInfoByName({ accessToken, leagueKey, playerName: addPlayerName });
    const dropPlayer = await getPlayerInfoByName({ accessToken, leagueKey, playerName: dropPlayerName });
    if (!addPlayer || !addPlayer.player_key) {
      await sendWhatsApp(from, `❌ Could not find player to add: ${addPlayerName}`);
      return false;
    }
    if (!dropPlayer || !dropPlayer.player_key) {
      await sendWhatsApp(from, `❌ Could not find player to drop: ${dropPlayerName}`);
      return false;
    }
    await addDropPlayerYahoo({ accessToken, leagueKey, teamKey, addPlayerKey: addPlayer.player_key, dropPlayerKey: dropPlayer.player_key });
    await sendWhatsApp(from, `✅ Added ${addPlayerName} and dropped ${dropPlayerName} successfully!`);
    return true;
  } catch (error) {
    console.error("[addDropPlayer] Error:", error);
    await sendWhatsApp(from, "❌ Failed to add/drop player.");
    return false;
  }
}
