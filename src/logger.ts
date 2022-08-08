import chalk from "chalk";

export const logLevels = {
    error: 0,
    warning: 1,
    info: 2,
    debug: 3,
};
type LogLevel = typeof logLevels[keyof typeof logLevels];

class Logger {
    level: LogLevel;

    constructor(level: LogLevel) {
        this.level = level;
    }
    debug(...args: any) {
        if (this.level >= logLevels.debug)
            console.log(chalk.blue("DEBUG:"), ...args);
    }
    log(...args: any) {
        if (this.level >= logLevels.info)
            console.log(chalk.green("LOG:"), ...args);
    }
    warn(...args: any) {
        if (this.level >= logLevels.warning)
            console.warn(chalk.yellow.bold("WARN:"), ...args);
    }
    error(...args: any) {
        if (this.level >= logLevels.error)
            console.error(chalk.red.bold("ERROR:"), ...args);
    }
}

const logger = new Logger(
    parseInt(process.env.LOG_LEVEL || logLevels.info.toString(), 10)
);

export default logger;
