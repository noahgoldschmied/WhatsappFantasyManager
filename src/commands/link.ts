import { generateLinkCode } from "../services/userStorage";
import { sendWhatsApp } from "../services/twilio";

export async function linkCommand({ from }: { from: string }) {
  const linkCode = generateLinkCode(from);
  const baseUrl = process.env.BASE_URL;
  const linkUrl = `${baseUrl}/auth/yahoo/login?state=${linkCode}`;
  await sendWhatsApp(from, `🔗 *Link Your Yahoo Fantasy Account*
      
Click this link to connect your Yahoo account:
${linkUrl}

This link expires in 10 minutes.
Your code: ${linkCode}`);
}
