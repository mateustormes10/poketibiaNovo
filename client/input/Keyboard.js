
// Keyboard input handler with support for configurable controls
export class Keyboard {
    constructor(controlConfig = null) {
        this.keys = new Map();
        this.justPressed = new Set();
        this.justReleased = new Set();
        this.controlConfig = controlConfig; // expects { up: 'ArrowUp', ... }
    }

    setControlConfig(controlConfig) {
        this.controlConfig = controlConfig;
    }

    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(event) {
        const key = event.key;
        const keyLower = key.toLowerCase();
        if (!this.keys.get(keyLower)) {
            this.justPressed.add(keyLower);
        }
        this.keys.set(keyLower, true);
    }

    handleKeyUp(event) {
        const key = event.key;
        const keyLower = key.toLowerCase();
        this.keys.set(keyLower, false);
        this.justReleased.add(keyLower);
    }

    // Checks if the key (string) is currently down
    isKeyDown(key) {
        return this.keys.get(key.toLowerCase()) === true;
    }

    // Checks if the key (string) was just pressed this frame
    isKeyPressed(key) {
        const pressed = this.justPressed.has(key.toLowerCase());
        this.justPressed.delete(key.toLowerCase());
        return pressed;
    }

    // Checks if the key (string) was just released this frame
    isKeyReleased(key) {
        const released = this.justReleased.has(key.toLowerCase());
        this.justReleased.delete(key.toLowerCase());
        return released;
    }

    // Checks if the action (from config) is pressed
    isActionPressed(action) {
        if (!this.controlConfig) return false;
        const key = this.controlConfig[action];
        if (!key) return false;
        // Accept both 'ArrowUp' and 'arrowup' etc
        return this.isKeyPressed(key) || this.isKeyPressed(key.toLowerCase());
    }

    // Checks if the action (from config) is down
    isActionDown(action) {
        if (!this.controlConfig) return false;
        const key = this.controlConfig[action];
        if (!key) return false;
        return this.isKeyDown(key) || this.isKeyDown(key.toLowerCase());
    }

    clearFrame() {
        this.justPressed.clear();
        this.justReleased.clear();
    }
}
