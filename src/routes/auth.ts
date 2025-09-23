import { Router } from "express";
import { exchangeCodeForToken } from "../services/yahoo";
import { storeUserToken, getPhoneNumberFromLinkCode } from "../services/userStorage";

const router = Router();

// Yahoo OAuth login - redirect to Yahoo
router.get("/login", (req, res) => {
  const redirectUri = process.env.YAHOO_REDIRECT_URI;
  const clientId = process.env.YAHOO_CLIENT_ID;
  const linkCode = req.query.state; // Pass link code as state parameter
  
  // Include the link code in the state parameter so we can retrieve it later
  const url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${linkCode}`;
  res.redirect(url);
});

// Yahoo OAuth callback - exchange code for token
router.get("/callback", async (req, res) => {
  const { code, error, state } = req.query;
  
  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send("No authorization code received");
  }
  
  try {
    const tokenData = await exchangeCodeForToken(code as string);
    
    // If we have a state (link code), link this token to a WhatsApp user
    if (state) {
      const phoneNumber = getPhoneNumberFromLinkCode(state as string);
      if (phoneNumber) {
        storeUserToken(phoneNumber, tokenData);
        
        return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yahoo OAuth Success!</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7fa; color: #222; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px; }
    h1 { color: #6001d2; margin-bottom: 0.5em; }
    .success { color: #2e7d32; font-weight: bold; margin-bottom: 1em; }
    .phone { font-size: 1.1em; margin-bottom: 1em; }
    .help { background: #f3f0fa; border-radius: 8px; padding: 18px; margin-top: 2em; font-size: 0.98em; }
    ul { margin: 0.5em 0 0.5em 1.2em; }
    li { margin-bottom: 0.3em; }
    .trade { color: #6001d2; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Yahoo OAuth Success!</h1>
    <div class="success">Your Yahoo Fantasy account is now linked to WhatsApp!</div>
    <div class="phone">Phone: <b>${phoneNumber}</b></div>
    <p>You can now use fantasy commands in WhatsApp. Send <b>help</b> to see a list of commands!</p>
    <div class="help">
      <b>Boardy WhatsApp Bot Quick Help</b><br><br>
      <b>Core commands:</b>
      <ul>
        <li><b>help</b> — Show help</li>
        <li><b>link</b> — Link Yahoo account</li>
        <li><b>show teams</b> / <b>choose team</b> — Select your team</li>
        <li><b>show league</b> — List every team in your league</li>
        <li><b>get roster</b> / <b>get standings</b> / <b>get matchup [week N]</b> — View info</li>
        <li><b>modify lineup</b> — Change lineup (e.g. 'start Mahomes at QB week 3')</li>
        <li><b>add/drop [player name]</b> — Add/drop players</li>
        <li><b>add [player] drop [player]</b> — Add/drop in one move</li>
        <li><b>restart</b> — Reset session</li>
      </ul>
      <span class="trade">Trade players:</span>
      <ul>
        <li><b>propose trade</b> — Start trade flow (will prompt for team)</li>
        <li>Bot will guide you to select a team, players to send/receive, add a note, then confirm before submitting.</li>
      </ul>
      <b>Tips:</b>
      <ul>
        <li>All flows are step-by-step and require confirmation.</li>
        <li>If you haven't chosen a team, you'll be prompted before roster/matchup/trade commands.</li>
        <li>Valid lineup positions: QB, RB, WR, TE, K, DEF, BN, FLEX (W/R/T), Superflex (Q/W/R/T)</li>
      </ul>
    </div>
  </div>
</body>
</html>
        `);
      }
    }
    
    // Fallback - just show success without linking
    console.log("Access token received:", tokenData);
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yahoo OAuth Success!</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7fa; color: #222; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px; }
    h1 { color: #6001d2; margin-bottom: 0.5em; }
    .success { color: #2e7d32; font-weight: bold; margin-bottom: 1em; }
    .phone { font-size: 1.1em; margin-bottom: 1em; }
    .help { background: #f3f0fa; border-radius: 8px; padding: 18px; margin-top: 2em; font-size: 0.98em; }
    ul { margin: 0.5em 0 0.5em 1.2em; }
    li { margin-bottom: 0.3em; }
    .trade { color: #6001d2; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Yahoo OAuth Success!</h1>
    <div class="success">Successfully authenticated with Yahoo Fantasy API.</div>
    <div class="phone">Access token expires in: <b>${tokenData.expiresIn} seconds</b></div>
    <p>To link with WhatsApp, use the <b>link</b> command in your WhatsApp chat.</p>
    <div class="help">
      <b>Boardy WhatsApp Bot Quick Help</b><br><br>
      <b>Core commands:</b>
      <ul>
        <li><b>help</b> — Show help</li>
        <li><b>link</b> — Link Yahoo account</li>
        <li><b>show teams</b> / <b>choose team</b> — Select your team</li>
        <li><b>get roster</b> / <b>get standings</b> / <b>get matchup [week N]</b> — View info</li>
        <li><b>modify lineup</b> — Change lineup (e.g. 'start Mahomes at QB week 3')</li>
        <li><b>add/drop [player name]</b> — Add/drop players</li>
        <li><b>add [player] drop [player]</b> — Add/drop in one move</li>
        <li><b>restart</b> — Reset session</li>
      </ul>
      <span class="trade">Trade players:</span>
      <ul>
        <li><b>trade with [team name]</b> — Start trade proposal</li>
        <li><b>propose trade</b> — Start trade flow (will prompt for team)</li>
        <li>Bot will guide you to select players to send/receive and add a note, then confirm before submitting.</li>
      </ul>
      <b>Tips:</b>
      <ul>
        <li>All flows are step-by-step and require confirmation.</li>
        <li>If you haven't chosen a team, you'll be prompted before roster/matchup/trade commands.</li>
        <li>Valid lineup positions: QB, RB, WR, TE, K, DEF, BN, FLEX (W/R/T), Superflex (Q/W/R/T)</li>
      </ul>
    </div>
  </div>
</body>
</html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Failed to exchange code for token");
  }
});

export default router;
