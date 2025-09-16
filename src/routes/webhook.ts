import { Router } from "express";
import { sendWhatsApp } from "../services/twilio";

const router = Router();

router.post("/", async (req, res) => {
  const from = req.body.From?.replace("whatsapp:", "");
  const body = req.body.Body?.trim().toLowerCase();

  if (body?.startsWith("drop ")) {
    const player = body.slice(5);
    await sendWhatsApp(from, `You asked to drop ${player}. Reply YES to confirm.`);
    return res.sendStatus(200);
  }

  if (body === "yes") {
    await sendWhatsApp(from, "Confirmed! (This would call Yahoo API)");
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

export default router;
