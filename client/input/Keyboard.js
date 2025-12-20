export class Keyboard {
    constructor() {
        this.keys = new Map();
        this.justPressed = new Set();
        this.justReleased = new Set();
    }
    
    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        if (!this.keys.get(key)) {
            this.justPressed.add(key);
        }
        
        this.keys.set(key, true);
    }
    
    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keys.set(key, false);
        this.justReleased.add(key);
    }
    
    isKeyDown(key) {
        return this.keys.get(key.toLowerCase()) === true;
    }
    
    isKeyPressed(key) {
        const pressed = this.justPressed.has(key.toLowerCase());
        this.justPressed.delete(key.toLowerCase());
        return pressed;
    }
    
    isKeyReleased(key) {
        const released = this.justReleased.has(key.toLowerCase());
        this.justReleased.delete(key.toLowerCase());
        return released;
    }
    
    clearFrame() {
        this.justPressed.clear();
        this.justReleased.clear();
    }
}
