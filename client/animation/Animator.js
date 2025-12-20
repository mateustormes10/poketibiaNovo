export class Animator {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.playing = false;
    }
    
    addAnimation(name, frames, frameRate = 10) {
        this.animations.set(name, {
            frames,
            frameRate,
            frameDuration: 1 / frameRate
        });
    }
    
    play(name, loop = true) {
        if (!this.animations.has(name)) {
            console.warn(`Animation ${name} not found`);
            return;
        }
        
        this.currentAnimation = this.animations.get(name);
        this.currentFrame = 0;
        this.frameTime = 0;
        this.playing = true;
        this.loop = loop;
    }
    
    stop() {
        this.playing = false;
        this.currentFrame = 0;
        this.frameTime = 0;
    }
    
    update(deltaTime) {
        if (!this.playing || !this.currentAnimation) return;
        
        this.frameTime += deltaTime;
        
        if (this.frameTime >= this.currentAnimation.frameDuration) {
            this.frameTime = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= this.currentAnimation.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.playing = false;
                    this.currentFrame = this.currentAnimation.frames.length - 1;
                }
            }
        }
    }
    
    getCurrentFrame() {
        if (!this.currentAnimation) return null;
        return this.currentAnimation.frames[this.currentFrame];
    }
}
