export class Zone {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.x1 = data.x1;
        this.y1 = data.y1;
        this.x2 = data.x2;
        this.y2 = data.y2;
        this.z = data.z;
        this.type = data.type || 'normal'; // normal, pvp, safe, etc
    }
    
    contains(x, y, z) {
        return x >= this.x1 && x <= this.x2 &&
               y >= this.y1 && y <= this.y2 &&
               z === this.z;
    }
    
    update(deltaTime) {
        // Lógica específica da zona
    }
}
