import { sendWhatsApp } from "../services/twilio";

export async function helpCommand({ from }: { from: string }) {
  const helpText = `🤖 *Boardy WhatsApp Bot Help*

*Available commands:*
- help — Show this help message
- link — Link your Yahoo account
- show teams — List your Yahoo teams
- choose team — Select a team
- get roster — Show your roster
- get standings — Show league standings
- modify lineup — Start lineup change flow
- drop [player name] — Drop a player
- restart — Reset the conversation

*Lineup changes:*
Reply with e.g. 'start Patrick Mahomes at QB week 3' or 'bench Ezekiel Elliott week 3'.
You can make multiple moves in a row, then send 'done' when finished.

*Valid Yahoo lineup positions:*
- QB (Quarterback)
- RB (Running Back)
- WR (Wide Receiver)
- TE (Tight End)
- K (Kicker)
- DEF (Defense)
- BN (Bench)
- W/R/T (FLEX: WR/RB/TE)
- W/R (WR/RB FLEX)
- W/T (WR/TE FLEX)
- Q/W/R/T (Superflex)

You can say 'flex' and it will be converted to 'W/R/T'.
`;
  await sendWhatsApp(from, helpText);
}
