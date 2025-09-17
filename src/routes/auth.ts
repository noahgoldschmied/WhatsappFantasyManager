import { Router } from "express";
import { exchangeCodeForToken } from "../services/yahoo";

const router = Router();

// Yahoo OAuth login - redirect to Yahoo
router.get("/login", (req, res) => {
  const redirectUri = process.env.YAHOO_REDIRECT_URI;
  const clientId = process.env.YAHOO_CLIENT_ID;
  // Try without scope first, or use 'fantasysports' if that doesn't work
  const url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  res.redirect(url);
});

// Yahoo OAuth callback - exchange code for token
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send("No authorization code received");
  }
  
  try {
    const tokenData = await exchangeCodeForToken(code as string);
    
    // In production, you'd store this in a database associated with the user
    console.log("Access token received:", tokenData);
    
    res.send(`
      <h1>Yahoo OAuth Success!</h1>
      <p>Successfully authenticated with Yahoo Fantasy API.</p>
      <p>Access token expires in: ${tokenData.expiresIn} seconds</p>
      <p>You can now close this window.</p>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Failed to exchange code for token");
  }
});

export default router;
