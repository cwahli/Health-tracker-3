import { UserProfile, FoodLog, BiomarkerLog, RecommendationReport } from '../types';

export function getDemoProfile(): UserProfile {
  return {
    nickname: 'Alex (Demo)',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
    email: 'demo@healthcockpit.com',
    age: 28,
    ethnicity: 'Caucasian',
    weight: 74,
    height: 178,
    gender: 'Male',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    language: 'en',
    userType: 'Demo',
    topNutrientsToMonitor: ['calories', 'saturatedFat', 'sodium'],
    agentCredits: {
      totalUsed: 12,
      dailyQuota: 20,
      remaining: 20,
      lastResetTime: new Date().toISOString(),
      grantedCredits: [
        {
          amount: 15,
          expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(), // 2 days duration
          grantedAt: new Date().toISOString()
        }
      ],
      modelUsage: {
        'gemini-3.1-flash-lite': 12
      }
    }
  };
}

export function getDemoBiomarkerHistory(): BiomarkerLog[] {
  // Demo baseline from 2 weeks ago showing minor elevated lipids and Vitamin D deficiency
  const dates = [
    new Date(Date.now() - 14 * 24 * 3600000).toISOString().split('T')[0], // 14 days ago
    new Date(Date.now() - 2 * 24 * 3600000).toISOString().split('T')[0]   // 2 days ago
  ];

  return [
    {
      id: 'demo_biomarker_log_1',
      date: dates[0],
      biomarkers: {
        fasting_glucose: 94,
        hba1c: 5.4,
        total_cholesterol: 215,
        ldl: 138,
        hdl: 45,
        triglycerides: 165,
        egfr: 92,
        vitamin_d: 17, // low
        wbc: 6.4,
        hemoglobin: 14.8,
        bmi: 23.4
      },
      note: 'Baseline lab results from initial health checkout.',
      summary: 'Metabolic markers are stable except for moderate hyperlipidemia (LDL/Triglycerides slightly above optimum) and a distinct Vitamin D deficiency.',
      tests: [
        { key: 'fasting_glucose', originalTestName: 'Fasting Plasma Glucose', valueNumeric: 94, unit: 'mg/dL' },
        { key: 'hba1c', originalTestName: 'Glycated Hemoglobin HbA1c', valueNumeric: 5.4, unit: '%' },
        { key: 'total_cholesterol', originalTestName: 'Total Serum Cholesterol', valueNumeric: 215, unit: 'mg/dL' },
        { key: 'ldl', originalTestName: 'Low-Density Lipoprotein Cholesterol', valueNumeric: 138, unit: 'mg/dL' },
        { key: 'triglycerides', originalTestName: 'Serum Triglycerides', valueNumeric: 165, unit: 'mg/dL' },
        { key: 'vitamin_d', originalTestName: 'Vitamin D, 25-Hydroxy', valueNumeric: 17, unit: 'ng/mL' },
        { key: 'egfr', originalTestName: 'Estimated GFR (CKD-EPI)', valueNumeric: 92, unit: 'mL/min/1.73m²' }
      ]
    },
    {
      id: 'demo_biomarker_log_2',
      date: dates[1],
      biomarkers: {
        fasting_glucose: 91,
        hba1c: 5.3,
        total_cholesterol: 208, // minor improvement after nutrition adjustments
        ldl: 132,
        hdl: 46,
        triglycerides: 155,
        egfr: 94,
        vitamin_d: 22, // improving slightly with supplements
        wbc: 6.2,
        hemoglobin: 14.6,
        bmi: 23.4
      },
      note: 'Follow-up tracking following nutritional and active routine modifications.',
      summary: 'Lipids are showing early signs of positive response to dietary fiber. Vitamin D has begun trending upward due to targeted supplements.',
      tests: [
        { key: 'fasting_glucose', originalTestName: 'Fasting Plasma Glucose', valueNumeric: 91, unit: 'mg/dL' },
        { key: 'total_cholesterol', originalTestName: 'Total Serum Cholesterol', valueNumeric: 208, unit: 'mg/dL' },
        { key: 'ldl', originalTestName: 'Low-Density Lipoprotein Cholesterol', valueNumeric: 132, unit: 'mg/dL' },
        { key: 'triglycerides', originalTestName: 'Serum Triglycerides', valueNumeric: 155, unit: 'mg/dL' },
        { key: 'vitamin_d', originalTestName: 'Vitamin D, 25-Hydroxy', valueNumeric: 22, unit: 'ng/mL' }
      ]
    }
  ];
}

