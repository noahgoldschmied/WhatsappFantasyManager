import { Router } from "express";

const router = Router();

// Yahoo OAuth placeholder
router.get("/login", (req, res) => {
  const redirectUri = process.env.YAHOO_REDIRECT_URI;
  const clientId = process.env.YAHOO_CLIENT_ID;
  const url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  res.redirect(url);
});

router.get("/callback", (req, res) => {
  // TODO: exchange code for token
  res.send("OAuth callback received. TODO: Exchange code for token.");
});

export default router;
