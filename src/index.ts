import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("⚽ Fantasy WhatsApp Bot is running on Heroku!");
});

// existing webhook route etc.

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