export function getDemoFoodLogs(): FoodLog[] {
  const dates = [
    new Date(Date.now() - 1 * 24 * 3600000).toISOString().split('T')[0], // yesterday
    new Date().toISOString().split('T')[0] // today
  ];

  return [
    {
      id: 'demo_food_log_1',
      date: dates[0],
      name: 'Avocado Toast with Poached Eggs',
      composition: '2 slices sourdough bread, 1 whole avocado, 2 medium poached eggs, cherry tomatoes, pinch of sea salt, black pepper.',
      weightGrams: 340,
      quantity: '1 plate',
      benefits: 'Rich in monounsaturated fats (oleic acid) which support LDL reduction, high-quality proteins for satiety, and dietary fiber from avocado and whole grains.',
      risks: 'Mild caloric density, but extremely nutrient-dense.',
      healthImpact: 'Very positive. Monounsaturated lipids help manage the slightly elevated baseline LDL.',
      recommendation: 'good',
      nutrients: {
        calories: 520,
        protein: 19,
        totalFat: 28,
        saturatedFat: 5.5,
        unsaturatedFat: 22,
        omega3: 0.4,
        carbohydrates: 48,
        addedSugar: 0,
        totalFibre: 11,
        solubleFibre: 3.5,
        sodium: 480,
        potassium: 740,
        magnesium: 65,
        calcium: 80,
        iron: 3.2,
        zinc: 1.8,
        selenium: 32,
        iodine: 24,
        phosphorus: 210,
        vitaminD: 80, // minor boost
        vitaminB12: 1.2,
        folate: 110,
        vitaminC: 15,
        vitaminE: 4.2,
        vitaminK: 28,
        vitaminA: 120,
        vitaminB6: 0.4,
        thiamine: 0.25,
        riboflavin: 0.35,
        niacin: 3.8
      }
    },
    {
      id: 'demo_food_log_2',
      date: dates[0],
      name: 'Double Bacon Cheeseburger & Seasoned Fries',
      composition: 'Double beef patties, white brioche bun, 2 slices cheddar, 2 strips bacon, barbecue sauce, mayonnaise, 150g deep-fried fries.',
      weightGrams: 510,
      quantity: '1 standard combo meal',
      benefits: 'High protein content (beef and cheese).',
      risks: 'Extremely high in saturated fats, sodium, trans fats, and glycemic index of processed buns.',
      healthImpact: 'Negative. Accelerates lipid elevated baseline, increasing cardiovascular strain.',
      recommendation: 'bad',
      nutrients: {
        calories: 1180,
        protein: 48,
        totalFat: 68,
        saturatedFat: 24, // extremely high
        unsaturatedFat: 38,
        omega3: 0.1,
        carbohydrates: 95,
        addedSugar: 14,
        totalFibre: 4.5,
        solubleFibre: 0.8,
        sodium: 1750, // extremely high
        potassium: 620,
        magnesium: 45,
        calcium: 220,
        iron: 5.8,
        zinc: 4.2,
        selenium: 45,
        iodine: 10,
        phosphorus: 480,
        vitaminD: 10,
        vitaminB12: 2.8,
        folate: 35,
        vitaminC: 4,
        vitaminE: 1.8,
        vitaminK: 12,
        vitaminA: 90,
        vitaminB6: 0.3,
        thiamine: 0.15,
        riboflavin: 0.25,
        niacin: 5.2
      }
    },
    {
      id: 'demo_food_log_3',
      date: dates[1],
      name: 'Baked Salmon with Quinoa and Steamed Broccoli',
      composition: '150g wild-caught salmon fillet, 1 cup cooked quinoa, 1.5 cups broccoli florets, drizzled with 1 tsp extra virgin olive oil and lemon juice.',
      weightGrams: 390,
      quantity: '1 dinner portion',
      benefits: 'Outstanding source of omega-3 polyunsaturated fatty acids (EPA/DHA) directly reducing triglycerides. Satiating fiber and rich iron/magnesium.',
      risks: 'Very low risk. Extremely cardioprotective.',
      healthImpact: 'Exceptional. Highly targeted to combat elevated triglycerides and LDL.',
      recommendation: 'good',
      nutrients: {
        calories: 540,
        protein: 38,
        totalFat: 22,
        saturatedFat: 3.2,
        unsaturatedFat: 17.5,
        omega3: 2.1, // very high omega3!
        carbohydrates: 45,
        addedSugar: 0,
        totalFibre: 8.5,
        solubleFibre: 2.2,
        sodium: 290,
        potassium: 910,
        magnesium: 115,
        calcium: 120,
        iron: 4.5,
        zinc: 2.8,
        selenium: 55,
        iodine: 60,
        phosphorus: 440,
        vitaminD: 450, // natural vitamin D boost!
        vitaminB12: 4.8,
        folate: 140,
        vitaminC: 85,
        vitaminE: 3.5,
        vitaminK: 110,
        vitaminA: 180,
        vitaminB6: 0.8,
        thiamine: 0.35,
        riboflavin: 0.45,
        niacin: 8.4
      }
    }
  ];
}

