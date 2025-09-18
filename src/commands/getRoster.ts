import { getTeamRoster } from "../services/yahoo";
import { sendWhatsApp } from "../services/twilio";

type PlayerEntry = { name: string; position: string };

function safeString(v: any) {
  if (!v && v !== 0) return "";
  return String(v);
}

function findPlayersObject(teamNode: any): any | undefined {
  // teamNode is usually rosterData.fantasy_content.team[1]
  if (!teamNode) return undefined;

  // If roster is directly present
  if (teamNode.roster) return teamNode.roster;

  // Sometimes teamNode is an array where one element has roster
  if (Array.isArray(teamNode)) {
    const found = teamNode.find((x) => x && typeof x === "object" && x.roster);
    if (found) return found.roster;
  }

  // If teamNode[0] exists and has roster
  if (teamNode[0] && teamNode[0].roster) return teamNode[0].roster;

  // Search shallowly for any sub-object that has players
  for (const k of Object.keys(teamNode)) {
    const v = teamNode[k];
    if (v && typeof v === "object" && (v.players || (Array.isArray(v) && v.some((e: any) => e && e.players)))) {
      return v.players ? v : v;
    }
  }

  return undefined;
}

function extractDetailsFromPlayerArray(playerArr: any[]): { name: string; position: string } {
  // playerArr is usually an array of mixed entries; find the object containing name/position
  const obj = (playerArr || []).find(
    (e) =>
      e &&
      typeof e === "object" &&
      (e.name || e.display_position || e.primary_position || e.position || e.editorial_team_abbr || e.full || e.first_name || e.last_name)
  ) as any;

  const fallbackObj = obj || (playerArr && playerArr[1]) || (playerArr && playerArr[0]) || {};

  // Name detection
  const name =
    fallbackObj?.name?.full ||
    ((fallbackObj?.name && typeof fallbackObj.name === "string") ? fallbackObj.name : undefined) ||
    (fallbackObj?.name?.first || fallbackObj?.name?.last ? [fallbackObj.name?.first, fallbackObj.name?.last].filter(Boolean).join(" ") : undefined) ||
    fallbackObj?.full ||
    ((fallbackObj?.first_name || fallbackObj?.last_name) ? [fallbackObj.first_name, fallbackObj.last_name].filter(Boolean).join(" ") : undefined) ||
    // last resort: try to find any nested 'name' inside any element
    (playerArr || []).map((e) => e && e.name && (e.name.full || (typeof e.name === "string" && e.name))).find(Boolean) ||
    "?";

  // Position detection
  const position =
    fallbackObj?.display_position ||
    fallbackObj?.primary_position ||
    fallbackObj?.position ||
    fallbackObj?.position_type ||
    fallbackObj?.eligible_positions || // sometimes an array/object
    "";

  return { name: safeString(name), position: safeString(position) };
}

function parseRosterData(rosterData: any): PlayerEntry[] {
  const players: PlayerEntry[] = [];
  const team = rosterData?.fantasy_content?.team;
  if (!team) {
    console.warn("parseRosterData: no fantasy_content.team found");
    return players;
  }

  const teamNode = team[1] ?? team; // usually team[1] holds details
  const rosterBlock = findPlayersObject(teamNode);

  if (!rosterBlock) {
    console.warn("parseRosterData: could not locate roster/players block", JSON.stringify(teamNode).slice(0, 1000));
    return players;
  }

  // rosterBlock might be { players: { "0": {...}, "1": {...}, count: "14" } }
  // or it could be an array like [ { players: { ... } } ] or it might already be players object
  let playersObj = rosterBlock.players ?? rosterBlock;

  // If rosterBlock is something like team[1].roster (array), try to get .players
  if (Array.isArray(rosterBlock) && rosterBlock.length > 0 && rosterBlock[0].players) {
    playersObj = rosterBlock[0].players;
  }

  // If playersObj is an actual array (some responses give an array)
  if (Array.isArray(playersObj)) {
    for (const entry of playersObj) {
      const playerArr = entry?.player ?? entry;
      if (!playerArr) continue;
      const details = Array.isArray(playerArr) ? extractDetailsFromPlayerArray(playerArr) : { name: safeString(playerArr?.name || "?"), position: safeString(playerArr?.display_position || "") };
      players.push(details);
    }
    return players;
  }

  // If playersObj is an object with numeric keys plus 'count'
  const count = Number(playersObj?.count ?? Object.keys(playersObj ?? {}).filter((k) => k !== "count").length) || 0;
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      const entry = playersObj[i] ?? playersObj[String(i)];
      if (!entry) {
        // sometimes entries are nested differently - try to find any object with .player
        continue;
      }
      const playerArr = entry.player ?? entry;
      if (!playerArr) continue;
      const details = Array.isArray(playerArr) ? extractDetailsFromPlayerArray(playerArr) : { name: safeString(playerArr?.name || "?"), position: safeString(playerArr?.display_position || "") };
      players.push(details);
    }
    return players;
  }

  // Fallback: try to iterate shallow keys and find player objects
  for (const k of Object.keys(playersObj || {})) {
    const maybe = playersObj[k];
    if (!maybe) continue;
    const playerArr = maybe.player ?? maybe;
    if (!playerArr) continue;
    const details = Array.isArray(playerArr) ? extractDetailsFromPlayerArray(playerArr) : { name: safeString(playerArr?.name || "?"), position: safeString(playerArr?.display_position || "") };
    players.push(details);
  }

  return players;
}

export async function getRosterCommand({
  from,
  accessToken,
  teamKey,
}: {
  from: string;
  accessToken: string;
  teamKey: string;
}) {
  console.log(`[getRosterCommand] from=${from} teamKey=${teamKey}`);
  try {
    console.log(`[getRosterCommand] Fetching roster for teamKey=${teamKey}`);
    const rosterData = await getTeamRoster(teamKey, accessToken);

    let playersOutput: string[] = [];
    try {
      const parsedPlayers = parseRosterData(rosterData);
      if (parsedPlayers.length === 0) {
        // helpful debug: include a short dump so you can see why parsing failed
        console.warn("[getRosterCommand] No players parsed. Raw team node (truncated):", JSON.stringify(rosterData?.fantasy_content?.team ?? rosterData, null, 2).slice(0, 1600));
        playersOutput = ["No players found / could not parse roster."];
      } else {
        playersOutput = parsedPlayers.map((p) => `${p.name} (${p.position || "—"})`);
      }
    } catch (e) {
      console.error("[getRosterCommand] roster parse error:", e);
      playersOutput = ["Could not parse roster data. Raw: " + JSON.stringify(rosterData)];
    }

    let msg = `📋 *Roster for team:* ${teamKey}\n\n`;
    msg += playersOutput.length ? playersOutput.join("\n") : "No players found.";
    await sendWhatsApp(from, msg);
  } catch (error) {
    console.error("Get roster error:", error);
    await sendWhatsApp(
      from,
      "❌ Failed to get roster. Make sure your team key is correct. Use 'show teams' to see your team keys."
    );
  }
}
