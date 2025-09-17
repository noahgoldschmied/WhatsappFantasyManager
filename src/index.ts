import express from "express";
import bodyParser from "body-parser";
import webhookRouter from "./routes/webhook";
import authRouter from "./routes/auth";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("⚽ Fantasy WhatsApp Bot is running on Heroku!");
});


// Routes
app.use("/webhook", webhookRouter);
app.use("/auth/yahoo", authRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
