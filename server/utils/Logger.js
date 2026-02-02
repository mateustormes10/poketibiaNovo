export class Logger {
    constructor(prefix = 'Server') {
        this.prefix = prefix;
        this.enabled = true;
        this.level = Logger.parseLevel(process.env.LOG_LEVEL);
    }

    static parseLevel(value) {
        const v = String(value || '').toLowerCase().trim();
        switch (v) {
            case 'silent':
            case 'none':
                return -1;
            case 'error':
                return 0;
            case 'warn':
            case 'warning':
                return 1;
            case 'info':
                return 2;
            case 'debug':
                return 3;
            default:
                // padrão: menos ruído em produção/dev
                return 2;
        }
    }

    shouldLog(level) {
        return this.enabled && this.level >= level;
    }
    
    log(...args) {
		// "log" é equivalente a INFO
		if (!this.shouldLog(2)) return;
		console.log(`[${this.getTimestamp()}] [${this.prefix}]`, ...args);
    }
    
    info(...args) {
		if (!this.shouldLog(2)) return;
		console.info(`[${this.getTimestamp()}] [${this.prefix}] [INFO]`, ...args);
    }
    
    warn(...args) {
		if (!this.shouldLog(1)) return;
		console.warn(`[${this.getTimestamp()}] [${this.prefix}] [WARN]`, ...args);
    }
    
    error(...args) {
		if (!this.shouldLog(0)) return;
		console.error(`[${this.getTimestamp()}] [${this.prefix}] [ERROR]`, ...args);
    }
    
    debug(...args) {
		if (!this.shouldLog(3)) return;
		console.debug(`[${this.getTimestamp()}] [${this.prefix}] [DEBUG]`, ...args);
    }
    
    getTimestamp() {
        return new Date().toISOString();
    }
}
