import { describe, it, expect } from 'vitest';
import { getTraceNutrientsForFoodType } from './server_food_db';

describe('getTraceNutrientsForFoodType', () => {
  it('returns base values at 100g', () => {
    const result = getTraceNutrientsForFoodType('red_meat', 100);
    expect(result.iron).toBeCloseTo(2.5, 2);
    expect(result.magnesium).toBeCloseTo(22, 2);
  });

  it('scales down linearly below 100g', () => {
    const result = getTraceNutrientsForFoodType('red_meat', 50);
    expect(result.iron).toBeCloseTo(1.25, 2);
  });

  it('scales up linearly above 100g', () => {
    const result = getTraceNutrientsForFoodType('leafy_veg', 200);
    expect(result.vitaminC).toBeCloseTo(100, 2);
  });

  it('falls back to the "unknown" profile for an unrecognized foodType', () => {
    const result = getTraceNutrientsForFoodType('not_a_real_type', 100);
    const unknown = getTraceNutrientsForFoodType('unknown', 100);
    expect(result).toEqual(unknown);
  });

  it('returns all zeros at weightGrams = 0', () => {
    const result = getTraceNutrientsForFoodType('fish_fatty', 0);
    expect(result.omega3).toBe(0);
    expect(result.vitaminD).toBe(0);
  });
});
