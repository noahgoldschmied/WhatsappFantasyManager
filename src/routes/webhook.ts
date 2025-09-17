import { Router } from "express";
import { getUserToken, isTokenExpired } from "../services/userStorage";
import { refreshAccessToken } from "../services/yahoo";
import { helpCommand } from "../commands/help";
import { linkCommand } from "../commands/link";
import { authRequiredCommand } from "../commands/authRequired";
import { tokenExpiredCommand } from "../commands/tokenExpired";
import { showTeamsCommand } from "../commands/showTeams";
import { getRosterCommand } from "../commands/getRoster";
import { dropPlayerCommand } from "../commands/dropPlayer";
import { confirmDropCommand } from "../commands/confirmDrop";
import { defaultResponseCommand } from "../commands/defaultResponse";
import { showTeamCommand } from "../commands/showTeam";

const router = Router();

router.post("/whatsapp", async (req, res) => {
  const from = req.body.From?.replace("whatsapp:", "");
  const body = req.body.Body?.trim();
  const originalBody = body;
  const lowerBody = body.toLowerCase();

  console.log(`WhatsApp message from ${from}: ${body}`);

  try {
    if (lowerBody === "help") {
      await helpCommand({ from });
      return res.sendStatus(200);
    }
    if (lowerBody === "link") {
      await linkCommand({ from });
      return res.sendStatus(200);
    }
    const userData = getUserToken(from);
    if (!userData) {
      await authRequiredCommand({ from });
      return res.sendStatus(200);
    }
    if (isTokenExpired(userData)) {
      try {
        const refreshedTokens = await refreshAccessToken(userData.refreshToken);
        userData.accessToken = refreshedTokens.accessToken;
        userData.refreshToken = refreshedTokens.refreshToken;
        userData.expiresAt = new Date(Date.now() + refreshedTokens.expiresIn * 1000);
        console.log(`Refreshed token for user: ${from}`);
      } catch (error) {
        console.error("Token refresh failed:", error);
        await tokenExpiredCommand({ from });
        return res.sendStatus(200);
      }
    }
    if (lowerBody === "show teams") {
      await showTeamsCommand({ from, accessToken: userData.accessToken });
      return res.sendStatus(200);
    }
    if (lowerBody === "show team") {
      await showTeamCommand({ from });
      return res.sendStatus(200);
    }
    if (lowerBody.startsWith("get roster")) {
      const parts = body.split(/\s+/);
      if (parts.length < 3) {
        await helpCommand({ from });
        return res.sendStatus(200);
      }
      const teamKey = parts[2];
      await getRosterCommand({ from, accessToken: userData.accessToken, teamKey });
      return res.sendStatus(200);
    }
    if (lowerBody.startsWith("drop ")) {
      const player = originalBody.slice(5);
      await dropPlayerCommand({ from, player });
      return res.sendStatus(200);
    }
    if (lowerBody === "yes") {
      await confirmDropCommand({ from });
      return res.sendStatus(200);
    }
    await defaultResponseCommand({ from, body });
  } catch (error) {
    console.error("Webhook error:", error);
    await defaultResponseCommand({ from, body });
  }
  res.sendStatus(200);
});

export default router;
