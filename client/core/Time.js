export class Time {
    constructor() {
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
    }
    
    update(deltaTime) {
        this.deltaTime = deltaTime;
        this.elapsedTime += deltaTime;
        this.frameCount++;
        
        // Atualiza FPS a cada segundo
        if (this.elapsedTime - this.lastFpsUpdate >= 1.0) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = this.elapsedTime;
        }
    }
}