export function getDemoReport(): RecommendationReport {
  return {
    timestamp: new Date().toISOString(),
    dailyNutrientTargets: {
      calories: '2000 - 2400 kcal',
      saturatedFat: '< 20 g',
      sodium: '< 2000 mg',
      protein: '75 - 120 g',
      totalFibre: '> 30 g',
      vitaminD: '2000 IU'
    },
    mostImportantNextStep: 'Optimize lipid panel by prioritizing high-fiber foods (soluble fiber) and supplement Vitamin D (2000-4000 IU daily) to address deficiency.',
    actions: [
      { id: 'demo_action_1', task: 'Start daily Vitamin D3 supplement (2000 IU)', explanation: 'Your Vitamin D level is 22 ng/mL, which is below the optimal 30 ng/mL range.', priority: 'high', completed: false, type: 'lifestyle' },
      { id: 'demo_action_2', task: 'Increase daily soluble fiber intake to 10g+', explanation: 'Soluble fiber actively binds bile acids, helping to lower elevated LDL cholesterol (currently 132 mg/dL).', priority: 'medium', completed: false, type: 'lifestyle' },
      { id: 'demo_action_3', task: 'Schedule a lipid re-test in 3 months', explanation: 'Monitor response to lifestyle adjustments.', priority: 'medium', completed: false, type: 'doctor' }
    ],
    dailyBenefits: [
      { id: 'demo_benefit_1', activity: 'Take Vitamin D3 Supplement', target: 'Daily', completed: false },
      { id: 'demo_benefit_2', activity: 'Consume 30g+ Dietary Fiber', target: 'Daily', completed: false },
      { id: 'demo_benefit_3', activity: 'Limit saturated fats to <15g', target: 'Daily', completed: false }
    ],
    latestInsights: [
      { title: 'The Role of Soluble Fiber in Cholesterol Management', summary: 'Soluble fiber forms a gel-like substance in the digestive tract that traps cholesterol and prevents its reabsorption.', link: '#' },
      { title: 'Vitamin D: Essential for Immunity and Bone Health', summary: 'An exploration of Vitamin D receptors, standard deficiency symptoms, and optimal recovery strategies.', link: '#' }
    ],
    healthRiskForecast: {
      year5: 'Slight risk of subclinical atherosclerosis if lipids remain elevated.',
      year10: 'Moderate cardiovascular risk due to persistent hyperlipidemia.',
      year20: 'Elevated risk of plaque accumulation if lifestyle is unmanaged.',
      optimized5: 'Negligible risk. Arteries remain clear.',
      optimized10: 'Excellent vascular profile.',
      optimized20: 'Extremely low risk; comparable to an ultra-healthy baseline.'
    },
    topNutrientTargets: ['calories', 'saturatedFat', 'sodium', 'protein', 'solubleFibre', 'carbohydrates'],
    topWeeklyNutrientTargets: ['vitaminD', 'omega3', 'magnesium'],
    nutrientRankingRationale: "Focusing on Saturated Fat restriction is your single most important clinical priority, as limiting saturated fats directly halts the overproduction of atherogenic LDL particles and vascular plaque buildup. Pairing this with increased Soluble Fibre binds intestinal cholesterol to accelerate lipid excretion and stabilize glucose spikes, creating a foundational baseline for metabolic stability. Managing overall Caloric intake, Sodium, and Protein provides essential protection for renal filtration (eGFR) and vascular pressure, but these serve as secondary supporting targets. Prioritizing saturated fat reduction and soluble fiber intake delivers the highest overall health leverage, addressing the root driver of cardiovascular risk far more effectively than isolated micronutrient adjustments."
  };
}
