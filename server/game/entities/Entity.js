export class Entity {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.type = data.type || 'entity';
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.z = data.z || 1;
        this.direction = data.direction || 'down';
    }
    
    generateId() {
        return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    update(deltaTime) {
        // Override em subclasses
    }
    
    serialize() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            z: this.z,
            direction: this.direction
        };
    }
}
