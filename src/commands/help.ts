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
- get matchup — Show your current matchup and scores
- modify lineup — Start lineup change flow
- add [player name] — Add a player
- drop [player name] — Drop a player
- add [player name] drop [player name] — Add and drop in one move
- add player — Start add flow (will prompt for name)
- drop player — Start drop flow (will prompt for name)
- restart — Reset the conversation

*Lineup changes:*
Reply with e.g. 'start Patrick Mahomes at QB week 3' or 'bench Ezekiel Elliott week 3'.
You can make multiple moves in a row, then send 'done' when finished.

*Add/Drop flows:*
You can add/drop players by name, or start the flow and reply with the name when prompted. All moves require confirmation before executing.

*Team selection:*
If you haven't chosen a team, you'll be prompted to do so before any roster or matchup commands.

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
