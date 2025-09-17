import { Router } from "express";
import { sendWhatsApp } from "../services/twilio";
import { generateLinkCode, getUserToken, isTokenExpired } from "../services/userStorage";
import { getUserTeams, getTeamRoster, refreshAccessToken } from "../services/yahoo";

const router = Router();

router.post("/whatsapp", async (req, res) => {
  const from = req.body.From?.replace("whatsapp:", "");
  const body = req.body.Body?.trim();
  const originalBody = body;
  const lowerBody = body.toLowerCase();

  console.log(`WhatsApp message from ${from}: ${body}`);

  try {
    // Help command
    if (lowerBody === "help") {
      await sendWhatsApp(from, `🏈 *Fantasy Bot Commands:*
      
*Setup:*
• link - Link your Yahoo Fantasy account

*Team Info:*
• show teams - Show your fantasy teams
• show team - Show team details
• get roster - Show your current roster

*Management:*
• drop [player name] - Drop a player

Send "help" anytime to see this menu!`);
      return res.sendStatus(200);
    }

    // Link Yahoo account
    if (lowerBody === "link") {
      const linkCode = generateLinkCode(from);
      const baseUrl = process.env.BASE_URL;
      const linkUrl = `${baseUrl}/auth/yahoo/login?state=${linkCode}`;
      
      await sendWhatsApp(from, `🔗 *Link Your Yahoo Fantasy Account*
      
Click this link to connect your Yahoo account:
${linkUrl}

This link expires in 10 minutes.
Your code: ${linkCode}`);
      return res.sendStatus(200);
    }

    // Check if user is authenticated for fantasy commands
    const userData = getUserToken(from);
    if (!userData) {
      await sendWhatsApp(from, `❌ You need to link your Yahoo Fantasy account first!
      
Send "link" to get started.`);
      return res.sendStatus(200);
    }

    // Check if token is expired and try to refresh
    if (isTokenExpired(userData)) {
      try {
        const refreshedTokens = await refreshAccessToken(userData.refreshToken);
        // Update stored tokens (in production, update database)
        userData.accessToken = refreshedTokens.accessToken;
        userData.refreshToken = refreshedTokens.refreshToken;
        userData.expiresAt = new Date(Date.now() + refreshedTokens.expiresIn * 1000);
        console.log(`Refreshed token for user: ${from}`);
      } catch (error) {
        console.error("Token refresh failed:", error);
        await sendWhatsApp(from, `❌ Your Yahoo login has expired. Please send "link" to reconnect.`);
        return res.sendStatus(200);
      }
    }

    // Show teams command
    if (lowerBody === "show teams") {
      try {
        const teamsData = await getUserTeams(userData.accessToken);
        // Send the entire raw JSON to the user for debugging
        const teamsText = "RAW JSON:\n" + JSON.stringify(teamsData);
        await sendWhatsApp(from, teamsText);
      } catch (error) {
        console.error("Get teams error:", error);
        await sendWhatsApp(from, "❌ Failed to get your teams. Please try again later.");
      }
      return res.sendStatus(200);
    }

    // Get roster command
    // Get roster command (demo: expects 'get roster [team_key]')
    if (lowerBody.startsWith("get roster")) {
      const parts = body.split(/\s+/);
      if (parts.length < 3) {
        await sendWhatsApp(from, "ℹ️ To view your roster, reply with 'get roster [team_key]'.\n\nFirst, use 'show teams' to see your team keys.");
        return res.sendStatus(200);
      }
      const teamKey = parts[2];
      try {
        const rosterData = await getTeamRoster(teamKey, userData.accessToken);
        // Parse Yahoo API response (simplified, may need adjustment)
        let players = [];
        try {
          const team = rosterData.fantasy_content.team;
          const roster = team[1].roster;
          const playerArray = roster[0].players;
          for (const p of playerArray) {
            const player = p.player;
            const name = player[1].name?.full || player[1].name || "?";
            const pos = player[1].display_position || player[1].position_type || "";
            players.push(`${name} (${pos})`);
          }
        } catch (e) {
          players = ["Could not parse roster data. Raw: " + JSON.stringify(rosterData)];
        }
        let msg = `📋 *Roster for team:* ${teamKey}\n\n`;
        msg += players.length ? players.join("\n") : "No players found.";
        await sendWhatsApp(from, msg);
      } catch (error) {
        console.error("Get roster error:", error);
        await sendWhatsApp(from, "❌ Failed to get roster. Make sure your team key is correct. Use 'show teams' to see your team keys.");
      }
      return res.sendStatus(200);
    }

    // Drop player command
    if (lowerBody.startsWith("drop ")) {
      const player = originalBody.slice(5);
      await sendWhatsApp(from, `⚠️ You asked to drop *${player}*.
      
This would remove them from your roster permanently. Reply *YES* to confirm or anything else to cancel.`);
      return res.sendStatus(200);
    }

    // Confirmation
    if (lowerBody === "yes") {
      await sendWhatsApp(from, "✅ Confirmed! (Drop functionality would execute here - coming soon!)");
      return res.sendStatus(200);
    }

    // Default response for unrecognized commands
    await sendWhatsApp(from, `❓ I didn't understand "${body}". Send "help" to see available commands.`);

  } catch (error) {
    console.error("Webhook error:", error);
    await sendWhatsApp(from, "❌ Something went wrong. Please try again later.");
  }

  res.sendStatus(200);
});

export default router;
