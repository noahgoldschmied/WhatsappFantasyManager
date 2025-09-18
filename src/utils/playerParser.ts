export class Player {
    name: string;
    nflTeam: string;
    position: string;
    fantasySlot: string;
    byeWeek?: string;
    injuryStatus?: string;

    constructor(playerArr: any[]) {
        // Find objects in the array that contain the relevant fields
        const nameObj = playerArr.find((el) => el.name);
        const posObj = playerArr.find((el) => el.display_position);
        const nflTeamObj = playerArr.find((el) => el.editorial_team_abbr);
        const fantasySlotObj = playerArr.find((el) => el.selected_position);
        const byeObj = playerArr.find((el) => el.bye_weeks);
        const injuryObj = playerArr.find((el) => el.status || el.injury_note);

        this.name = nameObj?.name?.full ?? "?";
        this.position = posObj?.display_position ?? posObj?.primary_position ?? "?";
        this.nflTeam = nflTeamObj?.editorial_team_abbr ?? "";
        this.fantasySlot =
        fantasySlotObj?.selected_position?.find((el: any) => el.position)?.position ?? "";
        this.byeWeek = byeObj?.bye_weeks?.week;
        this.injuryStatus = injuryObj?.status ?? injuryObj?.injury_note;
    }

    displayLabel(): string {
        const bye = this.byeWeek ? ` | Bye: ${this.byeWeek}` : "";
        const injury = this.injuryStatus ? ` | Status: ${this.injuryStatus}` : "";
        return `${this.name} (${this.position}${this.nflTeam ? " - " + this.nflTeam : ""}) [${this.fantasySlot}]${bye}${injury}`;
    }
}