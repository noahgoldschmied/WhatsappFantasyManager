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
        // Parse Yahoo API response (it has a complex nested structure)
        let teamsText = "🏈 *Your Fantasy Teams:*\n\n";
        
        // This is a simplified parser - you may need to adjust based on actual API response
        if (teamsData.fantasy_content?.users?.[0]?.user?.[1]?.games) {
          const games = teamsData.fantasy_content.users[0].user[1].games;
          // Parse teams from the complex Yahoo structure
          teamsText += "Teams found! (Raw data logged for debugging)";
        } else {
          teamsText += "No teams found or unexpected API response format.";
        }
        
        console.log("Teams API response:", JSON.stringify(teamsData, null, 2));
        await sendWhatsApp(from, teamsText);
      } catch (error) {
        console.error("Get teams error:", error);
        await sendWhatsApp(from, "❌ Failed to get your teams. Please try again later.");
      }
      return res.sendStatus(200);
    }

    // Get roster command
    if (lowerBody === "get roster") {
      await sendWhatsApp(from, "🔄 Getting roster feature is in development. First, use 'show teams' to see your team keys.");
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
