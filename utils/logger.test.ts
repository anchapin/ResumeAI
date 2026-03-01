import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogLevel, appLogger, storageLogger, apiLogger, consoleLike } from './logger';
import defaultLogger, { Logger } from './logger';

describe('Logger', () => {
  let testLogger: any;
  let mockConsole: any;
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleDebugSpy = vi.fn();
    consoleInfoSpy = vi.fn();
    consoleWarnSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    mockConsole = {
      debug: consoleDebugSpy,
      info: consoleInfoSpy,
      warn: consoleWarnSpy,
      error: consoleErrorSpy,
    };
    testLogger = new Logger({ level: LogLevel.DEBUG }, mockConsole);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogLevel enum', () => {
    it('has correct values', () => {
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
    });
  });

  describe('updateConfig', () => {
    it('updates logger configuration', () => {
      testLogger.updateConfig({ level: LogLevel.ERROR, enabled: false });
      testLogger.info('Should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('merges partial config with existing', () => {
      testLogger.updateConfig({ level: LogLevel.WARN });
      testLogger.info('Test message');
    });
  });

  describe('Logging methods', () => {
    it('logs debug messages', () => {
      testLogger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('logs info messages', () => {
      testLogger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('logs warning messages', () => {
      testLogger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('logs error messages', () => {
      testLogger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('logs multiple arguments', () => {
      testLogger.info('Message', { data: 'value' }, 123);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Pre-configured loggers', () => {
    it('exports appLogger', () => {
      expect(appLogger).toBeDefined();
    });

    it('exports storageLogger', () => {
      expect(storageLogger).toBeDefined();
    });

    it('exports apiLogger', () => {
      expect(apiLogger).toBeDefined();
    });
  });

  describe('consoleLike interface', () => {
    it('has log method', () => {
      expect(typeof consoleLike.log).toBe('function');
    });

    it('has info method', () => {
      expect(typeof consoleLike.info).toBe('function');
    });

    it('has warn method', () => {
      expect(typeof consoleLike.warn).toBe('function');
    });

    it('has error method', () => {
      expect(typeof consoleLike.error).toBe('function');
    });

    it('has debug method', () => {
      expect(typeof consoleLike.debug).toBe('function');
    });
  });
});
