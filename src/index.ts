import express from "express";
import bodyParser from "body-parser";
import webhookRouter from "./routes/webhook";
import authRouter from "./routes/auth";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Simple homepage route
app.get("/", (req, res) => {
  res.send("<h1>Welcome to Boardy Fantasy Team Manager!</h1><p>Your Heroku deployment is working.</p>");
});

// Routes
app.use("/webhook/whatsapp", webhookRouter);
app.use("/auth/yahoo", authRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
