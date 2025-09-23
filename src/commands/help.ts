import { sendWhatsApp } from "../services/twilio";

export async function helpCommand({ from }: { from: string }) {
  const helpText = `🤖 *Boardy WhatsApp Bot Help*

*Core commands:*
- help — Show help
- link — Link Yahoo account
- show teams / choose team — Select your team
- get roster / get standings / get matchup [week N] — View info
- modify lineup — Change lineup (e.g. 'start Mahomes at QB week 3')
- add/drop [player name] — Add/drop players
- add [player] drop [player] — Add/drop in one move
- restart — Reset session

*Trade players:*
- trade with [team name] — Start trade proposal
- propose trade — Start trade flow (will prompt for team)
  → Bot will guide you to select players to send/receive and add a note, then confirm before submitting.

*Tips:*
- All flows are step-by-step and require confirmation.
- If you haven't chosen a team, you'll be prompted before roster/matchup/trade commands.
- Valid lineup positions: QB, RB, WR, TE, K, DEF, BN, FLEX (W/R/T), Superflex (Q/W/R/T)
`;
  await sendWhatsApp(from, helpText);
}