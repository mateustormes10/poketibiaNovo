export class TickManager {
    constructor() {
        this.currentTick = 0;
        this.tickRate = 20;
        this.deltaTime = 0;
    }
    
    tick(deltaTime) {
        this.currentTick++;
        this.deltaTime = deltaTime;
    }
    
    getTick() {
        return this.currentTick;
    }
    
    getDeltaTime() {
        return this.deltaTime;
    }
}
