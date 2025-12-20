export class Mouse {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.buttons = new Map();
        this.justPressed = new Set();
        this.justReleased = new Set();
    }
    
    init() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.x = event.clientX - rect.left;
        this.y = event.clientY - rect.top;
    }
    
    handleMouseDown(event) {
        const button = event.button;
        
        if (!this.buttons.get(button)) {
            this.justPressed.add(button);
        }
        
        this.buttons.set(button, true);
    }
    
    handleMouseUp(event) {
        const button = event.button;
        this.buttons.set(button, false);
        this.justReleased.add(button);
    }
    
    isButtonDown(button) {
        return this.buttons.get(button) === true;
    }
    
    isButtonPressed(button) {
        const pressed = this.justPressed.has(button);
        this.justPressed.delete(button);
        return pressed;
    }
    
    isButtonReleased(button) {
        const released = this.justReleased.has(button);
        this.justReleased.delete(button);
        return released;
    }
    
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    clearFrame() {
        this.justPressed.clear();
        this.justReleased.clear();
    }
}
