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
  const fs = require('fs');
  const path = require('path');
  // Always read template from source directory, not build output
  const templatePath = path.join(process.cwd(), 'src', 'routes', 'oauth-success.html');
  let html = fs.readFileSync(templatePath, 'utf8');
    let phoneNumber = null;
    if (state) {
      phoneNumber = getPhoneNumberFromLinkCode(state as string);
      if (phoneNumber) {
        storeUserToken(phoneNumber, tokenData);
      }
    }
    // Replace placeholders
    html = html.replace('{{phoneNumber}}', phoneNumber ? phoneNumber : 'Not linked');
    html = html.replace('{{expiresIn}}', tokenData.expiresIn);
    return res.send(html);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Failed to exchange code for token");
  }
});

export default router;
