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
      return;
    }
    if (lowerBody === "link") {
      await linkCommand({ from });
      return;
    }
    const userData = getUserToken(from);
    if (!userData) {
      await authRequiredCommand({ from });
      return;
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
        return;
      }
    }
    if (lowerBody === "show teams") {
      await showTeamsCommand({ from, accessToken: userData.accessToken });
      return;
    }
    if (lowerBody === "show team") {
      await showTeamCommand({ from });
      return;
    }
    if (lowerBody.startsWith("get roster")) {
      const parts = body.split(/\s+/);
      if (parts.length < 3) {
        await helpCommand({ from });
        return;
      }
      // Accept team name instead of team key
      const teamName = parts.slice(2).join(" ");
      const { getUserTeamsDict } = await import("../services/userStorage");
      const teamsDict = getUserTeamsDict(from);
      let teamKey = teamName;
      if (teamsDict && teamsDict[teamName]) {
        teamKey = teamsDict[teamName];
      }
      await getRosterCommand({ from, accessToken: userData.accessToken, teamKey });
      return;
    }
    if (lowerBody.startsWith("drop ")) {
      const player = originalBody.slice(5);
      await dropPlayerCommand({ from, player });
      return;
    }
    if (lowerBody === "yes") {
      await confirmDropCommand({ from });
      return;
    }
    await defaultResponseCommand({ from, body });
  } catch (error) {
    console.error("Webhook error:", error);
    await defaultResponseCommand({ from, body });
  }
});

export default router;
