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
          <h1>Yahoo OAuth Success!</h1>
          <p>Successfully linked your Yahoo Fantasy account to WhatsApp!</p>
          <p>Phone: ${phoneNumber}</p>
          <p>You can now use fantasy commands in WhatsApp.</p>
          <p>Try sending: "show team" or "get roster"</p>
        `);
      }
    }
    
    // Fallback - just show success without linking
    console.log("Access token received:", tokenData);
    
    res.send(`
      <h1>Yahoo OAuth Success!</h1>
      <p>Successfully authenticated with Yahoo Fantasy API.</p>
      <p>Access token expires in: ${tokenData.expiresIn} seconds</p>
      <p>To link with WhatsApp, use the link command in your WhatsApp chat.</p>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Failed to exchange code for token");
  }
});

export default router;
