import { Router } from "express";
import { conversationRouter } from "../services/messageHandler";

const router = Router();

router.post("/whatsapp", async (req, res) => {
  const from = req.body.From?.replace("whatsapp:", "");
  const body = req.body.Body?.trim();
  const originalBody = body;
  console.log(`WhatsApp message from ${from}: ${body}`);
  try {
    await conversationRouter({ from, body, originalBody });
  } catch (error) {
    console.error("Webhook error:", error);
  }
});

export default router;
