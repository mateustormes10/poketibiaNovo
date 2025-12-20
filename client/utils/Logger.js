export class Logger {
    constructor(prefix = 'Game') {
        this.prefix = prefix;
        this.enabled = true;
    }
    
    log(...args) {
        if (this.enabled) {
            console.log(`[${this.prefix}]`, ...args);
        }
    }
    
    warn(...args) {
        if (this.enabled) {
            console.warn(`[${this.prefix}]`, ...args);
        }
    }
    
    error(...args) {
        if (this.enabled) {
            console.error(`[${this.prefix}]`, ...args);
        }
    }
    
    info(...args) {
        if (this.enabled) {
            console.info(`[${this.prefix}]`, ...args);
        }
    }
    
    debug(...args) {
        if (this.enabled) {
            console.debug(`[${this.prefix}]`, ...args);
        }
    }
}
