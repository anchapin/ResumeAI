/**
 * Logging levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
  timestamp: boolean;
  prefix?: string;
  environment?: 'development' | 'production' | 'test';
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: getLogLevelFromEnvironment(),
  enabled: true,
  timestamp: true,
  environment: getEnvironment(),
};

/**
 * Determine log level based on environment
 */
function getLogLevelFromEnvironment(): LogLevel {
  const env = getEnvironment();

  switch (env) {
    case 'production':
      return LogLevel.WARN; // In production, only show warnings and errors by default
    case 'test':
      return LogLevel.ERROR; // In test, only show errors by default
    case 'development':
    default:
      return LogLevel.INFO; // In development, show info and above
  }
}

/**
 * Get current environment
 */
function getEnvironment(): 'development' | 'production' | 'test' {
  // Check for various environment indicators
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    const nodeEnv = process.env.NODE_ENV.toLowerCase();
    if (nodeEnv.includes('prod')) return 'production';
    if (nodeEnv.includes('test')) return 'test';
    return 'development';
  }

  // For browser environments
  if (typeof window !== 'undefined') {
    // Check for Vite environment variables
    if ((window as any).importMeta?.env?.MODE) {
      const mode = (window as any).importMeta.env.MODE.toLowerCase();
      if (mode.includes('prod')) return 'production';
      if (mode.includes('test')) return 'test';
      return 'development';
    }
  }

  // Default to development
  return 'development';
}

/**
 * Logger class for centralized logging
 */
class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get numeric value for log level (for comparison)
   */
  private getLevelValue(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG:
        return 0;
      case LogLevel.INFO:
        return 1;
      case LogLevel.WARN:
        return 2;
      case LogLevel.ERROR:
        return 3;
      default:
        return 1; // Default to INFO level
    }
  }

  /**
   * Check if logging is enabled for the given level
   */
  private isLoggable(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const currentLevelValue = this.getLevelValue(this.config.level);
    const messageLevelValue = this.getLevelValue(level);

    return messageLevelValue >= currentLevelValue;
  }

  /**
   * Format log message with timestamp and prefix
   */
  private formatMessage(level: LogLevel, message: any[]): string {
    let formattedMessage = '';

    if (this.config.timestamp) {
      formattedMessage += `[${new Date().toISOString()}] `;
    }

    if (this.config.prefix) {
      formattedMessage += `[${this.config.prefix}] `;
    }

    formattedMessage += `[${level.toUpperCase()}] `;

    // Convert all message parts to string
    const messageParts = message.map((part) =>
      typeof part === 'object' ? JSON.stringify(part, null, 2) : String(part),
    );

    return formattedMessage + messageParts.join(' ');
  }

  /**
   * Log debug message
   */
  public debug(...message: any[]): void {
    if (this.isLoggable(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message));
    }
  }

  /**
   * Log info message
   */
  public info(...message: any[]): void {
    if (this.isLoggable(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message));
    }
  }

  /**
   * Log warning message
   */
  public warn(...message: any[]): void {
    if (this.isLoggable(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message));
    }
  }

  /**
   * Log error message
   */
  public error(...message: any[]): void {
    if (this.isLoggable(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message));
    }
  }

  /**
   * Create a child logger with a specific prefix
   */
  public child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix,
    });
  }

  /**
   * Enable/disable logging based on environment
   */
  public setEnabledByEnvironment(): void {
    const env = getEnvironment();
    this.updateConfig({
      enabled: env !== 'production' || this.config.level !== LogLevel.DEBUG, // Disable debug logs in production
    });
  }
}

// Create a default logger instance
const defaultLogger = new Logger();

// Export the default logger instance and individual functions
export default defaultLogger;

// Also export individual logger instances for different modules if needed
export const appLogger = defaultLogger.child('App');
export const storageLogger = defaultLogger.child('Storage');
export const apiLogger = defaultLogger.child('API');

// Backward compatibility: export a console-like object
export const consoleLike = {
  log: defaultLogger.info,
  info: defaultLogger.info,
  warn: defaultLogger.warn,
  error: defaultLogger.error,
  debug: defaultLogger.debug,
};
