export class Player {
    name: string;
    nflTeam: string;
    position: string;

    constructor(playerArr: any[]) {
        // Find objects in the array that contain the relevant fields
        this.name = playerArr[0].name.full;
        this.position = playerArr[0].primary_position;
        this.nflTeam = playerArr[0].editorial_team__full_name;
    }
}