import { Router } from "express";
import { exchangeCodeForToken } from "../services/yahoo";
import { storeUserToken, getPhoneNumberFromLinkCode } from "../services/userStorage";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// Yahoo OAuth login - redirect user to Yahoo authorization page
router.get("/login", (req, res) => {
  const redirectUri = process.env.YAHOO_REDIRECT_URI;
  const clientId = process.env.YAHOO_CLIENT_ID;
  const linkCode = req.query.state; // Link code to associate token with WhatsApp user
  
  // Build Yahoo OAuth URL with state parameter for user linking
  const url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${linkCode}`;
  res.redirect(url);
});

// Yahoo OAuth callback - exchange authorization code for access token
router.get("/callback", async (req, res) => {
  const { code, error, state } = req.query;
  
  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send("No authorization code received");
  }
  
  try {
    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code as string);
    
    // Link token to WhatsApp user if state (link code) is provided
    let phoneNumber = null;
    if (state) {
      phoneNumber = getPhoneNumberFromLinkCode(state as string);
      if (phoneNumber) {
        storeUserToken(phoneNumber, tokenData);
      }
    }
    
    // Load and customize success page template
    const templatePath = path.join(process.cwd(), 'src', 'routes', 'oauth-success.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('{{phoneNumber}}', phoneNumber ? phoneNumber : 'Not linked');
    html = html.replace('{{expiresIn}}', tokenData.expiresIn.toString());
    
    return res.send(html);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Failed to exchange code for token");
  }
});

export default router;
