export class Logger {
    constructor(prefix = 'Server') {
        this.prefix = prefix;
        this.enabled = true;
    }
    
    log(...args) {
        if (this.enabled) {
            console.log(`[${this.getTimestamp()}] [${this.prefix}]`, ...args);
        }
    }
    
    info(...args) {
        if (this.enabled) {
            console.info(`[${this.getTimestamp()}] [${this.prefix}] [INFO]`, ...args);
        }
    }
    
    warn(...args) {
        if (this.enabled) {
            console.warn(`[${this.getTimestamp()}] [${this.prefix}] [WARN]`, ...args);
        }
    }
    
    error(...args) {
        if (this.enabled) {
            console.error(`[${this.getTimestamp()}] [${this.prefix}] [ERROR]`, ...args);
        }
    }
    
    debug(...args) {
        if (this.enabled) {
            console.debug(`[${this.getTimestamp()}] [${this.prefix}] [DEBUG]`, ...args);
        }
    }
    
    getTimestamp() {
        return new Date().toISOString();
    }
}
