import { describe, it, expect } from 'vitest';
import { sanitizeMealWeight, jsToYaml, extractBalancedJson } from './server_pure_helpers';

describe('server_pure_helpers', () => {
  describe('sanitizeMealWeight', () => {
    it('returns fallback for an overlong digit string that causes overflow', () => {
      const overlong = "150" + "0".repeat(30);
      const fallback = 100;
      // We want to make sure it doesn't return Infinity
      const result = sanitizeMealWeight(overlong, fallback);
      expect(result).not.toBe(Infinity);
      expect(result).toBe(fallback);
    });

    it('returns rounded number for valid input', () => {
      expect(sanitizeMealWeight("150.4", 100)).toBe(150);
      expect(sanitizeMealWeight(150.6, 100)).toBe(151);
    });
  });

  describe('jsToYaml', () => {
    it('uses literal-block (|) for strings containing newlines', () => {
      const input = "line1\nline2";
      const result = jsToYaml(input);
      // Based on jsToYaml implementation:
      // if (val.includes("\n")) { return "|\n" + val.split("\n").map(line => spaces + "  " + line).join("\n"); }
      // With indent=0, spaces="", expected:
      // "|\n  line1\n  line2"
      expect(result).toBe("|\n  line1\n  line2");
    });
  });

  describe('extractBalancedJson', () => {
    it('recovers the first balanced block from wrapped/garbage input', () => {
      const input = "```json\n{\"a\": 1}\n``` trailing garbage";
      const result = extractBalancedJson(input);
      expect(result).toBe('{"a": 1}');
    });
  });
});
