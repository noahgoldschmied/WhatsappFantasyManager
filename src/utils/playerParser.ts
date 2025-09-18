export class Player {
    name: string;
    nflTeam: string;
    position: string;

    constructor(playerArr: { name: { full: string }, primary_position: string, editorial_team__full_name: string }) {
        // Find objects in the array that contain the relevant fields
        this.name = playerArr.name.full;
        this.position = playerArr.primary_position;
        this.nflTeam = playerArr.editorial_team__full_name;
    }
}