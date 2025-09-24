import Twilio from "twilio";

// Twilio WhatsApp service - handles sending messages via Twilio's WhatsApp API

// Initialize Twilio client with credentials from environment variables
const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Send a WhatsApp message to a phone number
export async function sendWhatsApp(to: string, body: string) {
  console.log(`Attempting to send WhatsApp to: ${to}`);
  console.log(`Message body: ${body}`);
  
  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER!,
      to: `whatsapp:${to}`,
      body,
    });
    
    console.log(`WhatsApp message sent successfully. SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    throw error;
  }
}
