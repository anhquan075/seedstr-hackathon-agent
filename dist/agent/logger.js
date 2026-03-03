class Logger {
    level = 'info';
    setLevel(level) {
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map