export class Tile {
    constructor(data) {
        this.type = data.type || 'grass';
        this.walkable = data.walkable !== false;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.z = data.z || 1;
    }
}
