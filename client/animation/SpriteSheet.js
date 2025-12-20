export class SpriteSheet {
    constructor(imagePath, frameWidth, frameHeight) {
        this.image = new Image();
        this.image.src = imagePath;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.loaded = false;
        
        this.image.onload = () => {
            this.loaded = true;
            this.columns = Math.floor(this.image.width / frameWidth);
            this.rows = Math.floor(this.image.height / frameHeight);
        };
    }
    
    getFrame(frameIndex) {
        if (!this.loaded) return null;
        
        const col = frameIndex % this.columns;
        const row = Math.floor(frameIndex / this.columns);
        
        return {
            x: col * this.frameWidth,
            y: row * this.frameHeight,
            width: this.frameWidth,
            height: this.frameHeight
        };
    }
    
    drawFrame(ctx, frameIndex, x, y, width, height) {
        if (!this.loaded) return;
        
        const frame = this.getFrame(frameIndex);
        if (!frame) return;
        
        ctx.drawImage(
            this.image,
            frame.x, frame.y, frame.width, frame.height,
            x, y, width || frame.width, height || frame.height
        );
    }
}
