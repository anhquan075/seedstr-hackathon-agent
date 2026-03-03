type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private level;
    setLevel(level: LogLevel): void;
    private shouldLog;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map