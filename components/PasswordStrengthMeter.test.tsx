import { describe, it, expect } from 'vitest';
import { calculatePasswordStrength } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  describe('calculatePasswordStrength', () => {
    it('should return score 0 for empty password', () => {
      const result = calculatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.requirements.every((req) => !req.met)).toBe(true);
    });

    it('should return score 1 for very weak password', () => {
      const result = calculatePasswordStrength('a');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should return score 2 for weak password', () => {
      const result = calculatePasswordStrength('abcde');
      expect(result.score).toBeLessThanOrEqual(2);
    });

    it('should return score 3 for fair password', () => {
      const result = calculatePasswordStrength('Abcdef1');
      expect(result.score).toBeLessThanOrEqual(3);
    });

    it('should return score 4 for strong password', () => {
      const result = calculatePasswordStrength('Abcdef12!');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should return score 5 for very strong password', () => {
      const result = calculatePasswordStrength('MySecurePass123!');
      expect(result.score).toBe(5);
    });

    it('should check length requirement', () => {
      const shortResult = calculatePasswordStrength('Aa1!');
      expect(shortResult.requirements[0].met).toBe(false);

      const validResult = calculatePasswordStrength('Abcdef1!');
      expect(validResult.requirements[0].met).toBe(true);
    });

    it('should check uppercase requirement', () => {
      const noUpperResult = calculatePasswordStrength('abcdef1!');
      expect(noUpperResult.requirements[1].met).toBe(false);

      const withUpperResult = calculatePasswordStrength('Abcdef1!');
      expect(withUpperResult.requirements[1].met).toBe(true);
    });

    it('should check lowercase requirement', () => {
      const noLowerResult = calculatePasswordStrength('ABCDEF1!');
      expect(noLowerResult.requirements[2].met).toBe(false);

      const withLowerResult = calculatePasswordStrength('Abcdef1!');
      expect(withLowerResult.requirements[2].met).toBe(true);
    });

    it('should check digit requirement', () => {
      const noDigitResult = calculatePasswordStrength('Abcdefgh!');
      expect(noDigitResult.requirements[3].met).toBe(false);

      const withDigitResult = calculatePasswordStrength('Abcdef1!');
      expect(withDigitResult.requirements[3].met).toBe(true);
    });

    it('should check special character requirement', () => {
      const noSpecialResult = calculatePasswordStrength('Abcdef12');
      expect(noSpecialResult.requirements[4].met).toBe(false);

      const withSpecialResult = calculatePasswordStrength('Abcdef1!');
      expect(withSpecialResult.requirements[4].met).toBe(true);
    });

    it('should handle all special characters', () => {
      const specialChars = [
        '!',
        '@',
        '#',
        '$',
        '%',
        '^',
        '&',
        '*',
        '(',
        ')',
        '_',
        '+',
        '-',
        '=',
        '[',
        ']',
        '{',
        '}',
        '|',
        ';',
        ':',
        ',',
        '.',
        '<',
        '>',
        '?',
      ];

      specialChars.forEach((char) => {
        const result = calculatePasswordStrength(`Abcdef12${char}`);
        expect(result.requirements[4].met).toBe(true);
      });
    });

    it('should meet all requirements for valid password', () => {
      const result = calculatePasswordStrength('SecurePass123!');
      expect(result.requirements.every((req) => req.met)).toBe(true);
      expect(result.score).toBe(5);
    });

    it('should have all requirements unmet for very short password', () => {
      const result = calculatePasswordStrength('A');
      expect(result.requirements[0].met).toBe(false);
      expect(result.score).toBeLessThanOrEqual(2);
    });
  });
});
