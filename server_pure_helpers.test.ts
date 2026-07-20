import { describe, it, expect } from 'vitest';
import { 
  sanitizeMealWeight, 
  jsToYaml, 
  extractBalancedJson, 
  sanitizeString,
  findItemIndexInList,
  extractUSDANutrientsPer100g,
  extractOFFNutrientsPer100g
} from './server_pure_helpers';

describe('server_pure_helpers', () => {
  describe('sanitizeMealWeight', () => {
    it('returns fallback for an overlong digit string that causes overflow', () => {
      const overlong = "150" + "0".repeat(30);
      const fallback = 100;
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
      expect(result).toBe("|\n  line1\n  line2");
    });
  });

  describe('extractBalancedJson', () => {
    it('recovers the first balanced block from wrapped/garbage input', () => {
      const input = "```json\n{\"a\": 1}\n``` trailing garbage";
      const result = extractBalancedJson(input);
      expect(result).toBe('{"a": 1}');
    });

    it('recovers correctly when nested curly braces are present', () => {
      const input = "Some leading text {\"outer\": {\"inner\": 42}} some trailing text";
      const result = extractBalancedJson(input);
      expect(result).toBe('{"outer": {"inner": 42}}');
    });
  });

  describe('sanitizeString', () => {
    it('uses fallback for null, undefined, or empty/spaces values', () => {
      expect(sanitizeString(null, "fallback")).toBe("fallback");
      expect(sanitizeString(undefined, "fallback")).toBe("fallback");
      expect(sanitizeString("undefined", "fallback")).toBe("fallback");
      expect(sanitizeString("   ", "fallback")).toBe("fallback");
    });

    it('returns valid string unchanged', () => {
      expect(sanitizeString("hello", "fallback")).toBe("hello");
      expect(sanitizeString(123, "fallback")).toBe("123");
    });
  });

  describe('findItemIndexInList', () => {
    const items = [
      { name: "Scrambled Eggs", canonicalDbName: "egg_scrambled", dbId: "123" },
      { name: "Sourdough Toast", canonicalDbName: "bread_sourdough", dbId: "456" },
      { name: "Avocado Slices", canonicalDbName: "avocado_raw", dbId: "789" }
    ];

    it('matches exact dbId first', () => {
      expect(findItemIndexInList(items, "Sourdough Toast", "789")).toBe(2); // Matches dbId 789 (Avocado) despite name mismatch
      expect(findItemIndexInList(items, "Non-existent", "123")).toBe(0); // Matches dbId 123 (Eggs)
    });

    it('matches exact name case-insensitively', () => {
      expect(findItemIndexInList(items, "scrambled eggs", null)).toBe(0);
      expect(findItemIndexInList(items, "Avocado Slices", null)).toBe(2);
    });

    it('matches canonicalDbName case-insensitively', () => {
      expect(findItemIndexInList(items, "egg_scrambled", null)).toBe(0);
      expect(findItemIndexInList(items, "bread_sourdough", null)).toBe(1);
    });

    it('matches prefix or suffix', () => {
      expect(findItemIndexInList(items, "Scrambled", null)).toBe(0); // prefix match
      expect(findItemIndexInList(items, "Toast", null)).toBe(1); // suffix match
    });

    it('matches via classic substring includes fallback', () => {
      expect(findItemIndexInList(items, "Slices", null)).toBe(2);
      expect(findItemIndexInList(items, "ourdo", null)).toBe(1);
    });

    it('matches via word-by-word intersection fallback', () => {
      // "Delicious Sourdough" has word "Sourdough" which is in canonical "bread_sourdough" / "Sourdough Toast"
      expect(findItemIndexInList(items, "Delicious Sourdough", null)).toBe(1);
    });

    it('returns -1 for completely unrecognized names', () => {
      expect(findItemIndexInList(items, "Peanut Butter", null)).toBe(-1);
    });
  });

  describe('extractUSDANutrientsPer100g', () => {
    it('extracts primary and trace nutrients correctly from foodNutrients array', () => {
      const mockUSDAFood = {
        foodNutrients: [
          { nutrientName: "Protein", value: 12.5 },
          { nutrientName: "Total lipid (fat)", value: 9.8 },
          { nutrientName: "Fatty acids, total saturated", value: 3.2 },
          { nutrientName: "Energy", value: 650, unitName: "kJ" }, // Should be converted to kcal (650 / 4.184 = 155)
          { nutrientName: "Sodium, Na", value: 450 },
          { nutrientName: "Iron, Fe", value: 1.8 }
        ]
      };

      const profile = extractUSDANutrientsPer100g(mockUSDAFood);
      expect(profile.protein).toBe(12.5);
      expect(profile.totalFat).toBe(9.8);
      expect(profile.saturatedFat).toBe(3.2);
      expect(profile.calories).toBe(155); // kJ to kcal conversion
      expect(profile.sodium).toBe(450);
      expect(profile.iron).toBe(1.8);
    });

    it('handles empty/missing nutrients gracefully', () => {
      const profile = extractUSDANutrientsPer100g({});
      expect(profile).toEqual({});
    });
  });

  describe('extractOFFNutrientsPer100g', () => {
    it('extracts primary and trace nutrients correctly from nutriments', () => {
      const mockOFFProduct = {
        nutriments: {
          "energy-kcal_100g": 250,
          "proteins_100g": 8.5,
          "fat_100g": 12.0,
          "saturated-fat_100g": 4.5,
          "sodium_100g": 0.35 // OFF sodium is typically in grams, will be scaled to mg (0.35 * 1000 = 350)
        }
      };

      const profile = extractOFFNutrientsPer100g(mockOFFProduct);
      expect(profile.calories).toBe(250);
      expect(profile.protein).toBe(8.5);
      expect(profile.totalFat).toBe(12.0);
      expect(profile.saturatedFat).toBe(4.5);
      expect(profile.sodium).toBe(350);
    });

    it('handles OFF energy in Joules properly', () => {
      const mockOFFProduct = {
        nutriments: {
          "energy_100g": 837 // 837 / 4.184 = 200 kcal
        }
      };
      const profile = extractOFFNutrientsPer100g(mockOFFProduct);
      expect(profile.calories).toBe(200);
    });
  });

  describe('Newline and YAML splitting edge cases', () => {
    it('parses literal \\n strings and real newlines identically', () => {
      const regex = /\r?\n|\\n/;
      const textWithRealNL = "line1\nline2\r\nline3";
      const textWithLiteralNL = "line1\\nline2\\nline3";

      const splitReal = textWithRealNL.split(regex).map(s => s.trim());
      const splitLiteral = textWithLiteralNL.split(regex).map(s => s.trim());

      expect(splitReal).toEqual(["line1", "line2", "line3"]);
      expect(splitLiteral).toEqual(["line1", "line2", "line3"]);
    });
  });
});
