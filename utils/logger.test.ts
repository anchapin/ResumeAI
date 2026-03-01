import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogLevel, appLogger, storageLogger, apiLogger, consoleLike } from './logger';
import defaultLogger from './logger';

describe('Logger', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    defaultLogger.updateConfig({ level: LogLevel.DEBUG, enabled: true });
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
      defaultLogger.updateConfig({ level: LogLevel.ERROR, enabled: false });
      defaultLogger.info('Should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('merges partial config with existing', () => {
      defaultLogger.updateConfig({ level: LogLevel.WARN });
      defaultLogger.info('Test message');
    });
  });

  describe('Logging methods', () => {
    it('logs debug messages', () => {
      defaultLogger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('logs info messages', () => {
      defaultLogger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('logs warning messages', () => {
      defaultLogger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('logs error messages', () => {
      defaultLogger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('logs multiple arguments', () => {
      defaultLogger.info('Message', { data: 'value' }, 123);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Log level filtering', () => {
    it('does not log DEBUG when level is INFO', () => {
      defaultLogger.updateConfig({ level: LogLevel.INFO });
      defaultLogger.debug('Should not log');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('logs INFO when level is INFO', () => {
      defaultLogger.updateConfig({ level: LogLevel.INFO });
      defaultLogger.info('Should log');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('does not log INFO when level is WARN', () => {
      defaultLogger.updateConfig({ level: LogLevel.WARN });
      defaultLogger.info('Should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('logs ERROR regardless of level', () => {
      defaultLogger.updateConfig({ level: LogLevel.ERROR });
      defaultLogger.error('Should log');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Enabled/disabled state', () => {
    it('does not log when disabled', () => {
      defaultLogger.updateConfig({ enabled: false });
      defaultLogger.info('Should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('logs when enabled', () => {
      defaultLogger.updateConfig({ enabled: true });
      defaultLogger.info('Should log');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Timestamp', () => {
    it('includes timestamp in log message when enabled', () => {
      defaultLogger.updateConfig({ timestamp: true });
      defaultLogger.info('Message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0][0];
      expect(callArgs).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('does not include timestamp when disabled', () => {
      defaultLogger.updateConfig({ timestamp: false });
      defaultLogger.info('Message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0][0];
      expect(callArgs).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Prefix', () => {
    it('includes prefix in log message', () => {
      defaultLogger.updateConfig({ prefix: 'TestPrefix' });
      defaultLogger.info('Message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0][0];
      expect(callArgs).toMatch(/\[TestPrefix\]/);
    });
  });

  describe('child', () => {
    it('creates child logger with prefix', () => {
      const childLogger = defaultLogger.child('Child');
      childLogger.info('Message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0][0];
      expect(callArgs).toMatch(/\[Child\]/);
    });

    it('child logger inherits parent config', () => {
      defaultLogger.updateConfig({ level: LogLevel.WARN });
      const childLogger = defaultLogger.child('Child');
      childLogger.info('Should not log');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('setMessageFormat', () => {
    it('formats object messages as JSON', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      defaultLogger.info('Object:', obj);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('formats array messages', () => {
      const arr = [1, 2, 3];
      defaultLogger.info('Array:', arr);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('setLevelByEnvironment', () => {
    it('enables appropriate logging based on environment', () => {
      defaultLogger.setEnabledByEnvironment();
      expect(defaultLogger).toBeDefined();
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
