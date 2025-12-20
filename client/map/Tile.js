export class Tile {
    constructor(data) {
        this.type = data.type || 'grass';
        this.walkable = data.walkable !== false;
        this.sprite = data.sprite || null;
        this.layer = data.layer || 0;
    }
}
