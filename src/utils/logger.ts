/**
 * Structured logging utility for the frontend.
 * Provides consistent, machine-parseable log output.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  private isDevelopment = import.meta.env.DEV;

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): LogContext {
    const logEntry: LogContext = {
      event: message,
      level,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...context,
    };

    if (this.isDevelopment) {
      console[level](`[${level.toUpperCase()}]`, message, context ? context : '');
    }

    return logEntry;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.formatMessage('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.formatMessage('error', message, context);
  }
}

export const logger = new Logger();
