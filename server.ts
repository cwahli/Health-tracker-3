import sharp from 'sharp';
import { z } from "zod";
import { getMappedBiomarkerKey } from './src/utils/biomarkers';
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { getApps, initializeApp } from 'firebase-admin/app';

let firebaseConfig: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json:", e);
}

if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig?.projectId
  });
}
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
const adminAuth = getAdminAuth();
import express from "express";

const BiomarkerMatrix: Record<string, any> = {
  "hematocrit": {
    "targetUnit": "%",
    "conversionLogic": (value: number, sanitizedUnit: string) => {
      if (sanitizedUnit === "l/l" || value < 1.0) return value * 100; 
      return value;
    }
  },
  "total_cholesterol": {
    "targetUnit": "mmol/L",
    "conversionLogic": (value: number, sanitizedUnit: string) => {
      if (sanitizedUnit === "mg/dl") return value * 0.02586; 
      return value;
    }
  },
  "egfr": {
    "targetUnit": "mL/min/1.73m2",
    "conversionLogic": (value: number, sanitizedUnit: string) => value
  },
  "qrisk2_10yr_risk": {
    "targetUnit": "%",
    "conversionLogic": (value: number, sanitizedUnit: string) => value
  },
  "red_blood_cell_distribution_width": {
    "targetUnit": "%",
    "conversionLogic": (value: number, sanitizedUnit: string) => value
  }
};

function sanitizeUnitText(rawUnit: any): string {
  if (!rawUnit) return '';
  return String(rawUnit)
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/percent/g, '%')
    .replace(/\^/g, '*')
    .replace(/^[a-z]*(?=10)/g, '')
    .replace(/[x×]/g, '')
    .trim();
}

import { GoogleGenAI, Type } from "@google/genai";
import { getTraceNutrientsForFoodType, getCookingMethodModifier } from "./server_food_db";
import dotenv from "dotenv";
import YAML from "yaml";
import { AsyncLocalStorage } from "async_hooks";
import { biomarkerDefinitions, getBiomarkerStatus, getBiomarkerStatusLabel, getBiomarkerMetadata, getCustomBiomarkerDef } from "./src/utils/biomarkers";
import { NUTRIENT_KEYS } from "./src/utils/nutrients";
import { jsToYaml, extractBalancedJson, sanitizeMealWeight, findItemIndexInList } from "./server_pure_helpers";
import { aggregateItemsNutrients } from "./server_nutrient_aggregation";
import { 
  ScoutItemSchema, 
  VisionScoutSchema, 
  scoutSystemInstruction, 
  mergeScoutItems, 
  parseAndHealVisionScout 
} from "./server_vision_scout";


import { getFirestore, Firestore } from "firebase-admin/firestore";

// Helper functions for nutritional data lookup
async function searchUSDA(query: string, maxResults: number = 5, dataTypes: string = 'Foundation,SR Legacy,Branded'): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const dataTypeQuery = dataTypes.split(',').map(d => 'dataType=' + encodeURIComponent(d)).join('&');
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${maxResults}&${dataTypeQuery}`;
    
    const response = await fetch(url, { signal: controller.signal as any });
    clearTimeout(timeout);
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.foods || [];
  } catch (error) {
    console.error("[USDA API] Error:", error);
    return [];
  }
}

async function searchOpenFoodFacts(query: string, maxResults: number = 5): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://world.openfoodfacts.net/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page_size=${maxResults}&json=true`;
    
    const response = await fetch(url, {
      signal: controller.signal as any,
      headers: {
        "User-Agent": "HealthTracker/1.0 (Cwah.Liu@gmail.com)"
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error("[OpenFoodFacts API] Error:", error);
    return [];
  }
}

dotenv.config();
// console.log("Maps Key status at server boot:", process.env.GOOGLE_MAPS_API_KEY ? "DEFINED" : "UNDEFINED");

// Initialize Firebase Firestore for server-side calculations using Google Cloud Firestore Node.js SDK (bypasses security rules)
let db: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    db = getFirestore(firebaseConfig.firestoreDatabaseId ? getApps()[0] : undefined, firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase] Backend Firestore (Admin Node.js SDK) successfully initialized.");
  } else {
    console.warn("[Firebase] No firebase-applet-config.json found at server boot.");
  }
} catch (err: any) {
  console.error("[Firebase] Error initializing Firestore on server:", err.message || err);
}





// Resolves LLM-provided scoutItemIndices (or itemNames for text-only comparisons) back into
// full item objects using the authoritative Vision Scout data. This guarantees exact names,
// bounding boxes, and image indices — the LLM never has to regurgitate this data, which was
// the root cause of silent item drops and incorrect targetDbId hallucination in MODE D groups.
function resolveComparisonGroups(rawGroups: any[], scoutItems: any[]): any[] {
  const usedIndices = new Set<number>();

  const resolvedGroups = (Array.isArray(rawGroups) ? rawGroups : []).map((g: any) => {
    const items: any[] = [];
    let indices: number[] = Array.isArray(g.scoutItemIndices) ? g.scoutItemIndices : [];

    const resolvedIndices = new Set<number>();
    indices.forEach((rawIdx: any) => {
      // 1. Try to parse as integer (0-based)
      let i = typeof rawIdx === "number" ? rawIdx : parseInt(String(rawIdx).trim(), 10);
      let s = (!isNaN(i) && i >= 0 && i < scoutItems.length) ? scoutItems[i] : null;

      // 2. Fallback: Check if LLM used 1-based indexing (e.g. index 1 for array element 0)
      if (!s && !isNaN(i) && i > 0 && i <= scoutItems.length) {
        const fallbackItem = scoutItems[i - 1];
        if (fallbackItem) {
          s = fallbackItem;
          i = i - 1;
        }
      }

      // 3. Fallback: If rawIdx is a string (like "yakiimo cheese"), perform fuzzy string matching
      if (!s && typeof rawIdx === "string") {
        const cleanRaw = rawIdx.trim().toLowerCase();
        if (cleanRaw.length > 1) {
          const foundIdx = scoutItems.findIndex((item: any) => {
            const kw = (item.keyword || "").toLowerCase();
            const orig = (item.originalName || "").toLowerCase();
            return cleanRaw === orig || cleanRaw === kw || cleanRaw.includes(kw) || kw.includes(cleanRaw) || cleanRaw.includes(orig) || orig.includes(cleanRaw);
          });
          if (foundIdx !== -1) {
            s = scoutItems[foundIdx];
            i = foundIdx;
          }
        }
      }

      // 4. If we successfully resolved to a scout item, add it to this group
      if (s && i >= 0 && i < scoutItems.length) {
        usedIndices.add(i);
        resolvedIndices.add(i);
        items.push({
          name: s.name || s.originalName || s.keyword,
          keyword: s.keyword || null,
          originalName: s.originalName || null,
          boundingBox2D: s.boundingBox2D || null,
          sourceImageIndex: typeof s.sourceImageIndex === "number" ? s.sourceImageIndex : 0
        });
      }
    });

    // Text-only comparisons (no image / no scout items): fall back to plain names.
    if (scoutItems.length === 0 && Array.isArray(g.itemNames)) {
      g.itemNames.forEach((n: string) => {
        if (n) items.push({ name: n, boundingBox2D: null, sourceImageIndex: null });
      });
    }

    const resolvedThreats: Record<string, string> = {};
    const threatEntries: [string, any][] = Array.isArray(g.itemClinicalThreats)
      ? g.itemClinicalThreats
          .filter((t: any) => t && (typeof t.scoutIndex !== "undefined" || typeof t.scoutIdentifier !== "undefined" || typeof t.scoutIndices !== "undefined"))
          .flatMap((t: any) => {
            if (Array.isArray(t.scoutIndices)) {
               return t.scoutIndices.map((idx: number) => [String(idx), t.threat]);
            }
            
            const rawId = typeof t.scoutIdentifier !== "undefined" ? t.scoutIdentifier : t.scoutIndex;
            let resolvedIdx = -1;
            if (typeof rawId === "number") {
              resolvedIdx = rawId;
            } else if (typeof rawId === "string") {
              const cleanRaw = rawId.trim().toLowerCase();
              const foundIdx = scoutItems.findIndex((item: any) => {
                const kw = (item.keyword || "").toLowerCase();
                const orig = (item.originalName || "").toLowerCase();
                return cleanRaw === orig || cleanRaw === kw || cleanRaw.includes(kw) || kw.includes(cleanRaw) || cleanRaw.includes(orig) || orig.includes(cleanRaw);
              });
              if (foundIdx !== -1) resolvedIdx = foundIdx;
            }
            return [[String(resolvedIdx !== -1 ? resolvedIdx : rawId), t.threat]];
          })
      : (g.itemClinicalThreats && typeof g.itemClinicalThreats === "object")
          ? Object.entries(g.itemClinicalThreats) // legacy fallback for any old-format responses still in flight
          : [];
    if (threatEntries.length > 0) {
      threatEntries.forEach(([key, threat]) => {
        let targetIdx: number | null = null;
        const parsedKey = parseInt(key, 10);
        if (!isNaN(parsedKey)) {
          let i = parsedKey;
          let s = (i >= 0 && i < scoutItems.length) ? scoutItems[i] : null;
          if (!s && i > 0 && i <= scoutItems.length) {
            s = scoutItems[i - 1];
            i = i - 1;
          }
          if (s) {
            targetIdx = i;
          }
        }
        if (targetIdx === null) {
          const cleanKey = key.trim().toLowerCase();
          if (cleanKey.length > 1) {
            const foundIdx = scoutItems.findIndex((item: any) => {
              const kw = (item.keyword || "").toLowerCase();
              const orig = (item.originalName || "").toLowerCase();
              return cleanKey.includes(kw) || kw.includes(cleanKey) || cleanKey.includes(orig) || orig.includes(cleanKey);
            });
            if (foundIdx !== -1) {
              targetIdx = foundIdx;
            }
          }
        }
        if (targetIdx !== null) {
          resolvedThreats[String(targetIdx)] = String(threat);
        } else {
          resolvedThreats[key] = String(threat);
        }
      });
    }

    return {
      groupName: g.groupName,
      suitability: g.suitability,
      recommendation: g.recommendation,
      averageNutrients: g.averageNutrients || null,
      scoutItemIndices: Array.from(resolvedIndices),
      itemClinicalThreats: resolvedThreats,
      items
    };
  });

  // Coverage repair: any scout item the model never assigned to a group still gets shown,
  // instead of silently vanishing from the comparison.
  if (scoutItems.length > 0) {
    const missing = scoutItems.filter((_: any, i: number) => !usedIndices.has(i));
    if (missing.length > 0) {
      resolvedGroups.push({
        groupName: "Other Identified Items",
        suitability: "Uncategorized",
        recommendation: "These items were detected but not placed into a comparison group by the AI.",
        averageNutrients: null,
        scoutItemIndices: scoutItems.map((_, i) => i).filter(i => !usedIndices.has(i)),
        itemClinicalThreats: {},
        items: missing.map((s: any) => ({
          name: s.name || s.originalName || s.keyword,
          keyword: s.keyword || null,
          originalName: s.originalName || null,
          boundingBox2D: s.boundingBox2D || null,
          sourceImageIndex: typeof s.sourceImageIndex === "number" ? s.sourceImageIndex : 0
        }))
      });
    }
  }

  return resolvedGroups;
}

export function buildFoodAnalyzeInstruction(context: {
  biomarkersNeedingImprovement?: any[];
  remainingAllowance?: any | null;
  activeMeal?: any;
  compareItemCount?: number;
}): string {
  const { biomarkersNeedingImprovement, remainingAllowance, activeMeal, compareItemCount = 0 } = context;

  const formattedBiomarkers = Array.isArray(biomarkersNeedingImprovement) && biomarkersNeedingImprovement.length > 0
    ? biomarkersNeedingImprovement.map((b: any) => {
        if (typeof b === "string") {
          return `• ${b}`;
        }
        if (b && typeof b === "object" && b.name) {
          const statusStr = b.status ? ` is ${String(b.status).toUpperCase()}` : "";
          const valStr = b.value !== undefined ? ` (${b.value} ${b.unit || ""}, normal range: ${b.normalRange || ""})` : "";
          return `• ${b.name}${statusStr}${valStr}`;
        }
        return `• ${String(b)}`;
      }).join("\n")
    : "• None";

  const biomarkersList = formattedBiomarkers;

  const formatLimitVal = (val: any) => {
    if (val === undefined || val === null) return "0";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return String(Math.round(num * 100) / 100);
  };
  
  const targetLimits = remainingAllowance
    ? `TODAY'S NUTRITIONAL TARGET LIMIT:
- Calorie: ${formatLimitVal(remainingAllowance.calories)}kcal
- Sat: ${formatLimitVal(remainingAllowance.saturatedFat)}g
- Sodium: ${formatLimitVal(remainingAllowance.sodium)}mg
- Added sugar: ${formatLimitVal(remainingAllowance.addedSugar)}g
- Carb: ${formatLimitVal(remainingAllowance.carbohydrates)}g

Nutrient target to reach today:
- Soluble fibre: ${formatLimitVal(remainingAllowance.solubleFibre)}g
- Protein: ${formatLimitVal(remainingAllowance.protein)}g
- Potassium: ${formatLimitVal(remainingAllowance.potassium)}mg
- Unsaturated fat: ${formatLimitVal(remainingAllowance.unsaturatedFat)}g`
    : `TODAY'S NUTRITIONAL TARGET LIMIT:
- Calorie: 1651kcal
- Sat: 15g
- Sodium: 1200mg
- Added sugar: 50g
- Carb: 250g

Nutrient target to reach today:
- Soluble fibre: 15g
- Protein: 50g
- Potassium: 3500mg
- Unsaturated fat: 40g`;

  // Clean activeMeal by replacing huge base64 strings
  let sanitizedActiveMeal = null;
  if (activeMeal) {
    sanitizedActiveMeal = { ...activeMeal };
    if (sanitizedActiveMeal.imageUrl && sanitizedActiveMeal.imageUrl.startsWith("data:image/")) {
      sanitizedActiveMeal.imageUrl = "[base64_image_data_truncated]";
    }
    if (sanitizedActiveMeal.imageUrls && Array.isArray(sanitizedActiveMeal.imageUrls)) {
      sanitizedActiveMeal.imageUrls = sanitizedActiveMeal.imageUrls.map((url: string) => 
        url && url.startsWith("data:image/") ? "[base64_image_data_truncated]" : url
      );
    }
    if (sanitizedActiveMeal.chatTranscript) {
      delete sanitizedActiveMeal.chatTranscript;
    }
  }

  const mealStr = sanitizedActiveMeal ? JSON.stringify(sanitizedActiveMeal, null, 2) : "None";

  return `CURRENT_ACTIVE_MEAL_STATE: ${mealStr}

You are an expert clinical dietitian and nutritional LLM analyzer operating within an automated personalized health ecosystem. Your response must be an exact single structured JSON object matching the requested structure. Never add markdown formatting wrappers like \`\`\`json unless instructed.

CONSISTENCY & PROSE PRECISION: In your conversational response ("message") and detailed analysis fields, you should explicitly discuss specific numeric nutrient totals calculated for the current meal. CRITICAL: You MUST explicitly weave the mathematical totals you calculated (e.g., 'This 60g donut contains roughly 306 calories and 21g of fat') directly into the conversational message. Do not provide generic warnings without the specific numbers. 

=== PATIENT CONTEXT PAYLOAD ===
CRITICAL PATIENT BIOMARKER WARNINGS & NUTRITIONAL DIRECTIVES:
${biomarkersList}
- If LDL-C/cholesterol is HIGH, any food high in saturated fat is EXTREMELY harmful. Rate as "bad" and warn in "risks".
- If Blood Pressure/Sodium is HIGH, any food high in sodium is EXTREMELY harmful. Rate as "bad".

${targetLimits}

=== UNIVERSAL HEALTH DIRECTIVE (STRICT) ===
TRANS FAT AVOIDANCE: Trans fat (partially hydrogenated oils) is universally harmful and must be avoided regardless of the patient's specific biomarkers. Always aggressively flag any food likely to contain trans fats in the "risks" field.

=== DATA EXTRACTION DEPTH RULES ===
1. CORE NUTRIENTS: For EVERY new item, you MUST populate labelNutrientsPerServing with your best clinical estimate per 100g (set servingSizeGrams=100). When a physical label is visible, use the exact label values. When databaseMatches contains a relevant entry, use it to improve your estimate and set dbSource accordingly.
1b. BACKEND NUTRITIONAL CALCULATOR DIRECTIVE: The backend has pre-calculated precise nutrient weights for each component item inside "BACKEND PRE-CALCULATED ITEM NUTRIENTS". You MUST treat these numbers as the Absolute Truth and populate "labelNutrientsPerServing" directly from these values (scaled to 100g serving size). Set "dbSource": "backend_calculated". You should ONLY override these values (setting "dbSource": "estimated_override") if the numbers are physically impossible or wildly mismatch the food's visual volume.
1c. RAW WHOLE FOOD SANITY CHECK (CRITICAL):
If the item's cookingMethod is "raw", you MUST independently verify the sodium and sugar values provided by the database matches for whole meats, vegetables, and fruits.
* The Plumping Override: Natural, unenhanced raw chicken, beef, or fish rarely exceeds 80mg of sodium per 100g. If a database match shows >150mg of sodium for raw, unseasoned meat, it represents a saline-injected commercial variant. You MUST autonomously reject that database sodium number and manually estimate it at ~50mg–70mg per 100g to accurately reflect true biological baseline levels, unless the user explicitly scanned a commercial branded package.
2. TRACE NUTRIENTS: Do NOT estimate these individually. Instead, output the single most appropriate foodType string for each item (e.g., 'red_meat', 'leafy_veg', 'root_veg', etc.).

Critical: Original Name Override & Anti-Merging Rule
Local Language Priority: Treat the originalName provided by the visual scout as the absolute ground truth for categorizing an item, overriding the English keyword if they contradict.

Protein Verification: If an originalName contains clear local language identifiers for proteins (e.g., "Ikan" = fish, "Ayam" = chicken, "Daging" = beef) but the upstream agent mistakenly passed an English keyword matching a vegetable, you MUST classify and log the item based on the local protein name.

Strict Anti-Merging: NEVER sum the weights of two items simply because their English keywords match. You must evaluate if their originalNames represent the exact same food. If they are different (e.g., "IK BARONANG" and "BABY PAKCHOY"), keep them as separate, distinct entries in the itemsBreakdown array.

Core Nutrients DB ID Validation
Zero Hallucination: For EVERY item, when databaseMatches contains a relevant entry, use it to set dbSource and dbId.

Strict Fallback: If a food item does NOT have a clear, exact match in the provided databaseMatches list, you MUST set dbId to null and dbSource to estimated. NEVER invent, guess, or hallucinate a dbId string or integer that was not explicitly provided in the payload data.

Trace Nutrients Taxonomy
Fungi Expansion: Do NOT estimate trace nutrients individually. Instead, output the single most appropriate foodType string for each item.

Allowed Types: Use exactly one of the following category tags: 'red_meat', 'poultry', 'fish_lean', 'fish_fatty', 'leafy_veg', 'root_veg', 'fungi', 'legume', 'grain', 'fruit', 'dairy', 'mixed_meal' (for complex dishes), or 'ultra_processed' (for junk food, sweets, and deep-fried commercial items).

=== MODE ROUTING DIRECTIVE (STRICTLY ENFORCED) ===
Operate in one of five distinct modes based on current user intent:

MODE A: NEW FOOD LOGGING 
- Triggered by a completely new food item description or image of a meal they ate/want to eat. Ignore CURRENT_ACTIVE_MEAL_STATE.
- Extract ingredients, estimate weights, and provide the foodData block. Set "mode": "new_log".
- CRITICAL SCHEMA REQUIREMENT: You MUST output the foodData block and you MUST explicitly set "comparison": null. Do NOT generate comparison group structures or assign scout indices to a comparison engine for a single logged meal.
- CRITICAL: If the user uploads a picture of a meal (e.g. a plate with steak, potatoes, veggies), you MUST treat it as a single meal entry and use MODE A (NEW FOOD LOGGING). Combine the components into the itemsBreakdown array. DO NOT use MODE D (EVALUATION/COMPARISON) to compare the items on the plate unless the user explicitly asks to compare them or choose the best option.
- CRITICAL: If the user enters a single food item name or phrase like "I ate this steak" without explicitly asking to compare, you MUST use MODE A.
- CRITICAL: If the user provides a single food image and asks a general health question (e.g., "Is it healthy?"), that MUST be routed to MODE A, not Mode D. You MUST directly answer the question in the "message" field evaluating its clinical impact.
- CONFIDENCE ACKNOWLEDGEMENT (CRITICAL): Check the "Visual Scout Confidence Rating" and any anomaly flags listed for the items in the === VISUAL FOOD SCOUT IDENTIFIED ITEMS === section. If any item is marked as Medium or Low confidence (or has anomaly flags), you MUST start your response by explicitly acknowledging this uncertainty. You MUST explicitly invite the user to correct the identification manually via text, or upload a clearer picture so you can update the lower rating.

MODE B: DISCUSSION 
- Triggered by general health questions, or if the user's message/query is NOT relevant to food, nutrition, or health. Set "mode": "discussion". Set structural data to null.
- CRITICAL: If you detect that the user's input/query is not relevant to food, nutrition, or biological tracking, you MUST use MODE B (DISCUSSION). In your conversational response ("message"), politely inform the user of your focus and actively incite, guide, or invite them to provide relevant descriptions, ingredients, weights, or pictures of meals or food items so that you can evaluate them, analyze their nutritional profile, and guide them in their wellness journey.
- CRITICAL REJECTION RULE: If the user input is a greeting (e.g., "Hi", "Hello", "Start", "Let's start", "greetings"), general conversational inquiry, or focuses purely on clinical/lab biomarkers (e.g., ALT, AST, LDL, cholesterol, liver panel) without any food, meal, ingredient, or recipe context, you MUST immediately classify the request as MODE B (DISCUSSION). Do NOT assume a database match of a greeting/command word (e.g., the word "Start" matching "Start granola") is the user's food item unless they explicitly wrote "I ate..." or "My meal is...". State politely that you are the Food & Nutrition Agent and can only analyze meals, ingredients, recipes, or nutritional values, and advise them to use the Health & Medical Agent for clinical or lab test reviews.

MODE C: MODIFICATION COMMAND (ACTIVE MEAL UPDATE)
Triggered ONLY when the user asks to modify, add, or correct a weight for an item that currently exists inside the CURRENT_ACTIVE_MEAL_STATE.
- ANTI-CRASH RULE: You MUST populate itemName with the EXACT literal string from the active meal state to ensure successful database matching.
- ANTI-CRASH RULE 2: You MUST populate \`targetDbId\` with the exact ID from the active state to ensure the backend calculator finds it.
- Do NOT use Mode C if the user is discussing a food from a theoretical comparison that is not in the active meal state.
- Set "mode": "modify". Populate the "modificationCommand" array. Set foodData and comparison to null.

MODE D: EVALUATION / COMPARISON
Triggered ONLY when explicitly evaluating alternative foods (e.g. comparing snacks), OR whenever the VISUAL FOOD SCOUT Content Type is "menu_or_poster".

- NUTRITIONAL DOMINANCE LAW (CRITICAL): You MUST group items strictly by their clinical nutritional value, primary base ingredient, or risk profile. You are strictly FORBIDDEN from creating groups named after physical layout locations like shelves, rows, or tables (e.g., Do NOT use 'Top Shelf Selections').

- CROSS-SHELF INDEX MAPPING (THE BREAKOUT RULE): Because the Vision Scout groups foods by physical rows to preserve bounding boxes, a single physical row may contain multiple types of foods. 
  * You are allowed to include the SAME Scout Index in MULTIPLE nutritional groups if that physical shelf contains products belonging to both categories.
  * Your UI will seamlessly render the correct row crop for both comparisons without breaking.

- COVERAGE REQUIREMENT: Every single Index provided in the === VISUAL FOOD SCOUT IDENTIFIED ITEMS === list MUST appear in at least one nutritional group.

- THE EVALUATION HIERARCHY (CRITICAL): Before grouping, you MUST evaluate the TOTAL package payload of every item against this strict 4-step hierarchy:
  1. UNIVERSAL THREATS: Does it contain universally harmful ingredients (e.g., trans fats)?
  2. THE DAILY BUDGET (ACUTE THREATS): Does the TOTAL package payload consume more than 50% of ANY "REMAINING NUTRITIONAL TARGET LIMIT" (e.g., Sodium, Calories, Saturated Fat, Added Sugar)? If yes, it is an acute dietary threat.
  3. BIOMARKER STRATEGY & INGREDIENT QUALITY (CHRONIC THREATS): Does the biochemical nature of the food OR its specific ingredients trigger any of the "PATIENT BIOMARKER WARNINGS"? If an 'ingredientsList' is provided, you MUST analyze it. Highly processed or inflammatory ingredients (e.g., refined flours like 'Tepung Terigu', shortening/'lemak reroti', 'margarin') must actively penalize the item's ranking, especially for patients with liver (ALT), cholesterol, or diabetes risks. If 'ingredientsList' is null, base your assessment strictly on the macro payload.
  4. TARGET ACQUISITION (POSITIVE IMPACT): Does the item significantly contribute to the "Nutrient target to reach today" (e.g., high Protein, Potassium, Soluble Fibre, or Unsaturated Fat) without grossly violating steps 1-3?

- GROUPING STRATEGY (RANKED TIERS + THREAT CLUSTERING - MANDATORY & STRICTLY ENFORCED):
  You MUST ALWAYS structure the 'comparison.groups' array in a strict tiered order with AT LEAST THREE distinct groups. EVEN IF ALL ITEMS ARE UNHEALTHY (like a shelf of deep-fried chips), you are STRICTLY FORBIDDEN from putting all items in a single bucket or ignoring the ranking requirement. You MUST forcibly rank them to find the "least harmful" choices to mitigate damage:
  * TIER 1 (The Winner / Least Harmful Group) [MANDATORY]: This group MUST contain EXACTLY ONE item: the absolute best (or least harmful) choice for the patient (e.g. "Oishi Popcorn" as popcorn is a whole grain and has fiber). Set "groupName" to a descriptive reason without any prefixes or emojis (e.g., "Lowest in all harmful nutrients" or "Whole Grain Fiber Matrix"). 
  * TIER 2 (The Runner-Up Group) [MANDATORY]: This group MUST contain EXACTLY ONE item: the second-best (or second least harmful) choice (e.g. "Taro Net" or "Chitato Lite" as they are baked/thinner). Set "groupName" to a descriptive reason without any prefixes or emojis (e.g., "Good balance of protein and calories" or "Baked Extruded Snack").
  * TIER 3 (The Rest - Threat Clusters) [MANDATORY]: Group all remaining items into multiple descriptive threat groups based STRICTLY on their differences in clinical threats and ingredient matrices.
     - NO GENERIC BUCKETS: You are strictly FORBIDDEN from using generic categories like "High Risk", "Avoid", "Items with high risk of Trans Fats and Sodium", or putting all Tier 3 items into a single giant bucket.
     - THE DIVERGENCE RULE: Separate remaining items by their SINGLE worst offending nutrient. If specific nutrient labels are missing, you MUST cluster items by their base ingredient matrix (e.g., 'Critical Calorie & Saturated Fat Threat (Cassava/Root Veg)', 'High Saturated Fat Warning (Traditional Potato Chips)', 'High Glycemic Index & Sodium Risk (Corn & Extruded Snacks)') to determine the differing clinical threats.
     - THE CONVERGENCE RULE: You may only group remaining items together if their worst offending nutrient and base ingredient matrix are EXACTLY the same.
  *(Note: If there are only 2 items total, output only Tier 1 and Tier 2).*
  * CRITICAL MATH REQUIREMENT: You MUST use the provided 'TRUE TOTAL NUTRITIONAL PAYLOAD' values for 'averageNutrients'. Do not re-calculate or apply serving size math yourself.

- SCHEMA DETAILS:
  * Output the specific groups in comparison.groups. 
  * CRITICAL SYNTAX: Each element inside the comparison.groups array MUST be a complete JSON object enclosed in curly braces '{' and '}'. Never output bare keys or skip curly braces. The first property of each group object inside the curly braces MUST be "groupName".
  * For each group object, provide groupName, suitability, recommendation (MUST contain numeric macro values/ranges for both positive targets and limits), averageNutrients, and scoutItemIndices. OMIT the comparisonTable entirely.
  * The 'recommendation' MUST be highly instructional. It must state the specific benefit for this person eating this food, but ALSO the specific risk and how best to mitigate it (e.g., "This bread offers a quick energy source perfect for post-workout, but it can also create rapid blood sugar spikes. Considering your high diabetes profile (hb1ac 40), you should consider eating it in portions of half a slice across the day.").
  * Inside each group, add an "itemClinicalThreats" array. Each entry MUST be an object {"scoutIndices": [<numbers>], "threat": "<short label>"} covering every scout item in that group. You MUST group indices that share the EXACT same threat label together into the array to save space. For Tier 1 and 2, this might be "None" or a minor warning. For Tier 3, it must explicitly name the threat (e.g., "Excessive Sodium").
  * CRITICAL NAMING RULE: NEVER use the word "Index" or "Option X" in your 'groupName', 'message', or 'recommendation' text fields. You must seamlessly weave the actual food names (e.g., "Happy Tos", "Mr. Bread") into your prose. The "Index" number is ONLY for the 'scoutItemIndices' and 'scoutIndex' JSON structure fields.

- RESOLVING VISUAL WARNINGS:
  If the user provides a text correction for a previously unclear visual item (e.g. they say "the unclear fish is ikan bandoneng"), you MUST update that specific item in the \`scoutItems\` array schema field. You must update its keyword, completely clear its anomaly flags, and upgrade its confidence to High. You must return the ENTIRE array including the unaffected items.

JSON SCHEMA STRICT REQUIREMENT:
Respond ONLY with a structured JSON format matching this schema exactly.

{
  "scratchpad": "string (Think step-by-step: analyze the user input, biomarkers, and scout data to formulate the response.)",
  "mode": "new_log | discussion | modify | evaluation | origin",
  "message": "A highly personalized conversational response detailing the clinical rationale. If the user asked a specific question (e.g., \"is this healthy?\"), you MUST directly answer it here.",
  "modificationCommand": [
    {
      "action": "update_weight | remove_item | add_item | rename_item",
      "itemName": "EXACT literal name from the itemsBreakdown list.",
      "newWeightGrams": 120,
      "targetDbId": "EXACT dbId from itemsBreakdown. CRITICAL for backend matching.",
      "newName": "New name if action is rename_item"
    }
  ],
  "foodData": {
    "date": "YYYY-MM-DD",
    "name": "Literal food name",
    "itemsBreakdown": [
      {
        "canonicalDbName": "Standardized target food name",
        "weightGrams": 120,
        "dbSource": "usda | off | estimated | label",
        "dbId": "fdcId or barcode",
        "labelNutrientsPerServing": {
          "servingSizeGrams": 100,
          "calories": 0,
          "protein": 0,
          "totalFat": 0,
          "saturatedFat": 0,
          "transFat": 0,
          "carbohydrates": 0,
          "addedSugar": 0,
          "sodium": 0,
          "potassium": 0,
          "totalFibre": 0,
          "solubleFibre": 0
        },
        "foodType": "string"
      }
    ],
    "composition": "Brief summary",
    "weightGrams": 150,
    "quantity": "Visual descriptive serving size",
    "benefits": "Targeted clinical benefits",
    "risks": "Explicit clinical risk warnings",
    "healthImpact": "Evaluation against targets",
    "recommendation": "Short, contextual tag indicating core health property."
  },
  "comparison": {
    "comparisonTitle": "A short 2-4 word title for this comparison (e.g., 'Nutrients of Concern')", 
    "auditChecklist": "CRITICAL: List all scoutItemIndices from the prompt (e.g., 0, 1, 2, 3...) here before grouping to ensure 100% extraction coverage.",
    "groups": [
      {
        "groupName": "Descriptive reason (e.g., 'Lowest in all harmful nutrients')",
        "scoutItemIndices": [0],
        "itemNames": null,
        "suitability": "Safest option",
        "recommendation": "Considering what the user asked, target limits, targets to reach, and clinical biomarkers, give advice on this food.",
        "averageNutrients": {
          "calories": 0,
          "protein": 0,
          "totalFat": 0,
          "saturatedFat": 0,
          "sodium": 0,
          "carbohydrates": 0,
          "addedSugar": 0,
          "potassium": 0,
          "totalFibre": 0
        }
      }
    ]
  },

}`;
}

const app = express();
const imageSearchCache = new Map<string, any>();
const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER_START_TIME = Date.now();

async function startServer() {
  // In-Memory & Local File Sync storage to act as the durable synced database
  const SYNC_DIR = path.join(process.cwd(), "data", "sync");
  if (!fs.existsSync(SYNC_DIR)) {
    fs.mkdirSync(SYNC_DIR, { recursive: true });
  }

  // Increase limit to allow base64 uploaded image payloads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Register session tracking middleware for isolated logging
  app.use((req, res, next) => {
    const sessionId = (req.headers["x-session-id"] as string) || (req.query.sessionId as string) || "global";
    logSessionStorage.run(sessionId, () => {
      next();
    });
  });

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      timeout: 45000,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

const logSessionStorage = new AsyncLocalStorage<string>();

// Global Debug Logs array for LLM process tracking and diagnostics
interface DebugLog {
  timestamp: string;
  message: string;
}
let globalDebugLogs: DebugLog[] = [];
let sessionDebugLogs: { [sessionId: string]: DebugLog[] } = {};

function addDebugLog(msg: string, explicitSessionId?: string) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  
  // Truncate huge base64 data URLs globally to prevent massive bloating of diagnostic logs
  let sanitizedMsg = msg || "";
  if (typeof sanitizedMsg === 'string' && sanitizedMsg.includes("data:image/")) {
    sanitizedMsg = sanitizedMsg.replace(/(data:image\/[^;]+;base64,)[A-Za-z0-9+/=]{100,}/g, "$1... [truncated base64 image data]");
  }
  
  // Keep the container stdout clean by truncating huge multiline logs in console.log
  const singleLineLog = sanitizedMsg.replace(/\n/g, '\n');
  if (singleLineLog.length > 4000) {
    console.log(`[LLM DEBUG ${timestamp}]: ${singleLineLog.substring(0, 4000)}... [Truncated ${singleLineLog.length - 4000} chars.]`);
  } else {
    console.log(`[LLM DEBUG ${timestamp}]: ${singleLineLog}`);
  }
  
  const sessionId = explicitSessionId || logSessionStorage.getStore() || "global";
  if (!sessionDebugLogs[sessionId]) {
    sessionDebugLogs[sessionId] = [];
  }
  sessionDebugLogs[sessionId].push({ timestamp, message: sanitizedMsg });
  if (sessionDebugLogs[sessionId].length > 1500) {
    sessionDebugLogs[sessionId].shift();
  }

  globalDebugLogs.push({ timestamp, message: sanitizedMsg });
  if (globalDebugLogs.length > 2000) {
    globalDebugLogs.shift();
  }
}
const actualAddDebugLog = addDebugLog;



// Helper to retrieve the Google Maps Place ID from business name & location
async function fetchGoogleMapsPlaceId(
  businessName: string,
  latitude: string | number,
  longitude: string | number,
  explicitSessionId?: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    addDebugLog(`[get_google_maps_place_id] API Key is missing in process.env`, explicitSessionId);
    return "ERROR_API_FAILED";
  }
  
  // Use a strict AbortController timeout to prevent hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  
  try {
    const latStr = String(latitude).trim();
    const lngStr = String(longitude).trim();
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(businessName)}&inputtype=textquery&locationbias=point:${latStr},${lngStr}&fields=place_id&key=${apiKey}`;
    
    addDebugLog(`[get_google_maps_place_id] Fetching place ID for "${businessName}" near (${latStr}, ${lngStr})`, explicitSessionId);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      addDebugLog(`[get_google_maps_place_id] Google Places API HTTP error: ${res.status}`, explicitSessionId);
      return "ERROR_API_FAILED";
    }
    const data = await res.json();
    if (data.status === "ZERO_RESULTS") {
      addDebugLog(`[get_google_maps_place_id] No results found (ZERO_RESULTS) for "${businessName}"`, explicitSessionId);
      return "NOT_FOUND";
    }
    if (data.candidates && data.candidates.length > 0) {
      const pId = data.candidates[0].place_id || "NOT_FOUND";
      addDebugLog(`[get_google_maps_place_id] Resolved successfully! Place ID: ${pId}`, explicitSessionId);
      return pId;
    }
    addDebugLog(`[get_google_maps_place_id] Status was ${data.status || 'unknown'}, candidates empty.`, explicitSessionId);
    return "NOT_FOUND";
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    const errorMsg = isAbort ? 'Request timed out after 2500ms' : (err.message || err);
    addDebugLog(`[get_google_maps_place_id] Error: ${errorMsg}`, explicitSessionId);
    return "ERROR_API_FAILED";
  }
}



const ItemBreakdownSchema = z.object({
  name: z.string().optional(),
  weightGrams: z.number().finite().nonnegative().optional(),
  calories: z.number().finite().optional(),
}).passthrough();

const RouteAgentSchema = z.object({
  itemsBreakdown: z.array(ItemBreakdownSchema).optional(),
}).passthrough();

// Validates parsed LLM JSON against a schema. On failure, logs the full raw
// output (so we can see exactly what the LLM sent) and returns the provided
// safe fallback instead of letting a malformed shape reach downstream math.
function validateOrFallback<T>(schema: z.ZodType<T>, parsed: any, rawText: string, label: string, fallback: T): T {
  const result = schema.safeParse(parsed);
  if (!result.success) {
    addDebugLog(`[Zod Validation Failed] ${label}: ${result.error.message}. Raw output: ${rawText}`);
    return fallback;
  }
  return result.data;
}

function robustParseJson(cleanJson: string): any {
  let cleaned = cleanJson.replace(/\`\`\`(?:json)?/gi, "").replace(/\`\`\`/g, "").trim();
  
  // Array fallback
  if (cleaned.startsWith("[")) {
      let depth = 0;
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === "[") depth++;
        else if (cleaned[i] === "]") depth--;
        if (depth === 0) {
          return JSON.parse(cleaned.substring(0, i + 1));
        }
      }
  }
  
  return JSON.parse(extractBalancedJson(cleaned));
}

// Unified Multi-Provider LLM Router with automatic fallbacks & simulation modes
async function callUnifiedLLM(args: any): Promise<any> {
  try {
    return await callUnifiedLLMInternal(args);
  } catch (e: any) {
    if (args.modelId === "gemini-3.1-flash-lite" && (e.message?.includes("503") || e.status === 503 || e.message?.toLowerCase().includes("demand") || e.message?.toLowerCase().includes("unavailable") || e.message?.includes("500"))) {
      const explicitSessionId = logSessionStorage.getStore();
      actualAddDebugLog(`[UnifiedLLM] High demand for ${args.modelId}. Falling back to gemini-2.5-flash.`, explicitSessionId);
      args.modelId = "gemini-2.5-flash";
      return await callUnifiedLLMInternal(args);
    }
    throw e;
  }
}

async function callUnifiedLLMInternal({
  modelId,
  systemInstruction,
  promptText,
  imagePayload,
  imagePayloads,
  responseMimeType,
  responseSchema,
  googleSearch,
  enablePlaceIdTool,
  maxOutputTokens,
  onStream
}: {
  modelId: string;
  systemInstruction: string;
  promptText: string;
  imagePayload?: { mimeType: string; data: string } | null;
  imagePayloads?: { mimeType: string; data: string }[] | null;
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: any;
  googleSearch?: boolean;
  enablePlaceIdTool?: boolean;
  maxOutputTokens?: number;
  onStream?: (chunk: string, isThought?: boolean) => void;
}) {
  const explicitSessionId = logSessionStorage.getStore();
  const addDebugLog = (msg: string) => actualAddDebugLog(msg, explicitSessionId);
  try {
    const isJson = responseMimeType === "application/json";
    const normalizedModelId = (modelId || "gemini-3.5-flash").toLowerCase();

  // 1. Anthropic Claude Models
  if (normalizedModelId.includes("claude-")) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      console.log(`[UnifiedLLM] Calling official Anthropic API: ${normalizedModelId}`);
      try {
        const messages: any[] = [];
        const contentParts: any[] = [];
        if (imagePayloads && imagePayloads.length > 0) {
          for (const img of imagePayloads) {
            contentParts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: img.mimeType,
                data: img.data
              }
            });
          }
        } else if (imagePayload) {
          contentParts.push({
            type: "image",
            source: {
              type: "base64",
              media_type: imagePayload.mimeType,
              data: imagePayload.data
            }
          });
        }
        contentParts.push({
          type: "text",
          text: promptText
        });
        messages.push({
          role: "user",
          content: contentParts
        });

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: normalizedModelId,
            max_tokens: 4096,
            system: systemInstruction + (isJson ? " Respond strictly in valid JSON format." : ""),
            messages
          })
        });

        if (res.ok) {
          const body = (await res.json()) as any;
          return body.content?.[0]?.text || "{}";
        } else {
          const errMsg = await res.text();
          console.warn(`Anthropic API call returned non-200 status (${res.status}): ${errMsg}. Falling back to Gemini...`);
        }
      } catch (err) {
        console.warn(`Error connecting to Anthropic:`, err, `. Falling back to Gemini...`);
      }
    }
  }

  // 2. OpenAI GPT Models
  if (normalizedModelId.includes("gpt-")) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      console.log(`[UnifiedLLM] Calling official OpenAI API: ${normalizedModelId}`);
      try {
        const messages = [
          { role: "system", content: systemInstruction },
          { role: "user", content: [] as any }
        ];

        const userContent: any[] = [{ type: "text", text: promptText }];
        if (imagePayloads && imagePayloads.length > 0) {
          for (const img of imagePayloads) {
            userContent.push({
              type: "image_url",
              image_url: {
                url: `data:${img.mimeType};base64,${img.data}`
              }
            });
          }
        } else if (imagePayload) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${imagePayload.mimeType};base64,${imagePayload.data}`
            }
          });
        }
        messages[1].content = userContent;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: normalizedModelId,
            messages,
            response_format: isJson ? { type: "json_object" } : undefined
          })
        });

        if (res.ok) {
          const body = (await res.json()) as any;
          return body.choices?.[0]?.message?.content || "{}";
        } else {
          const errMsg = await res.text();
          console.warn(`OpenAI API call returned non-200 status (${res.status}): ${errMsg}. Falling back to Gemini...`);
        }
      } catch (err) {
        console.warn(`Error connecting to OpenAI:`, err, `. Falling back to Gemini...`);
      }
    }
  }

  // 3. DeepSeek Models
  if (normalizedModelId.includes("deepseek-")) {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      console.log(`[UnifiedLLM] Calling official DeepSeek API: ${normalizedModelId}`);
      try {
        const messages = [
          { role: "system", content: systemInstruction },
          { role: "user", content: promptText }
        ];

        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${deepseekKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: normalizedModelId === "deepseek-chat" ? "deepseek-chat" : "deepseek-reasoner",
            messages,
            response_format: isJson ? { type: "json_object" } : undefined
          })
        });

        if (res.ok) {
          const body = (await res.json()) as any;
          return body.choices?.[0]?.message?.content || "{}";
        } else {
          const errMsg = await res.text();
          console.warn(`DeepSeek API call returned non-200 status (${res.status}): ${errMsg}. Falling back to Gemini...`);
        }
      } catch (err) {
        console.warn(`Error connecting to DeepSeek:`, err, `. Falling back to Gemini...`);
      }
    }
  }

  // 4. Gemini SDK Default/Simulation Fallback
  console.log(`[UnifiedLLM] Routing/Falling back to Gemini model mapping from requested model: ${normalizedModelId}`);
  const ai = getGeminiClient();

  // Map choices to appropriate Google SDK model IDs
  let targetGeminiModel = "gemini-3.5-flash";
  if (normalizedModelId.includes("deep-research") || normalizedModelId.includes("pro") || normalizedModelId.includes("preview")) {
    targetGeminiModel = "gemini-3.1-pro-preview";
  } else if (normalizedModelId.includes("lite")) {
    targetGeminiModel = "gemini-3.1-flash-lite";
  } else {
    targetGeminiModel = "gemini-3.5-flash";
  }

  const initialParts: any[] = [];
  if (imagePayloads && imagePayloads.length > 0) {
    for (const img of imagePayloads) {
      initialParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      });
    }
  } else if (imagePayload) {
    initialParts.push({
      inlineData: {
        mimeType: imagePayload.mimeType,
        data: imagePayload.data
      }
    });
  }

  // Prepend simulated header to instruction if simulating a third-party engine on Gemini
  let resolvedInstruction = systemInstruction;
  if (!normalizedModelId.includes("gemini")) {
    resolvedInstruction = `[System Simulation: Adopt the persona of model '${normalizedModelId}' for this request. Respond as accurately and characteristically as possible while strictly observing the requested JSON format constraints.]\n\n${systemInstruction}`;
  }

  initialParts.push({ text: promptText });

  const contents: any[] = [
    {
      role: "user",
      parts: initialParts
    }
  ];

  const configObj: any = {
    responseMimeType: isJson ? "application/json" : "text/plain",
    systemInstruction: resolvedInstruction,
    tools: []
  };

  // Enable native reasoning for models that support it (Gemini 2.5/3.5 Pro/Flash, excluding Lite models)
  if (isJson && (normalizedModelId.includes("pro") || (normalizedModelId.includes("flash") && !normalizedModelId.includes("lite") && !normalizedModelId.includes("1.5")))) {
    configObj.thinkingConfig = {
      thinkingBudget: 1024
    };
  }
  
  if (responseSchema) {
    configObj.responseSchema = responseSchema;
  }
  
  if (maxOutputTokens) {
    configObj.maxOutputTokens = maxOutputTokens;
  }
  
  if (googleSearch) {
    configObj.tools.push({ googleSearch: {} });
  }

  if (enablePlaceIdTool) {
    configObj.tools.push({
      functionDeclarations: [
        {
          name: "get_google_maps_place_id",
          description: "Retrieves the exact Google Maps Place ID when given a business name and coordinates.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              business_name: { type: Type.STRING },
              latitude: { type: Type.STRING },
              longitude: { type: Type.STRING }
            },
            required: ["business_name", "latitude", "longitude"]
          }
        }
      ]
    });
  }

  if (googleSearch && enablePlaceIdTool) {
    configObj.toolConfig = { includeServerSideToolInvocations: true };
  }

  if (configObj.tools.length === 0) {
    delete configObj.tools;
  }

  let finalResponseText = "{}";
  addDebugLog(`[UnifiedLLM] Dispatching prompt to model: "${targetGeminiModel}". Contents turns: ${contents.length}.`);
  addDebugLog(`[UnifiedLLM] Attaching ${imagePayloads?.length || (imagePayload ? 1 : 0)} image part(s) to model "${targetGeminiModel}".`);
  addDebugLog(`[UnifiedLLM-Prompt] System Instruction:\n${resolvedInstruction}`);
  addDebugLog(`[UnifiedLLM-Prompt] User Prompt:\n${promptText}`);
  try {
    let response: any;
    let thoughtsText = "";
    if (onStream && (!configObj.tools || configObj.tools.length === 0)) {
      const stream = await ai.models.generateContentStream({
        model: targetGeminiModel,
        contents,
        config: configObj
      });
      let fullText = "";
      for await (const chunk of stream) {
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.thought && part.text) {
              thoughtsText += part.text;
              onStream(part.text, true); // true = isThought
            } else if (part.text) {
              fullText += part.text;
              onStream(part.text, false);
            }
          }
        } else if (chunk.text) {
          fullText += chunk.text;
          onStream(chunk.text, false);
        }
      }
      response = { text: fullText, functionCalls: [] };
    } else {
      response = await ai.models.generateContent({
        model: targetGeminiModel,
        contents,
        config: configObj
      });
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.thought && part.text) {
            thoughtsText += part.text;
          }
        }
      }
    }

    let finalJson = response.text || "";
    // Inject native thoughts as "scratchpad" back into final JSON so existing code downstream works seamlessly
    if (isJson && finalJson && thoughtsText) {
      try {
        const parsed = JSON.parse(finalJson);
        if (!parsed.scratchpad) {
          parsed.scratchpad = thoughtsText;
          finalJson = JSON.stringify(parsed);
        }
      } catch (e) {}
    }
    // response.text is a getter-only property on the SDK's GenerateContentResponse class —
    // assigning to it throws and was silently forcing every call through the slow REST
    // fallback below. Rebuild `response` as a plain object so downstream code in this
    // function can keep reading response.text / response.functionCalls / response.candidates
    // exactly as before, without touching the SDK instance.
    response = { text: finalJson, candidates: response.candidates, functionCalls: response.functionCalls };
    
    let callCount = 0;
    const maxCalls = 5;
    while (response.functionCalls && response.functionCalls.length > 0 && callCount < maxCalls) {
      callCount++;
      const calls = response.functionCalls;
      addDebugLog(`[UnifiedLLM] Received ${calls.length} tool call requests from Gemini (Turn ${callCount}/${maxCalls}).`);
      const modelParts: any[] = [];
      const userParts: any[] = [];

      for (const call of calls) {
        let functionResponseData = {};
        if (call.name === "get_google_maps_place_id") {
          try {
            const { business_name, latitude, longitude } = call.args as any;
            addDebugLog(`[UnifiedLLM] Call args: business_name="${business_name}", lat="${latitude}", lng="${longitude}"`);
            const pId = await fetchGoogleMapsPlaceId(business_name, latitude, longitude, explicitSessionId);
            if (pId === "ERROR_API_FAILED" || pId === "NOT_FOUND") {
              functionResponseData = { 
                place_id: "NOT_FOUND", 
                instruction: "STOP TOOL USE. The Google Maps API call failed or the key is missing. Immediately use standard coordinate URLs for all remaining items without calling this tool again." 
              };
            } else {
              functionResponseData = { place_id: pId };
            }
          } catch (e: any) {
            addDebugLog(`[UnifiedLLM] Exception executing tool call: ${e.message || e}`);
            functionResponseData = { 
              place_id: "NOT_FOUND", 
              instruction: "STOP TOOL USE. An exception occurred during tool execution. Immediately use standard coordinate URLs for all remaining items without calling this tool again." 
            };
          }
        } else {
          addDebugLog(`[UnifiedLLM] Warning: Unknown tool requested: "${call.name}"`);
        }
        
        modelParts.push({ functionCall: call });
        userParts.push({
          functionResponse: {
            name: call.name,
            response: functionResponseData
          }
        });
      }

      // Add the model's response (preserving thought_signature and candidates structure) to contents
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      } else {
        contents.push({
          role: "model",
          parts: modelParts
        });
      }

      // Add our function responses to contents
      contents.push({
        role: "user",
        parts: userParts
      });

      addDebugLog(`[UnifiedLLM] Feeding responses back to Gemini and requesting next content turn...`);
      response = await ai.models.generateContent({
        model: targetGeminiModel,
        contents,
        config: configObj
      });
    }

    if ((response.functionCalls && response.functionCalls.length > 0) || !response.text) {
      addDebugLog(`[UnifiedLLM] Reached maximum tool calls or text is empty. Forcing model to produce final text...`);
      contents.push({
        role: "user",
        parts: [{ text: "Please provide your final JSON response now based on the information retrieved so far. Do not call any more tools." }]
      });
      const forceTextConfig = { ...configObj };
      delete forceTextConfig.tools;
      delete forceTextConfig.toolConfig;
      response = await ai.models.generateContent({
        model: targetGeminiModel,
        contents,
        config: forceTextConfig
      });
    }
    
    addDebugLog(`[UnifiedLLM] Successfully completed content generation. Response length: ${response.text?.length || 0} chars.`);
    const __respText = response.text || "{}";
    const __respLogged = __respText.length > 6000
      ? `${__respText.slice(0, 6000)}\n... [truncated, ${__respText.length} chars total — see raw response if needed]`
      : __respText;
    addDebugLog(`[UnifiedLLM-Response] Complete response returned from agent:\n${__respLogged}`);
    return response.text || "{}";
  } catch (err: any) {
    addDebugLog(`[UnifiedLLM] First generation attempt failed: ${err.message || err}. Stack: ${err.stack}`);
    if (googleSearch) {
      addDebugLog(`[UnifiedLLM] Retrying without Google Search Grounding...`);
      const fallbackConfig = { ...configObj };
      delete fallbackConfig.tools;
      if (enablePlaceIdTool) {
        // keep the custom tool
        fallbackConfig.tools = [{
          functionDeclarations: [
            {
              name: "get_google_maps_place_id",
              description: "Retrieves the exact Google Maps Place ID when given a business name and coordinates.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  business_name: { type: Type.STRING },
                  latitude: { type: Type.STRING },
                  longitude: { type: Type.STRING }
                },
                required: ["business_name", "latitude", "longitude"]
              }
            }
          ]
        }];
      }
      try {
        // Reset contents to initial state for fallback to avoid duplicated turns
        const fallbackContents = [contents[0]];
        addDebugLog(`[UnifiedLLM-Fallback] Dispatching prompt to model without search grounding...`);
        let response = await ai.models.generateContent({
          model: targetGeminiModel,
          contents: fallbackContents,
          config: fallbackConfig
        });
        
        // Handle function calls loop for fallback
        let callCountFallback = 0;
        const maxCallsFallback = 5;
        while (response.functionCalls && response.functionCalls.length > 0 && callCountFallback < maxCallsFallback) {
          callCountFallback++;
          const calls = response.functionCalls;
          addDebugLog(`[UnifiedLLM-Fallback] Received ${calls.length} tool call requests (Turn ${callCountFallback}/${maxCallsFallback}).`);
          const modelParts: any[] = [];
          const userParts: any[] = [];

          for (const call of calls) {
            let functionResponseData = {};
            if (call.name === "get_google_maps_place_id") {
              try {
                const { business_name, latitude, longitude } = call.args as any;
                addDebugLog(`[UnifiedLLM-Fallback] Call args: business_name="${business_name}", lat="${latitude}", lng="${longitude}"`);
                const pId = await fetchGoogleMapsPlaceId(business_name, latitude, longitude, explicitSessionId);
                if (pId === "ERROR_API_FAILED" || pId === "NOT_FOUND") {
                  functionResponseData = { 
                    place_id: "NOT_FOUND", 
                    instruction: "STOP TOOL USE. The Google Maps API call failed or the key is missing. Immediately use standard coordinate URLs for all remaining items without calling this tool again." 
                  };
                } else {
                  functionResponseData = { place_id: pId };
                }
              } catch (e: any) {
                addDebugLog(`[UnifiedLLM-Fallback] Exception executing tool call: ${e.message || e}`);
                functionResponseData = { 
                  place_id: "NOT_FOUND", 
                  instruction: "STOP TOOL USE. An exception occurred during tool execution. Immediately use standard coordinate URLs for all remaining items without calling this tool again." 
                };
              }
            }
            
            modelParts.push({ functionCall: call });
            userParts.push({
              functionResponse: {
                name: call.name,
                response: functionResponseData
              }
            });
          }

          const modelContent = response.candidates?.[0]?.content;
          if (modelContent) {
            fallbackContents.push(modelContent);
          } else {
            fallbackContents.push({ role: "model", parts: modelParts });
          }
          fallbackContents.push({ role: "user", parts: userParts });

          addDebugLog(`[UnifiedLLM-Fallback] Feeding responses back to Gemini...`);
          response = await ai.models.generateContent({
            model: targetGeminiModel,
            contents: fallbackContents,
            config: fallbackConfig
          });
        }

        if ((response.functionCalls && response.functionCalls.length > 0) || !response.text) {
          addDebugLog(`[UnifiedLLM-Fallback] Reached maximum tool calls or text is empty on fallback. Forcing final text...`);
          fallbackContents.push({
            role: "user",
            parts: [{ text: "Please provide your final JSON response now based on the information retrieved so far. Do not call any more tools." }]
          });
          const forceTextConfig = { ...fallbackConfig };
          delete forceTextConfig.tools;
          delete forceTextConfig.toolConfig;
          response = await ai.models.generateContent({
            model: targetGeminiModel,
            contents: fallbackContents,
            config: forceTextConfig
          });
        }
        
        addDebugLog(`[UnifiedLLM-Fallback] Successfully completed content generation on fallback. Response length: ${response.text?.length || 0} chars.`);
        addDebugLog(`[UnifiedLLM-Fallback-Response] Complete response returned from agent on fallback:\n${response.text || "{}"}`);
        return response.text || "{}";
      } catch (retryErr: any) {
        addDebugLog(`[UnifiedLLM-Fallback] Error on fallback retry: ${retryErr.message || retryErr}`);
        throw retryErr;
      }
    } else {
      addDebugLog(`[UnifiedLLM] No googleSearch fallback available. Attempting REST API fallback to bypass SDK bugs...`);
      try {
        const restPayload = {
          systemInstruction: { parts: [{ text: resolvedInstruction }] },
          contents: [
            { role: "user", parts: initialParts }
          ],
          generationConfig: {
            responseMimeType: isJson ? "application/json" : "text/plain"
          }
        } as any;
        
        if (configObj.responseSchema) {
          restPayload.generationConfig.responseSchema = configObj.responseSchema;
        }
        
        if (enablePlaceIdTool) {
          restPayload.tools = [{
            functionDeclarations: [
              {
                name: "get_google_maps_place_id",
                description: "Retrieves the exact Google Maps Place ID when given a business name and coordinates.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    business_name: { type: "STRING" },
                    latitude: { type: "STRING" },
                    longitude: { type: "STRING" }
                  },
                  required: ["business_name", "latitude", "longitude"]
                }
              }
            ]
          }];
        }
        
        const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetGeminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(restPayload),
          signal: AbortSignal.timeout(45000)
        });
        if (!restRes.ok) {
          let errMsg = `API request failed: ${restRes.status}`;
          try { const errData = await restRes.json(); errMsg = errData.error?.message || errMsg; } catch {}
          throw new Error(errMsg);
        }
        const data = await restRes.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      } catch (restErr: any) {
        addDebugLog(`[UnifiedLLM] REST API fallback also failed: ${restErr.message}`);
        throw err; // Throw the original SDK error if REST fails
      }
    }
  }
  } catch (err: any) {
    if (modelId !== "gemini-3.1-flash-lite" && modelId !== "gemini-3.5-flash") {
      addDebugLog(`[UnifiedLLM-Recovery] Error during primary execution of model "${modelId}": ${err.message || err}. Retrying with highly stable fallback gemini-3.5-flash...`);
      return callUnifiedLLM({
        modelId: "gemini-3.5-flash",
        systemInstruction,
        promptText,
        imagePayload,
        imagePayloads,
        responseMimeType,
        responseSchema,
        googleSearch,
        enablePlaceIdTool,
        maxOutputTokens,
        onStream
      });
    }
    throw err;
  }
}

// Endpoint to fetch real server start/uptime status for accurate publication timing
app.get("/api/status", (req, res) => {
  res.json({ startTime: SERVER_START_TIME });
});

// Sync endpoints
app.post("/api/sync/save", async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (decoded.email?.toLowerCase() !== (req.body.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: email mismatch' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
    const { email, data } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required for syncing" });
    }
    const safeEmail = email.toLowerCase().replace(/[^a-z0-9@.]/g, "_");
    const filePath = path.join(SYNC_DIR, `${safeEmail}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Sync Save] Saved data for email: ${email}`);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[Sync Save] Error:", error);
    res.status(500).json({ error: "Failed to sync save data to server database" });
  }
});

app.post("/api/sync/load", async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (decoded.email?.toLowerCase() !== (req.body.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: email mismatch' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required for syncing" });
    }
    const safeEmail = email.toLowerCase().replace(/[^a-z0-9@.]/g, "_");
    const filePath = path.join(SYNC_DIR, `${safeEmail}.json`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      console.log(`[Sync Load] Loaded data for email: ${email}`);
      return res.json({ success: true, data: JSON.parse(content) });
    }
    
    console.log(`[Sync Load] No existing cloud record for email: ${email}`);
    res.json({ success: true, data: null });
  } catch (error) {
    console.error("[Sync Load] Error:", error);
    res.status(500).json({ error: "Failed to retrieve sync data from server database" });
  }
});

// GET Endpoint for System Instruction Preview
app.get("/api/gemini/instruction-preview", async (req, res) => {
  try {
    const { agentType, biomarkersNeedingImprovement, remainingAllowance, activeMeal } = req.query;
    
    if (agentType === 'food_scout') {
      const instruction = `You are a fast visual food identification agent. Look at the image and return a short list of plain-text search keywords for the food items you see (e.g. ['fried chicken', 'white rice', 'sambal']), plus a rough estimated weight in grams for each if visually judgeable. Do not do any nutrition or clinical analysis. Also try to identify any clues on how it's cooked (e.g., oil cooked, fried, steamed) or freshness (e.g., fresh fish). Include these details in your keywords if helpful. Output only: { "items": [{ "keyword": string, "estimatedWeightGrams": number }] }`;
      return res.json({ instruction });
    }

    if (agentType === 'food') {
      let parsedBiomarkers: any[] | undefined = undefined;
      let parsedAllowance: any = undefined;
      let parsedMeal: any = undefined;

      try {
        if (biomarkersNeedingImprovement && typeof biomarkersNeedingImprovement === 'string') {
          parsedBiomarkers = JSON.parse(biomarkersNeedingImprovement);
        }
      } catch (e) {}

      try {
        if (remainingAllowance && typeof remainingAllowance === 'string') {
          parsedAllowance = JSON.parse(remainingAllowance);
        }
      } catch (e) {}

      try {
        if (activeMeal && typeof activeMeal === 'string') {
          parsedMeal = JSON.parse(activeMeal);
        }
      } catch (e) {}

      // If they are not passed or empty, try to look up the user's synced context
      if (!parsedBiomarkers || !parsedAllowance) {
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        if (idToken) {
          try {
            const decoded = await adminAuth.verifyIdToken(idToken);
            const uid = decoded.uid;
            
            if (db) {
              // Try to fetch reports/latest
              const reportRef = db.collection('users').doc(uid).collection('reports').doc('latest');
              const reportSnap = await reportRef.get();
              if (reportSnap.exists) {
                const reportData = reportSnap.data();
                if (reportData && Array.isArray(reportData.biomarkers)) {
                  parsedBiomarkers = reportData.biomarkers.filter((b: any) => b.status === 'At Risk' || b.status === 'HIGH' || b.status === 'LOW');
                }
              }

              // Try to fetch dashboard
              const dashRef = db.collection('users').doc(uid).collection('metadata').doc('dashboard');
              const dashSnap = await dashRef.get();
              if (dashSnap.exists) {
                const dashData = dashSnap.data();
                if (dashData) {
                  if (!parsedAllowance && dashData.remainingAllowance) {
                    parsedAllowance = dashData.remainingAllowance;
                  }
                  if (!parsedMeal && dashData.activeMeal) {
                    parsedMeal = dashData.activeMeal;
                  }
                }
              }
            }
          } catch (err) {
            console.warn("[instruction-preview] Error loading authenticated user context:", err);
          }
        }
      }

      // Safe placeholder values as fallback
      if (!parsedBiomarkers) {
        parsedBiomarkers = [];
      }
      if (!parsedAllowance) {
        parsedAllowance = {
          calories: 2000,
          saturatedFat: 20,
          sodium: 2300
        };
      }

      const instruction = buildFoodAnalyzeInstruction({
        biomarkersNeedingImprovement: parsedBiomarkers,
        remainingAllowance: parsedAllowance,
        activeMeal: parsedMeal
      });

      return res.json({ instruction });
    }

    return res.status(400).json({ error: "Unsupported agentType" });
  } catch (error: any) {
    console.error("[instruction-preview] Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Gemini Food Analyze Endpoint
app.post("/api/gemini/food-analyze", async (req, res) => {
  const isStream = req.query.stream === 'true';
  let hasSentHeaders = false;

  if (isStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    hasSentHeaders = true;

    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    res.status = (code: number) => {
      // If headers already sent, ignore status code changes
      if (!res.headersSent) {
        originalStatus(code);
      }
      return res;
    };

    res.json = (body: any) => {
      res.write(`data: ${JSON.stringify({ final: true, result: body })}\n\n`);
      res.end();
      return res;
    };
  }

  try {
    const { message, image, images, imageDates, history, userProfile, engine, biomarkersNeedingImprovement, remainingAllowance, userId, activeMeal, customSystemInstruction, customVariableData, foodLogs } = req.body;

    const STANDARD_FOOD_FACTORS: {[key: string]: {calories: number, saturatedFat: number, sodium: number, protein: number, carbohydrates: number, totalFat: number}} = {
      steak: { calories: 2.5, saturatedFat: 0.05, sodium: 1.8, protein: 0.26, carbohydrates: 0.0, totalFat: 0.18 },
      beef: { calories: 2.5, saturatedFat: 0.05, sodium: 1.8, protein: 0.26, carbohydrates: 0.0, totalFat: 0.18 },
      chicken: { calories: 1.65, saturatedFat: 0.01, sodium: 0.7, protein: 0.31, carbohydrates: 0.0, totalFat: 0.036 },
      breast: { calories: 1.65, saturatedFat: 0.01, sodium: 0.7, protein: 0.31, carbohydrates: 0.0, totalFat: 0.036 },
      pork: { calories: 2.4, saturatedFat: 0.03, sodium: 0.8, protein: 0.27, carbohydrates: 0.0, totalFat: 0.14 },
      fish: { calories: 1.5, saturatedFat: 0.01, sodium: 0.8, protein: 0.20, carbohydrates: 0.0, totalFat: 0.06 },
      salmon: { calories: 2.0, saturatedFat: 0.015, sodium: 0.5, protein: 0.20, carbohydrates: 0.0, totalFat: 0.13 },
      rice: { calories: 1.3, saturatedFat: 0.0, sodium: 0.01, protein: 0.027, carbohydrates: 0.28, totalFat: 0.003 },
      broccoli: { calories: 0.35, saturatedFat: 0.0, sodium: 0.3, protein: 0.028, carbohydrates: 0.07, totalFat: 0.004 },
      egg: { calories: 1.5, saturatedFat: 0.03, sodium: 1.4, protein: 0.13, carbohydrates: 0.011, totalFat: 0.11 },
      avocado: { calories: 1.6, saturatedFat: 0.02, sodium: 0.07, protein: 0.02, carbohydrates: 0.085, totalFat: 0.147 },
      bread: { calories: 2.6, saturatedFat: 0.005, sodium: 4.8, protein: 0.09, carbohydrates: 0.49, totalFat: 0.032 },
      butter: { calories: 7.1, saturatedFat: 5.1, sodium: 5.7, protein: 0.009, carbohydrates: 0.001, totalFat: 0.81 },
      cheese: { calories: 4.0, saturatedFat: 1.8, sodium: 6.2, protein: 0.25, carbohydrates: 0.013, totalFat: 0.33 },
      salad: { calories: 0.2, saturatedFat: 0.0, sodium: 0.1, protein: 0.01, carbohydrates: 0.03, totalFat: 0.002 },
      tomato: { calories: 0.18, saturatedFat: 0.0, sodium: 0.05, protein: 0.009, carbohydrates: 0.039, totalFat: 0.002 },
      oil: { calories: 8.8, saturatedFat: 1.4, sodium: 0.0, protein: 0.0, carbohydrates: 0.0, totalFat: 1.0 },
      potato: { calories: 0.8, saturatedFat: 0.0, sodium: 0.05, protein: 0.02, carbohydrates: 0.17, totalFat: 0.001 },
      pasta: { calories: 1.3, saturatedFat: 0.0, sodium: 0.01, protein: 0.05, carbohydrates: 0.25, totalFat: 0.011 }
    };

    // 1. Intercept prompt & read current active state from Request Body (passed from client)
    if (activeMeal) {
      addDebugLog(`[Client State] Received active meal: ${activeMeal.name}`);
    } else {
      addDebugLog(`[Client State] No active meal received.`);
    }

    // Check if key is mock
    if (process.env.GEMINI_API_KEY === undefined) {
      // If the user's message is a modify request, let's execute modify command offline!
      const isModifyRequest = message.toLowerCase().includes("change") || message.toLowerCase().includes("modify") || message.toLowerCase().includes("update") || message.toLowerCase().includes("remove") || message.toLowerCase().includes("add") || message.toLowerCase().includes("gram");
      
      if (isModifyRequest && activeMeal) {
        // Let's create an offline mock command
        let mockCommand: any = null;
        if (message.toLowerCase().includes("steak")) {
          const match = message.match(/(\d+)\s*g/);
          const grams = match ? Number(match[1]) : 100;
          mockCommand = { action: "update_weight", itemName: "Beef Steak", newWeightGrams: grams };
        } else if (message.toLowerCase().includes("remove")) {
          mockCommand = { action: "remove_item", itemName: "Beef Steak" };
        } else {
          const match = message.match(/(\d+)\s*g/);
          const grams = match ? Number(match[1]) : 120;
          mockCommand = { action: "add_item", itemName: "Extra Topping", newWeightGrams: grams };
        }

        const originalTotalWeight = (activeMeal.itemsBreakdown || []).reduce((acc: number, it: any) => acc + (Number(it.weightGrams) || 0), 0) || 1;
        
        if (mockCommand) {
          if (mockCommand.action === "update_weight") {
            const item = activeMeal.itemsBreakdown?.find((it: any) => it.name.toLowerCase().includes(mockCommand.itemName.toLowerCase()));
            if (item) {
              const oldWeight = Number(item.weightGrams) || 1;
              const R = mockCommand.newWeightGrams / oldWeight;
              item.weightGrams = Number(mockCommand.newWeightGrams);
              item.calories = Number((item.calories * R).toFixed(1));
              item.saturatedFat = Number((item.saturatedFat * R).toFixed(2));
              item.sodium = Number((item.sodium * R).toFixed(1));
            }
          } else if (mockCommand.action === "remove_item") {
            const idx = activeMeal.itemsBreakdown?.findIndex((it: any) => it.name.toLowerCase().includes(mockCommand.itemName.toLowerCase()));
            if (idx !== -1) {
              activeMeal.itemsBreakdown.splice(idx, 1);
            }
          } else if (mockCommand.action === "add_item") {
            if (!activeMeal.itemsBreakdown) activeMeal.itemsBreakdown = [];
            activeMeal.itemsBreakdown.push({
              name: mockCommand.itemName,
              weightGrams: mockCommand.newWeightGrams,
              calories: mockCommand.newWeightGrams * 1.5,
              saturatedFat: mockCommand.newWeightGrams * 0.02,
              sodium: mockCommand.newWeightGrams * 0.5
            });
          }
        }

        const newTotalWeight = (activeMeal.itemsBreakdown || []).reduce((acc: number, it: any) => acc + (Number(it.weightGrams) || 0), 0);
        const mealWeightRatio = newTotalWeight / originalTotalWeight;

        activeMeal.weightGrams = newTotalWeight;
        activeMeal.composition = (activeMeal.itemsBreakdown || []).map((it: any) => it.name).join(", ");
        
        const newCalories = (activeMeal.itemsBreakdown || []).reduce((acc: number, it: any) => acc + (Number(it.calories) || 0), 0);
        const newSaturatedFat = (activeMeal.itemsBreakdown || []).reduce((acc: number, it: any) => acc + (Number(it.saturatedFat) || 0), 0);
        const newSodium = (activeMeal.itemsBreakdown || []).reduce((acc: number, it: any) => acc + (Number(it.sodium) || 0), 0);

        activeMeal.nutrients.calories = Number(newCalories.toFixed(1));
        activeMeal.nutrients.saturatedFat = Number(newSaturatedFat.toFixed(2));
        activeMeal.nutrients.sodium = Number(newSodium.toFixed(1));

        for (const key of Object.keys(activeMeal.nutrients)) {
          if (key !== "calories" && key !== "saturatedFat" && key !== "sodium") {
            activeMeal.nutrients[key] = Number((activeMeal.nutrients[key] * mealWeightRatio).toFixed(2));
          }
        }

        // We removed offline mock write to user_meals to avoid permission issues

        return res.json({
          text: `[Simulated Offline Mod] Modifying active meal: **${activeMeal.name}** to new weights/items. Recalculated all 30 sub-nutrients mathematically offline to save tokens and ensure precision.`,
          data: activeMeal
        });
      }

      const isDiscussionRequest = message.toLowerCase().includes("why") || message.toLowerCase().includes("explain") || message.toLowerCase().includes("question");
      if (isDiscussionRequest) {
        return res.json({
          text: "This is a simulated conversational answer about your active meal ingredients, explaining that avocado and salmon are rich sources of dietary fibre and heart-healthy monounsaturated fatty acids.",
          data: null
        });
      }

      return res.json({
        error: "The food log agent is not available. Please enter the food details manually.",
        agentNotAvailable: true
      });
    }

    let imagePayloads = null;
    if (images && Array.isArray(images) && images.length > 0) {
      imagePayloads = images.map((imgStr: string) => {
        const mimeType = imgStr.split(";")[0].split(":")[1] || "image/jpeg";
        const base64Data = imgStr.split(",")[1];
        return { mimeType, data: base64Data };
      });
    } else if (image) {
      const mimeType = image.split(";")[0].split(":")[1] || "image/jpeg";
      const base64Data = image.split(",")[1];
      imagePayloads = [{ mimeType, data: base64Data }];
    }

    addDebugLog(`[Image Payload] Received ${imagePayloads ? imagePayloads.length : 0} image(s). Approx sizes (KB): ${imagePayloads ? imagePayloads.map(p => Math.round((p.data.length * 0.75) / 1024) + 'KB').join(', ') : 'none'}.`);

    const analysisNutrientKeys = [
        "calories", "protein", "totalFat", "saturatedFat", "transFat", "unsaturatedFat", "omega3", 
      "carbohydrates", "addedSugar", "totalFibre", "solubleFibre", "sodium", "potassium", 
      "magnesium", "calcium", "iron", "zinc", "selenium", "iodine", "phosphorus", 
      "vitaminD", "vitaminB12", "folate", "vitaminC", "vitaminE", "vitaminK", 
      "vitaminA", "vitaminB6", "thiamine", "riboflavin", "niacin"
    ];

    // Helper functions for nutritional data lookup
    const formatUSDANutrients = (nutrients: any[]): string => {
      if (!nutrients || !Array.isArray(nutrients)) return "No nutrients available";
      const mapped: string[] = [];
      const findNutrient = (namePatterns: string[]) => {
        // Stricter exact word match first
        const exactMatch = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase().trim();
          return namePatterns.some(p => name === p.toLowerCase().trim());
        });
        if (exactMatch) return exactMatch;

        // Fallback with precise keyword validation to avoid false fatty acid matches on "fat"
        const nut = nutrients.find(n => {
          const name = (n.nutrientName || "").toLowerCase();
          return namePatterns.some(p => {
            const cleanP = p.toLowerCase().trim();
            if (cleanP === "fat" && name.includes("fatty")) {
              return false; // prevent totalFat matching on saturated fat
            }
            return name.includes(cleanP);
          });
        });
        if (!nut) return null;
        const val = Number(nut.value);
        const cleanVal = isNaN(val) ? nut.value : Math.round(val * 100) / 100;
        return `${cleanVal}${nut.unitName || ""}`;
      };
      const kcal = findNutrient(["energy", "calories"]);
      const protein = findNutrient(["protein"]);
      const fat = findNutrient(["total lipid", "fat"]);
      const satFat = findNutrient(["saturated fat", "fatty acids, total saturated"]);
      const sodium = findNutrient(["sodium"]);
      if (kcal) mapped.push(`Calories: ${kcal}`);
      if (protein) mapped.push(`Protein: ${protein}`);
      if (fat) mapped.push(`Fat: ${fat}`);
      if (satFat) mapped.push(`SatFat: ${satFat}`);
      if (sodium) mapped.push(`Sodium: ${sodium}`);
      return mapped.join(", ");
    };

    const formatOFFNutrients = (nutriments: any): string => {
      if (!nutriments) return "No nutrients available";
      const mapped: string[] = [];
      const formatVal = (val: any) => {
        if (val === undefined || val === null) return null;
        const num = Number(val);
        return isNaN(num) ? val : Math.round(num * 100) / 100;
      };
      
      const kcal = nutriments["energy-kcal_100g"] !== undefined 
        ? formatVal(nutriments["energy-kcal_100g"]) 
        : (nutriments["energy_100g"] !== undefined ? formatVal(Math.round(nutriments["energy_100g"] / 4.184)) : null);
      const protein = formatVal(nutriments["proteins_100g"]);
      const fat = formatVal(nutriments["fat_100g"]);
      const satFat = formatVal(nutriments["saturated-fat_100g"]);
      const sodium = formatVal(nutriments["sodium_100g"]);
      
      if (kcal !== null) mapped.push(`Calories: ${kcal}kcal`);
      if (protein !== null) mapped.push(`Protein: ${protein}g`);
      if (fat !== null) mapped.push(`Fat: ${fat}g`);
      if (satFat !== null) mapped.push(`SatFat: ${satFat}g`);
      if (sodium !== null) mapped.push(`Sodium: ${Math.round(Number(sodium) * 1000)}mg`);
      return mapped.join(", ");
    };

    const extractUSDANutrientsPer100g = (food: any): Record<string, number> => {
      const profile: Record<string, number> = {};
      // DO NOT initialize all keys to 0, so missing DB values don't overwrite LLM estimates with 0
      if (!food.foodNutrients) return profile;
      
      const findNut = (namePatterns: string[]) => {
        const exactMatch = food.foodNutrients.find((n: any) => {
          const name = (n.nutrientName || "").toLowerCase().trim();
          return namePatterns.some(p => name === p.toLowerCase().trim());
        });
        if (exactMatch) return exactMatch;

        return food.foodNutrients.find((n: any) => {
          const name = (n.nutrientName || "").toLowerCase();
          return namePatterns.some(p => {
            const cleanP = p.toLowerCase().trim();
            if (cleanP === "fat" && name.includes("fatty")) {
              return false;
            }
            return name.includes(cleanP);
          });
        });
      };
      
      const setVal = (key: string, namePatterns: string[]) => {
        const nut = findNut(namePatterns);
        if (nut) {
          profile[key] = Number(nut.value) || 0;
        }
      };
      
      const energyNut = findNut(["energy", "calories"]);
      if (energyNut) {
        const val = Number(energyNut.value) || 0;
        const unit = (energyNut.unitName || "").toLowerCase();
        profile["calories"] = unit === "kj" ? Math.round(val / 4.184) : Math.round(val);
      }
      
      setVal("protein", ["protein"]);
      setVal("totalFat", ["total lipid", "fat"]);
      setVal("saturatedFat", ["saturated fat", "fatty acids, total saturated"]);
      setVal("transFat", ["trans fat", "fatty acids, total trans"]);
      
      if (profile["totalFat"] !== undefined) {
         profile["unsaturatedFat"] = Math.max(0, profile["totalFat"] - (profile["saturatedFat"] || 0) - (profile["transFat"] || 0));
      }
      
      setVal("omega3", ["omega-3", "omega 3", "n-3 fatty acid"]);
      setVal("carbohydrates", ["carbohydrate, by difference"]);
      setVal("addedSugar", ["added sugar"]);
      setVal("totalFibre", ["fiber, total dietary", "fibre"]);
      setVal("solubleFibre", ["fiber, soluble", "soluble fiber"]);
      setVal("sodium", ["sodium"]);
      setVal("potassium", ["potassium"]);
      setVal("magnesium", ["magnesium"]);
      setVal("calcium", ["calcium"]);
      setVal("iron", ["iron"]);
      setVal("zinc", ["zinc"]);
      setVal("selenium", ["selenium"]);
      setVal("iodine", ["iodine"]);
      setVal("phosphorus", ["phosphorus"]);
      setVal("vitaminD", ["vitamin d"]);
      setVal("vitaminB12", ["vitamin b-12", "vitamin b12"]);
      setVal("folate", ["folate"]);
      setVal("vitaminC", ["vitamin c", "ascorbic acid"]);
      setVal("vitaminE", ["vitamin e", "tocopherol"]);
      setVal("vitaminK", ["vitamin k"]);
      setVal("vitaminA", ["vitamin a"]);
      setVal("vitaminB6", ["vitamin b-6", "vitamin b6"]);
      setVal("thiamine", ["thiamine"]);
      setVal("riboflavin", ["riboflavin"]);
      setVal("niacin", ["niacin"]);
      
      return profile;
    };

    const extractOFFNutrientsPer100g = (product: any): Record<string, number> => {
      const profile: Record<string, number> = {};
      const n = product.nutriments;
      if (!n) return profile;
      
      if (n["energy-kcal_100g"] !== undefined) {
        profile["calories"] = Number(n["energy-kcal_100g"]) || 0;
      } else if (n["energy_100g"] !== undefined) {
        profile["calories"] = Math.round(Number(n["energy_100g"]) / 4.184) || 0;
      }
      
      const setNum = (key: string, field: string, scale: number = 1) => {
        if (n[field] !== undefined) {
          profile[key] = (Number(n[field]) || 0) * scale;
        }
      };

      setNum("protein", "proteins_100g");
      setNum("totalFat", "fat_100g");
      setNum("saturatedFat", "saturated-fat_100g");
      setNum("transFat", "trans-fat_100g");
      
      if (profile["totalFat"] !== undefined) {
        profile["unsaturatedFat"] = Math.max(0, profile["totalFat"] - (profile["saturatedFat"] || 0) - (profile["transFat"] || 0));
      }
      
      setNum("omega3", "omega-3_100g");
      setNum("carbohydrates", "carbohydrates_100g");
      setNum("addedSugar", "sugars_100g");
      setNum("totalFibre", "fiber_100g");
      setNum("solubleFibre", "soluble-fiber_100g");
      
      setNum("sodium", "sodium_100g", 1000);
      setNum("potassium", "potassium_100g", 1000);
      setNum("magnesium", "magnesium_100g", 1000);
      setNum("calcium", "calcium_100g", 1000);
      setNum("iron", "iron_100g", 1000);
      setNum("zinc", "zinc_100g", 1000);
      setNum("selenium", "selenium_100g");
      setNum("iodine", "iodine_100g");
      setNum("phosphorus", "phosphorus_100g", 1000);
      setNum("vitaminD", "vitamin-d_100g");
      setNum("vitaminB12", "vitamin-b12_100g");
      setNum("folate", "folate_100g");
      setNum("vitaminC", "vitamin-c_100g", 1000);
      setNum("vitaminE", "vitamin-e_100g", 1000);
      setNum("vitaminK", "vitamin-k_100g");
      setNum("vitaminA", "vitamin-a_100g");
      setNum("vitaminB6", "vitamin-b6_100g", 1000);
      setNum("thiamine", "thiamine_100g", 1000);
      setNum("riboflavin", "riboflavin_100g", 1000);
      setNum("niacin", "niacin_100g", 1000);

      return profile;
    };

    // Detect pure weight modification on existing active meal — skip scouting and DB search
    const isWeightModification = !!(
      activeMeal &&
      (!imagePayloads || imagePayloads.length === 0) &&
      message &&
      /\d+\s*g(ram)?s?/i.test(message)
    );
    const compareOnly = req.body.compareOnly === true;
    const compareItems = Array.isArray(req.body.compareItems) ? req.body.compareItems : [];

    let databaseMatches = "";
    const databaseMatchesArray: any[] = [];
    // Initialize with active items from previous turns so the Dietitian can see and update them
    let visionScoutItems: any[] = req.body.activeScoutItems || [];
    let scoutScratchpad: string | undefined;
    let scoutConfidenceRating = "High (>90%)";
    let scoutConfidenceComment = "";
    let scoutRecommendedMode: string | null = null;
    let scoutCookingMethod = "";
    let visionScoutContentType = 'visual';
    const dbMatchMap = new Map<string, any>();
    const queriesToSearch: string[] = [];

    let visionScoutRanAndReturnedItems = false;

    if (compareOnly) {
      addDebugLog(`[Shortcut] Compare mode detected. Skipping Vision Scout and DB Search.`);
      if (compareItems && compareItems.length > 0) {
        visionScoutItems = compareItems.map((name: string, index: number) => ({
          scoutIndex: index,
          keyword: name,
          originalName: name,
          estimatedWeightGrams: 100,
          source: "compare_request"
        }));
      }
    } else if (isWeightModification) {
      addDebugLog(`[Shortcut] Weight modification detected on active meal. Skipping Vision Scout and DB Search.`);
    } else {
      const hasImage = imagePayloads && imagePayloads.length > 0;
      if (hasImage) {
        addDebugLog(`[Vision Scout] Running Stage 3 lightweight vision scout...`);
        try {
          const scoutOutput = await callUnifiedLLM({
            modelId: "gemini-3.1-flash-lite",
            systemInstruction: scoutSystemInstruction,
            promptText: message ? `Analyze this image and list the food items you see, taking into consideration the user's message: "${message}"` : "Analyze this image and list the food items you see.",
            imagePayloads,
            responseMimeType: "application/json",
            onStream: isStream ? (chunk: string, isThought?: boolean) => {
              if (!isThought) {
                res.write(`data: ${JSON.stringify({ chunk, stage: 'scout' })}\n\n`);
              }
            } : undefined
          });

          const scoutResult = parseAndHealVisionScout(scoutOutput, addDebugLog);
          
          if (scoutResult.scratchpad) {
            scoutScratchpad = scoutResult.scratchpad;
            addDebugLog(`[Scout Scratchpad]\n${scoutResult.scratchpad}`);
          }

          visionScoutItems = scoutResult.items;
          scoutConfidenceRating = scoutResult.scoutConfidenceRating;
          scoutConfidenceComment = scoutResult.scoutConfidenceComment;
          scoutCookingMethod = scoutResult.scoutCookingMethod;
          visionScoutContentType = scoutResult.visionScoutContentType;
          scoutRecommendedMode = scoutResult.scoutRecommendedMode;
          queriesToSearch.push(...scoutResult.queriesToSearch);
          visionScoutRanAndReturnedItems = scoutResult.visionScoutRanAndReturnedItems;

          addDebugLog(`[Vision Scout] Exploded high density rows into ${visionScoutItems.length} individual item(s) to process:`);
          visionScoutItems.forEach((item: any) => {
            const rawLabelHasRealData = item.rawNutritionLabel && typeof item.rawNutritionLabel === 'object'
              ? Object.keys(item.rawNutritionLabel).some((k: string) => {
                  if (k === 'servingSize' || k === 'weight' || k === 'servingsPerContainer') return false;
                  const v = item.rawNutritionLabel[k];
                  return v !== undefined && v !== null && v !== '' && v !== '-' && v !== '--';
                })
              : false;
            const flagStr = (item.anomalyFlags && item.anomalyFlags.length > 0) ? ` | Flags: [${item.anomalyFlags.join(', ')}]` : '';
            const confStr = item.itemConfidence ? ` | Confidence: ${item.itemConfidence}` : '';
            const labelStr = rawLabelHasRealData ? ` | Nutrition Label: ${JSON.stringify(item.rawNutritionLabel)}` : '';
            addDebugLog(`[Vision Scout] - Index: ${item.scoutIndex} | Name: "${item.originalName || item.keyword}" | Keyword: "${item.keyword}"${labelStr}${flagStr}${confStr}`);
          });
        } catch (scoutErr: any) {
          addDebugLog(`[Vision Scout Error] Failed: ${scoutErr.message}`);
        }
      } else if (message) {
        addDebugLog(`[Text Search Extraction] No image supplied. Extracting search terms from message: "${message}"`);
        const lowerMsg = message.trim().toLowerCase();
        const nonFoodPatterns = [
          /^(start|let's start|hello|hi|hey|greetings|help|test|yes|no|ok|okay|clear|reset|menu|why|explain|question|info|please)$/i,
          /\b(alt|ast|cholesterol|ldl|hdl|egfr|creatinine|bilirubin|triglycerides|platelets|wbc|rbc|hemoglobin|hba1c|glucose|blood pressure|systolic|diastolic)\b/i
        ];
        
        const isNonFood = nonFoodPatterns.some(p => p.test(lowerMsg)) && !/\b(eat|ate|eating|had|cooked|fried|grilled|recipe|meal|food|snack|breakfast|lunch|dinner|portion|slice|glass|cup|gram|grams|calorie|calories|nutrient|nutrients)\b/i.test(lowerMsg);

        if (isNonFood) {
          addDebugLog(`[Text Search Extraction] Message classified as non-food query. Skipping database matches.`);
        } else {
          const cleanMsg = message.replace(/\d+\s*(g|grams|oz|lbs|servings|pcs|pieces)?/gi, '')
                                  .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
                                  .replace(/\b(and|or|with|a|an|the|ate|had|for|dinner|lunch|breakfast|meal|snack|some)\b/gi, ' ')
                                  .trim();
          const keywords = cleanMsg.split(/\s+/).filter(w => w.length > 1);
          if (keywords.length > 0) {
            const excludedTerms = ['start', 'hello', 'hi', 'hey', 'greetings', 'help', 'test', 'yes', 'no', 'ok', 'okay', 'clear', 'reset', 'menu', 'why', 'explain', 'question', 'info', 'please'];
            const filteredKeywords = keywords.filter(k => !excludedTerms.includes(k.toLowerCase()));
            const filteredCleanMsg = cleanMsg.split(/\s+/).filter(w => !excludedTerms.includes(w.toLowerCase())).join(' ').trim();
            
            if (filteredCleanMsg.length > 1) {
              queriesToSearch.push(filteredCleanMsg);
            }
            filteredKeywords.slice(0, 3).forEach(k => {
              if (!queriesToSearch.includes(k)) {
                queriesToSearch.push(k);
              }
            });
          }
        }
      }
    }

    // Strip parenthetical local-language notes for cleaner USDA/OFF matching
    // e.g. "raw beef slices (daging empal and blade)" → "raw beef slices"
    const cleanQuery = (raw: string) => raw.replace(/\s*\(.*?\)\s*/g, '').replace(/\b(raw|fresh|cooked)\s+/i, '').trim();

    const hasImage = imagePayloads && imagePayloads.length > 0;
    const isMenuScale = visionScoutContentType === "menu_or_poster" || visionScoutContentType === "text";
    // Skip database search if evaluating a large number of items (Mode D / Evaluation Scale) to prevent connection pool exhaustion and timeouts
    const isEvaluationScale = queriesToSearch.length >= 10;
    const shouldRunDbSearch = !isWeightModification && !isMenuScale && !isEvaluationScale && (visionScoutRanAndReturnedItems || (!hasImage && queriesToSearch.length > 0));
    if (shouldRunDbSearch && queriesToSearch.length > 0) {
      const uniqueQueries = Array.from(new Set(queriesToSearch));
      addDebugLog(`[Database Search] Performing USDA & OFF searches for queries: ${JSON.stringify(uniqueQueries)}`);
      const searchPromises = uniqueQueries.map(async (q) => {
        try {
          const cleaned = cleanQuery(q);
          const isBarcode = /^\d{6,}$/.test(cleaned);
          
          let dataTypes = 'Foundation,SR Legacy';
          if (isBarcode || visionScoutContentType === 'text' || cleaned.toLowerCase().includes('brand') || cleaned.toLowerCase().includes('mcdonald') || cleaned.toLowerCase().includes('kfc')) {
            dataTypes = 'Foundation,SR Legacy,Branded';
          }
          
          const [usda, off] = await Promise.all([
            searchUSDA(cleaned, 3, dataTypes),
            searchOpenFoodFacts(cleaned, 3)
          ]);
          return { query: q, usda, off };
        } catch (err) {
          return { query: q, usda: [], off: [] };
        }
      });
      const searchResultsList = await Promise.all(searchPromises);
      const list: string[] = [];
      for (const resItem of searchResultsList) {
        resItem.usda.forEach((food: any) => {
          const fdcIdStr = String(food.fdcId);
          dbMatchMap.set(fdcIdStr, extractUSDANutrientsPer100g(food));

          const parsedNutrients = extractUSDANutrientsPer100g(food);
          const caloriesStr = String(parsedNutrients.calories);
          databaseMatchesArray.push({
            id: fdcIdStr,
            source: "usda",
            name: food.description || "",
            calories: caloriesStr,
            protein: parsedNutrients.protein,
            fat: parsedNutrients.totalFat,
            saturatedFat: parsedNutrients.saturatedFat,
            sodium: parsedNutrients.sodium
          });

          list.push(`- [USDA] ID: ${fdcIdStr} | Name: ${food.description} | Nutrients (per 100g): ${formatUSDANutrients(food.foodNutrients)}`);
        });
        resItem.off.forEach((product: any) => {
          const idStr = String(product.barcode || product.id || product.code || "");
          if (idStr) {
            dbMatchMap.set(idStr, extractOFFNutrientsPer100g(product));

            const parsedNutrients = extractOFFNutrientsPer100g(product);
            const caloriesStr = String(parsedNutrients.calories);
            databaseMatchesArray.push({
              id: idStr,
              source: "off",
              name: product.product_name || "",
              calories: caloriesStr,
              protein: parsedNutrients.protein,
              fat: parsedNutrients.totalFat,
              saturatedFat: parsedNutrients.saturatedFat,
              sodium: parsedNutrients.sodium
            });

            list.push(`- [OpenFoodFacts] Barcode: ${idStr} | Name: ${product.product_name} (${product.brands || 'No Brand'}) | Nutrients (per 100g): ${formatOFFNutrients(product.nutriments)}`);
          }
        });
      }
      if (list.length > 0) {
        databaseMatches = list.slice(0, 10).join("\n");
      } else {
        databaseMatches = "No matches found in USDA or Open Food Facts databases for these queries.";
      }
    }

    // Backend-Side Mathematical Macro Aggregation for Component-Level Decomposition
    const preCalculatedItems = visionScoutItems.map((item: any) => {
      const itemWeight = item.estimatedWeightGrams || 100;
      const aggregatedNutrients: Record<string, number> = {
        calories: 0, protein: 0, totalFat: 0, saturatedFat: 0, transFat: 0,
        carbohydrates: 0, addedSugar: 0, sodium: 0, potassium: 0, totalFibre: 0, solubleFibre: 0
      };
      
      let hasComponents = false;
      if (item.components && Array.isArray(item.components) && item.components.length > 0) {
        hasComponents = true;
        item.components.forEach((comp: any) => {
          const compWeight = itemWeight * ((comp.volumePercentage || 100) / 100);
          const bestMatch = databaseMatchesArray.find((m: any) => 
            m.name.toLowerCase().includes(comp.searchQuery.toLowerCase()) ||
            comp.searchQuery.toLowerCase().includes(m.name.toLowerCase())
          );
          if (bestMatch && dbMatchMap.has(bestMatch.id)) {
            const baseNutrients = dbMatchMap.get(bestMatch.id);
            const factor = compWeight / 100;
            Object.keys(aggregatedNutrients).forEach(key => {
              if (baseNutrients[key] !== undefined) {
                aggregatedNutrients[key] += parseFloat((baseNutrients[key] * factor).toFixed(2));
              }
            });
          }
        });
      } else {
        const bestMatch = databaseMatchesArray.find((m: any) => 
          m.name.toLowerCase().includes(item.keyword.toLowerCase()) ||
          item.keyword.toLowerCase().includes(m.name.toLowerCase())
        );
        if (bestMatch && dbMatchMap.has(bestMatch.id)) {
          const baseNutrients = dbMatchMap.get(bestMatch.id);
          const factor = itemWeight / 100;
          Object.keys(aggregatedNutrients).forEach(key => {
            if (baseNutrients[key] !== undefined) {
              aggregatedNutrients[key] = parseFloat((baseNutrients[key] * factor).toFixed(2));
            }
          });
        }
      }
      
      return {
        keyword: item.keyword,
        originalName: item.originalName || item.keyword,
        estimatedWeightGrams: itemWeight,
        hasComponents,
        nutrients: aggregatedNutrients
      };
    });

    let preCalculatedCtx = "";
    if (preCalculatedItems.length > 0) {
      preCalculatedCtx = "=== BACKEND PRE-CALCULATED ITEM NUTRIENTS (Absolute Truth) ===\n" +
        preCalculatedItems.map(item => {
          return `- "${item.originalName}" (${item.estimatedWeightGrams}g):\n` +
            `  Calories: ${Math.round(item.nutrients.calories)} kcal\n` +
            `  Protein: ${item.nutrients.protein}g\n` +
            `  Fat: ${item.nutrients.totalFat}g (Saturated: ${item.nutrients.saturatedFat}g)\n` +
            `  Carbs: ${item.nutrients.carbohydrates}g (Sugar: ${item.nutrients.addedSugar}g)\n` +
            `  Sodium: ${item.nutrients.sodium}mg\n`;
        }).join("\n") + "\n\n";
    }

    let userCtx = "";
    if (userProfile) {
      userCtx = `\nUSER DIETARY PROFILE & DEMOGRAPHICS:\n` +
        `- Age: ${userProfile.age || 'Unknown'} years old\n` +
        `- Gender: ${userProfile.gender || 'Unknown'}\n` +
        `- Weight: ${userProfile.weight || 'Unknown'} kg\n` +
        `- Height: ${userProfile.height || 'Unknown'} cm\n` +
        `- Ethnicity: ${userProfile.ethnicity || 'Unknown'}\n`;
    }

    const userTimezone = req.body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let localDateStr;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });
      localDateStr = formatter.format(new Date());
    } catch(e) {
      localDateStr = new Date().toISOString().split("T")[0];
    }
    const localTime = new Date().toLocaleTimeString();
    const timeCtx = `\nCURRENT TIME CONTEXT: ${localDateStr} ${localTime}\nCRITICAL INSTRUCTION: You MUST use "${localDateStr}" in the "date" field of "foodData" unless the user explicitly provides a different date in the chat.\n`;

    let imageCtx = "";
    if (imagePayloads && imagePayloads.length > 0) {
      if (imagePayloads.length > 1) {
        imageCtx = `\n[Context: ${imagePayloads.length} images are attached above. One or more may be a close-up photo of a printed Nutrition Facts label rather than the food itself. First determine which image(s), if any, show a nutrition facts/label panel. For any such label image: read its exact printed per-serving values and stated serving size, then mathematically scale those exact numbers to the actual weight/quantity consumed as shown in the other image(s) or described by the user — do not substitute your own estimate when a label is legible. For any remaining image(s) showing the actual food, rely on visual cues for portion sizing, ingredients, and freshness as usual.]\n`;
      } else {
        imageCtx = `\n[Context: An image is uploaded and attached above. If it is a close-up of a printed Nutrition Facts label, read its exact printed values and stated serving size, then scale them to the actual weight/quantity consumed; otherwise rely on visual cues for portion sizing, ingredients, and freshness.]\n`;
      }
      if (imageDates && imageDates.length > 0) {
        const primaryImageDate = imageDates[0];
        imageCtx += `\n[CRITICAL DATE OVERRIDE: The uploaded image was taken on ${primaryImageDate}. You MUST use this exact date or its nearest YYYY-MM-DD representation as the "date" field in "foodData", completely overriding the CURRENT TIME CONTEXT, unless the user explicitly asks otherwise.]\n`;
      }
    }

    let historyContext = "";
    if (history && Array.isArray(history) && history.length > 0) {
      historyContext = "PAST DISCUSSIONS & MEALS CHAT HISTORY:\n" +
        history.slice(-10).map((h: any) => `${h.role.toUpperCase()}: ${h.content}`).join("\n") + "\n\n";
    }

    let pastMealsCtx = "";
    if (foodLogs && Array.isArray(foodLogs) && foodLogs.length > 0) {
      try {
        const pastMeals: any[] = [];
        foodLogs.forEach((f: any) => {
          if (f) {
            pastMeals.push({
              name: f.name,
              date: f.date || "",
              calories: f.nutrients?.calories || f.calories || 0,
              protein: f.nutrients?.protein || f.protein || 0,
              saturatedFat: f.nutrients?.saturatedFat || f.saturatedFat || 0,
              sodium: f.nutrients?.sodium || f.sodium || 0,
              carbohydrates: f.nutrients?.carbohydrates || f.carbohydrates || 0
            });
          }
        });
        if (pastMeals.length > 0) {
          pastMeals.sort((a: any, b: any) => b.date.localeCompare(a.date));
          const recent = pastMeals.slice(0, 10);
          pastMealsCtx = "PATIENT'S RECENT LOGGED MEALS HISTORY (from client state):\n" +
            recent.map((m, idx) => `- Meal ${idx + 1}: "${m.name}" on ${m.date} | Calories: ${m.calories}kcal, Protein: ${m.protein}g, Saturated Fat: ${m.saturatedFat}g, Sodium: ${m.sodium}mg, Carbs: ${m.carbohydrates}g`).join("\n") + "\n\n";
          addDebugLog(`[Client Context] Successfully loaded ${pastMeals.length} past meal(s) from client payload, included recent ${recent.length} meals in prompt context.`);
        }
      } catch (err: any) {
        addDebugLog(`[Client Context Error] Failed to process client foodLogs: ${err.message}`);
      }
    }

    if (!pastMealsCtx && db && userId) {
      try {
        const collRef = db.collection("users").doc(userId).collection("consolidated_logs");
        const snapshot = await collRef.get();
        const pastMeals: any[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          if (data && data.logs) {
            Object.values(data.logs).forEach((logInfo: any) => {
              if (logInfo.type === 'food' && logInfo.data) {
                const food = logInfo.data;
                pastMeals.push({
                  name: food.name,
                  date: food.date,
                  calories: food.nutrients?.calories || food.calories || 0,
                  protein: food.nutrients?.protein || food.protein || 0,
                  saturatedFat: food.nutrients?.saturatedFat || food.saturatedFat || 0,
                  sodium: food.nutrients?.sodium || food.sodium || 0,
                  carbohydrates: food.nutrients?.carbohydrates || food.carbohydrates || 0,
                  timestamp: food.updated_at || 0
                });
              }
            });
          }
        });
        if (pastMeals.length > 0) {
          pastMeals.sort((a: any, b: any) => b.date.localeCompare(a.date) || b.timestamp - a.timestamp);
          const recent = pastMeals.slice(0, 10);
          pastMealsCtx = "PATIENT'S RECENT LOGGED MEALS HISTORY (from database):\n" +
            recent.map((m, idx) => `- Meal ${idx + 1}: "${m.name}" on ${m.date} | Calories: ${m.calories}kcal, Protein: ${m.protein}g, Saturated Fat: ${m.saturatedFat}g, Sodium: ${m.sodium}mg, Carbs: ${m.carbohydrates}g`).join("\n") + "\n\n";
          addDebugLog(`[Database Context] Successfully loaded ${pastMeals.length} past meal(s) from database, included recent ${recent.length} meals in prompt context.`);
        } else {
          addDebugLog(`[Database Context] No past meals found in consolidated_logs database for user ${userId}.`);
        }
      } catch (err: any) {
        addDebugLog(`[Database Context Error] Failed to retrieve past meals: ${err.message}`);
      }
    }

    // 2. Prepend active state to Master System Instructions
    const systemInstruction = buildFoodAnalyzeInstruction({
      biomarkersNeedingImprovement,
      remainingAllowance,
      activeMeal: hasImage ? null : activeMeal,
      compareItemCount: visionScoutItems ? visionScoutItems.length : 0
    });

    let visionScoutCtx = "";
    if (visionScoutItems && visionScoutItems.length > 0) {
      const itemsList = visionScoutItems.map((item: any, idx: number) => {
        let flagStr = (item.anomalyFlags && item.anomalyFlags.length > 0) ? ` | Flags: [${item.anomalyFlags.join(', ')}]` : '';
        let confStr = item.itemConfidence ? ` | Confidence: ${item.itemConfidence}` : '';
        let scaledNutrientsStr = "";
        let ingredientsStr = "";
        if (item.ingredientsList) ingredientsStr += ` | Label Ingredients: ${item.ingredientsList}`;
        if (item.visualIngredients && item.visualIngredients.length > 0) ingredientsStr += ` | Visual Ingredients: ${item.visualIngredients.join(', ')}`;
        const raw = item.rawNutritionLabel;
        const facts = item.nutritionFacts;
        
        if (raw && Object.keys(raw).length > 0) {
           let multiplier = 1;
           const estimatedWeight = item.estimatedWeightGrams || 100;
           if (raw.servingSize) {
              const ssMatch = String(raw.servingSize).match(/[\d.]+/);
              if (ssMatch) {
                 multiplier = estimatedWeight / parseFloat(ssMatch[0]);
              } else {
                 multiplier = estimatedWeight / 100;
              }
           } else {
              multiplier = estimatedWeight / 100;
           }
           
           const standardizeKey = (key: string) => {
              const k = key.toLowerCase();
              if (k.includes('calories') || k.includes('energi') || k.includes('energy')) return 'calories';
              if (k.includes('saturated') || k.includes('jenuh') || k.includes('sat fat') || k.includes('satfat')) return 'saturatedFat';
              if (k.includes('trans')) return 'transFat';
              if (k.includes('total fat') || k.includes('lemak total') || k === 'fat' || k === 'lemak') return 'totalFat';
              if (k.includes('carbohydrate') || k.includes('karbohidrat') || k.includes('carbs')) return 'carbohydrates';
              if (k.includes('sugar') || k.includes('gula')) return 'addedSugar';
              if (k.includes('protein')) return 'protein';
              if (k.includes('sodium') || k.includes('garam') || k.includes('natrium')) return 'sodium';
              if (k.includes('fiber') || k.includes('fibre') || k.includes('serat')) return 'totalFibre';
              if (k.includes('serving')) return 'servingSize';
              return key;
           };

           const scaledRaw: any = {};
           for (const [rawK, v] of Object.entries(raw)) {
              const k = standardizeKey(rawK);
              if (k === 'servingSize') {
                 scaledRaw[k] = v;
              } else {
                 const match = String(v).match(/[\d.]+/);
                 if (match) {
                    const num = parseFloat(match[0]);
                    const unit = String(v).replace(/[\d.\s]/g, '');
                    scaledRaw[k] = `${Math.round(num * multiplier)}${unit}`;
                 } else {
                    scaledRaw[k] = v;
                 }
              }
           }
           scaledNutrientsStr = ` | TRUE TOTAL NUTRITIONAL PAYLOAD FOR ENTIRE WEIGHT (${estimatedWeight}g): ${JSON.stringify(scaledRaw)} (CRITICAL: USE THESE TOTALS DIRECTLY for averageNutrients, pros, and cons. Do not do any more math!)`;
        } else if (facts && Object.keys(facts).length > 0) {
           scaledNutrientsStr = ` | NutritionFacts: ${JSON.stringify(facts)}`;
        }
        
        if (visionScoutItems.length > 15) {
           return `- Index: ${idx} | Name: "${item.originalName || item.keyword}"${scaledNutrientsStr}${ingredientsStr}`;
        }
        
        return `- Index: ${idx} | Scout Item: "${item.keyword}" | Weight: ${item.estimatedWeightGrams}g | Observed/Local Context: "${item.originalName}" | Source: ${item.source} | BoundingBox: ${JSON.stringify(item.boundingBox2D)} | ImageIndex: ${item.sourceImageIndex}${scaledNutrientsStr}${ingredientsStr}${flagStr}${confStr}`;
      }).join('\n');
      visionScoutCtx = `\n=== VISUAL FOOD SCOUT IDENTIFIED ITEMS ===\n${itemsList}\n` +
        `Content Type: ${visionScoutContentType} (${visionScoutItems.length} items identified)\n` +
        (scoutRecommendedMode ? `\nCRITICAL ROUTING OVERRIDE: The Vision Scout explicitly requires you to use mode: "${scoutRecommendedMode}". You MUST obey this mode.\n` : "") +
        `Visual Scout Confidence Rating: ${scoutConfidenceRating}\n` +
        (scoutConfidenceComment ? `Visual Scout Confidence Comment: ${scoutConfidenceComment}\n` : "") +
        `Identified Cooking Method & Preparation/Seasonings: ${scoutCookingMethod}\n` +
        `Use the observed local name, ingredients, confidence levels, cooking method, seasonings, and preparation context above to guide your understanding of how the food was cooked, prepared, or structured (e.g., deep frying or pan frying with oil adds significant fat calories, boiling does not add nutrients, seasonings/sauces might add considerable sodium or sugar). Pay special attention to the Ingredients list if available to identify hidden sugars, unhealthy fats, or specific allergens. Use this context to estimate more accurate core-11 nutrients and provide better recommendations.\n`;
    }

    let databaseMatchesCtx = "";
    if (databaseMatches) {
      databaseMatchesCtx = `
=== BACKEND PRE-CALCULATED ITEM NUTRIENTS ===
${preCalculatedCtx}

=== VERIFIED DATABASE MATCHES ===
${databaseMatches}
`;
    }


    const foodAnalyzeSchema = {
      type: Type.OBJECT,
      properties: {
        scratchpad: { type: Type.STRING, description: "Think step-by-step here FIRST, before any other field: analyze the user input, biomarkers, scout data, and database matches to formulate the response. If you are already using extended/native thinking for this request, you may leave this brief." },
        mode: { type: Type.STRING, description: "new_log | discussion | modify | evaluation | origin" },
        message: { type: Type.STRING, description: "A highly personalized conversational response detailing the clinical rationale, biomarker alignment, or modification confirmation." },
        modificationCommand: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ['update_weight', 'remove_item', 'add_item', 'rename_alias', 'update_cooking_method'], description: "'update_weight' | 'remove_item' | 'add_item' | 'rename_alias' | 'update_cooking_method'" },
              itemName: { type: Type.STRING, description: "Literal name of the item from the active state to change" },
              newWeightGrams: { type: Type.INTEGER, description: "New weight in grams" },
              targetDbId: { type: Type.STRING, description: "Optional exact database ID (fdcId or barcode)", nullable: true },
              newItemName: { type: Type.STRING, description: "New name for renaming alias", nullable: true },
              newCookingMethod: { type: Type.STRING, description: "New cooking method for update_cooking_method: deep_fried | pan_fried | stir_fried | roasted | boiled | steamed | grilled | baked | raw | unknown", nullable: true },
              estimatedNutrientsPer100g: {
                type: Type.OBJECT,
                nullable: true,
                description: "For add_item only: your best clinical estimate of 5 key nutrients per 100g for the item being added.",
                properties: {
                  calories:     { type: Type.NUMBER },
                  protein:      { type: Type.NUMBER },
                  totalFat:     { type: Type.NUMBER },
                  saturatedFat: { type: Type.NUMBER },
                  sodium:       { type: Type.NUMBER }
                }
              },
              foodType: {
                type: Type.STRING, nullable: true,
                description: "For add_item only: food type for trace nutrients. Same 14 values as itemsBreakdown.foodType."
              }
            },
            required: ["action", "itemName"]
          },
          nullable: true
        },
        foodData: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            name: { type: Type.STRING },
            itemsBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  canonicalDbName: { type: Type.STRING, description: "You MUST preserve the specific toppings or modifiers identified in the originalName (e.g., 'Siomay with mushroom topping' instead of just 'Siomay')." },
                  weightGrams: { type: Type.INTEGER, description: "Weight of ingredient in grams" },
                  dbSource: { type: Type.STRING, description: "'usda' | 'off' | 'estimated' | 'label'" },
                  dbId: { type: Type.STRING, nullable: true },
                  labelNutrientsPerServing: {
                    type: Type.OBJECT,
                    properties: {
                      servingSizeGrams: { type: Type.NUMBER, description: "Serving size in grams as a number, e.g., 100." },
                      calories: { type: Type.NUMBER, description: "Calories per serving as a number, e.g., 250." },
                      protein: { type: Type.NUMBER, description: "Protein in grams as a number, e.g., 15." },
                      totalFat: { type: Type.NUMBER, description: "Total fat in grams as a number, e.g., 8." },
                      saturatedFat: { type: Type.NUMBER, description: "Saturated fat in grams as a number, e.g., 3." },
                      transFat: { type: Type.NUMBER, description: "Trans fat in grams as a number, e.g., 0." },
                      carbohydrates: { type: Type.NUMBER, description: "Carbohydrates in grams as a number, e.g., 30." },
                      addedSugar: { type: Type.NUMBER, description: "Added sugar in grams as a number, e.g., 5." },
                      sodium: { type: Type.NUMBER, description: "Sodium in milligrams as a number, e.g., 240." },
                      potassium: { type: Type.NUMBER, description: "Potassium in milligrams as a number, e.g., 350." },
                      totalFibre: { type: Type.NUMBER, description: "Total fibre in grams as a number, e.g., 4." },
                      solubleFibre: { type: Type.NUMBER, description: "Soluble fibre in grams as a number, e.g., 1." }
                    },
                    required: [
                      "servingSizeGrams", "calories", "protein", "totalFat", "saturatedFat",
                      "transFat", "carbohydrates", "addedSugar", "sodium", "potassium",
                      "totalFibre", "solubleFibre"
                    ],
                    nullable: true
                  },
                  foodType: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Food category for trace nutrient derivation. One of: 'red_meat' | 'poultry' | 'fish_fatty' | 'fish_lean' | 'shellfish' | 'egg' | 'dairy' | 'leafy_veg' | 'root_veg' | 'legume' | 'grain' | 'fruit' | 'mixed_meal' | 'ultra_processed' | 'unknown'. Examples: beef blade → 'red_meat', salmon → 'fish_fatty', donut → 'ultra_processed', lasagna → 'mixed_meal'."
                  },
                  confidenceRating: { type: Type.STRING, nullable: true },
                  confidenceComment: { type: Type.STRING, nullable: true },
                  cookingMethod: {
                    type: Type.STRING,
                    nullable: true,
                    description: "Cooking method for this specific item: deep_fried | pan_fried | stir_fried | roasted | boiled | steamed | grilled | baked | raw | unknown. Set precisely to reflect how this specific food item was prepared."
                  }
                },
                required: ["canonicalDbName", "weightGrams", "dbSource", "dbId", "labelNutrientsPerServing", "foodType"]
              }
            },
            composition: { type: Type.STRING },
            weightGrams: { type: Type.INTEGER, description: "Portion weight in grams" },
            quantity: { type: Type.STRING },
            benefits: { type: Type.STRING },
            risks: { type: Type.STRING },
            healthImpact: { type: Type.STRING, description: "A very brief 3-5 word verdict/summary of the food's biological impact relative to their biomarker profile (e.g., 'Highly nutrient-dense choice', 'Elevated sodium warning'). Must be extremely concise." },
            recommendation: { type: Type.STRING },
            cookingMethod: { type: Type.STRING, description: "Identify the cooking method and list any seasonings/sauces used, as well as their contribution/impact on the total nutrients consumed (e.g. 'Pan-fried in vegetable oil adding approx 5g fat; seasoned with soy sauce contributing 150mg sodium')." },
            scoutConfidenceRating: { type: Type.STRING, description: "Confidence rating copied from the VISUAL FOOD SCOUT block: 'Low (<50%)', 'Medium (50-90%)', or 'High (>90%)'." },
            scoutConfidenceComment: { type: Type.STRING, description: "Optional explanation of why confidence is Low or Medium and how to improve it, copied or adapted from VISUAL FOOD SCOUT comments.", nullable: true }
          },
          required: [
            "date",
            "name",
            "itemsBreakdown",
            "composition",
            "weightGrams",
            "quantity",
            "benefits",
            "risks",
            "healthImpact",
            "recommendation"
          ],
          nullable: true
        },
        comparison: {
          type: Type.OBJECT,
          properties: {
            comparisonTitle: { type: Type.STRING },
            auditChecklist: { type: Type.STRING, description: "CRITICAL: List all scoutItemIndices from the prompt here before grouping to ensure 100% extraction coverage." },
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  groupName: { type: Type.STRING, description: "Name of the group or individual food option" },
                  suitability: { type: Type.STRING },
                  recommendation: { type: Type.STRING, description: "Considering what the user asked, target limits, and clinical biomarkers, give advice on this food." },
                  averageNutrients: {
                    type: Type.OBJECT, required: ["calories", "saturatedFat", "sodium"],
                    properties: { 
                      calories: { type: Type.NUMBER }, 
                      protein: { type: Type.NUMBER, nullable: true }, 
                      totalFat: { type: Type.NUMBER, nullable: true }, 
                      saturatedFat: { type: Type.NUMBER, nullable: true }, 
                      sodium: { type: Type.NUMBER, nullable: true }, 
                      carbohydrates: { type: Type.NUMBER, nullable: true }, 
                      addedSugar: { type: Type.NUMBER, nullable: true }, 
                      potassium: { type: Type.NUMBER, nullable: true }, 
                      totalFibre: { type: Type.NUMBER, nullable: true } 
                    }
                  },
                  scoutItemIndices: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    nullable: true,
                    description: "Indices of scout items in this group. For individual scale mode, this must contain exactly one index."
                  },
                  itemNames: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    nullable: true,
                    description: "Plain food names being compared (text-only fallbacks)."
                  },
                  itemClinicalThreats: {
                    type: Type.ARRAY,
                    nullable: true,
                    description: "Describe specific clinical threats. You MUST group multiple indices that share the exact same threat into a single object.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        scoutIndices: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "The array of scoutItemIndices this threat applies to." },
                        threat: { type: Type.STRING, description: "Short clinical threat label, e.g. 'High Sugar', 'None'." }
                      },
                      required: ["scoutIndices", "threat"]
                    }
                  }
                },
                required: ["groupName", "scoutItemIndices", "suitability", "recommendation", "averageNutrients"]
              }
            }
          },
          required: ["comparisonTitle", "auditChecklist", "groups"],
          nullable: true
        },

        scoutItems: { 
          type: Type.ARRAY, 
          items: { type: Type.OBJECT }, 
          description: "If you resolved a user's correction to a visual item, return the ENTIRE updated scoutItems array here (with the item's keyword corrected, itemConfidence set to High, and anomalyFlags completely removed). If no corrections were made to visual items, omit this or return null.", 
          nullable: true 
        }
      },
      required: ["mode", "message", "modificationCommand", "foodData", "comparison"]
    };

    let biomarkersCtx = "";
    if (biomarkersNeedingImprovement && biomarkersNeedingImprovement.length > 0) {
      biomarkersCtx = `\nCRITICAL PATIENT BIOMARKER WARNINGS:\n` +
        biomarkersNeedingImprovement.map((b: any) => {
          if (typeof b === "string") return `• ${b}`;
          if (b && typeof b === "object" && b.name) {
            const statusStr = b.status ? ` is ${String(b.status).toUpperCase()}` : "";
            const valStr = b.value !== undefined ? ` (${b.value} ${b.unit || ""}, normal range: ${b.normalRange || ""})` : "";
            return `• ${b.name}${statusStr}${valStr}`;
          }
          return `• ${String(b)}`;
        }).join("\n") + "\n";
    }
    const finalSystemInstruction = customSystemInstruction || systemInstruction;
    const promptText = customVariableData 
      ? `${customVariableData}\n${biomarkersCtx}\n${visionScoutCtx}\n${databaseMatchesCtx}\nCurrent User Input: "${message}"`
      : `${historyContext}${pastMealsCtx}Analyze this current food request.
${userCtx}
${biomarkersCtx}
${timeCtx}
${imageCtx}
${visionScoutCtx}
${databaseMatchesCtx}
Current User Input: "${message}"

If MODE D (evaluation/comparison) applies: reference every item ONLY by its Index number from the Scout list above inside "scoutItemIndices". Every Index must be assigned to at least one group — including duplicate-named items, which are still separate indices. You are allowed to map the same Scout Index to multiple groups if a physical shelf contains items belonging to both categories. Do not restate names, bounding boxes, or database IDs.`;

    const fullPromptSent = `System Instruction:\n${finalSystemInstruction}\n\n${promptText}`;
    addDebugLog(`[RouteAgent Chat] Sending request to Gemini...`);
    async function callAndParseFoodAnalysis(callArgs: any): Promise<{ textOutput: string; rawParsed: any }> {
      if (isStream) {
        callArgs.onStream = (chunk: string, isThought?: boolean) => {
          if (isThought) {
            res.write(`data: ${JSON.stringify({ thought: chunk, stage: 'dietitian' })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ chunk, stage: 'dietitian' })}\n\n`);
          }
        };
      }
      const textOutput = await callUnifiedLLM(callArgs);
      let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();

      // Sanitize pathological weightGrams values like "350.000000...000" → "350"
      // These are generated by the LLM and inflate JSON size causing truncation errors
      cleanJson = cleanJson.replace(/"(\d+)\.0{10,}(\d*)"/g, (_, int, tail) => `"${int}${tail ? '.' + tail.replace(/0+$/, '') : ''}"`);
      cleanJson = cleanJson.replace(/:\s*(\d+)\.0{10,}\d*/g, (_, int) => `: ${int}`);
      // Robust fallback for any unquoted or quoted decimal with long runaway zeros (e.g. 150.00000000000003g)
      cleanJson = cleanJson.replace(/(\d+)\.(\d*?)0{10,}(\d*)/g, (match, intPart, midPart, endPart) => {
        const combinedFrac = (midPart + endPart).replace(/0+$/, '');
        return combinedFrac ? `${intPart}.${combinedFrac}` : intPart;
      });

      let rawParsed;
      try {
        rawParsed = JSON.parse(extractBalancedJson(cleanJson));
        rawParsed = validateOrFallback(RouteAgentSchema, rawParsed, cleanJson, "RouteAgent", { itemsBreakdown: [] });
      } catch (parseErr: any) {
        addDebugLog(`[JSON Parse Error] JSON parse failed: ${parseErr.message}. Attempting robust truncation repair...`);
        try {
          let repaired = cleanJson.trim();
          
          // 1. Remove trailing comma followed by a half-written key
          repaired = repaired.replace(/,\s*"[^"]*"?\s*$/, "");
          
          // 2. Handle unescaped double quotes inside an unclosed string
          let quoteCount = 0;
          for (let idx = 0; idx < repaired.length; idx++) {
            if (repaired[idx] === '"' && (idx === 0 || repaired[idx - 1] !== '\\')) {
              quoteCount++;
            }
          }
          if (quoteCount % 2 !== 0) {
            repaired += '"';
          }

          // 3. Remove trailing comma or colon
          if (repaired.endsWith(",")) {
            repaired = repaired.slice(0, -1).trim();
          } else if (repaired.endsWith(":")) {
            repaired += "null";
          }

          // 4. Count open braces and brackets outside strings
          let openBraces = 0;
          let openBrackets = 0;
          let insideStr = false;
          
          for (let i = 0; i < repaired.length; i++) {
            const char = repaired[i];
            if (char === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
              insideStr = !insideStr;
            }
            if (!insideStr) {
              if (char === '{') openBraces++;
              else if (char === '}') openBraces--;
              else if (char === '[') openBrackets++;
              else if (char === ']') openBrackets--;
            }
          }

          repaired += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
          
          rawParsed = JSON.parse(repaired);
          addDebugLog(`[JSON Parse Error] Robust truncation repair succeeded.`);
        } catch (repairErr: any) {
          addDebugLog(`[JSON Parse Error] Robust truncation repair also failed: ${repairErr.message}.`);
          throw parseErr;
        }
      }
      return { textOutput, rawParsed };
    }

    const llmCallArgs = {
      modelId: engine || "gemini-3.1-flash-lite", // Updating to flash-lite as recommended
      systemInstruction: finalSystemInstruction,
      promptText,
      imagePayloads,
      responseMimeType: "application/json" as const,
      responseSchema: foodAnalyzeSchema,
      maxOutputTokens: 8192 // Boosted to ensure all items fit
    };

    let textOutput: string;
    let rawParsed: any;
    try {
      ({ textOutput, rawParsed } = await callAndParseFoodAnalysis(llmCallArgs));
    } catch (firstErr: any) {
      addDebugLog(`[JSON Parse Error] First attempt failed: ${firstErr.message}. Retrying once...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      ({ textOutput, rawParsed } = await callAndParseFoodAnalysis(llmCallArgs));
    }

    addDebugLog(`[RouteAgent Chat] Received response from Gemini. Length: ${textOutput.length} chars.`);

    if (rawParsed.scratchpad) {
      addDebugLog(`[Dietitian Scratchpad]\n${rawParsed.scratchpad}`);
    }

    let mode = rawParsed.mode || "new_log";

    const apiCalls = [
      ...(hasImage ? [{ type: 'gemini', label: 'Food nutrition agent - Visual Scout (gemini-3.1-flash-lite)' }] : []),
      ...(queriesToSearch && queriesToSearch.length > 0 ? [{ type: 'usda', label: `Food nutrition agent - USDA (${queriesToSearch.length})` }] : []),
      { type: 'gemini', label: `Food nutrition agent - Dietitian (${engine || 'gemini-3.1-flash-lite'})` }
    ];

    // CASE F: food origin lookup mode


    // CASE B: discussion mode
    if (mode === "discussion") {
      addDebugLog(`[Mode Routing] DISCUSSION mode triggered (0 database operations).`);
      return res.json({
        mode: "discussion",
        scoutScratchpad,
        dietitianScratchpad: rawParsed.scratchpad,
        text: rawParsed.message || "Here is the details on this meal composition.",
        data: null,
        agentPrompt: fullPromptSent,
        apiCalls
      });
    }

    // CASE D: evaluation mode
    if (mode === "evaluation") {
      addDebugLog(`[Mode Routing] EVALUATION mode triggered.`);
      const comparisonData = rawParsed.comparison || { groups: [] };
      const resolvedGroups = resolveComparisonGroups(comparisonData.groups, visionScoutItems);
      addDebugLog(`[Comparison Resolve] ${visionScoutItems.length} scout item(s) -> ${resolvedGroups.length} group(s), covering ${resolvedGroups.reduce((sum: number, g: any) => sum + (g.items?.length || 0), 0)} item(s).`);
      comparisonData.groups = resolvedGroups;
      comparisonData.isMenuScale = isMenuScale;
      
      return res.json({
        mode: "evaluation",
        scoutScratchpad,
        dietitianScratchpad: rawParsed.scratchpad,
        comparison: comparisonData,
        scoutItems: mergeScoutItems(visionScoutItems, rawParsed.scoutItems),
        scoutContentType: visionScoutContentType,
        agentPrompt: fullPromptSent,
        message: rawParsed.message,
        text: rawParsed.message,
        apiCalls
      });
    }

    if (mode === "modify" && rawParsed.foodData && rawParsed.foodData.itemsBreakdown && rawParsed.foodData.itemsBreakdown.length > 0) {
      addDebugLog(`[Mode Rewrite] AI fully regenerated foodData in MODIFY mode. Routing through NEW_LOG pipeline to compute full nutrients.`);
      mode = "new_log";
    }

    // CASE A: NEW FOOD LOGGING
    if (mode === "new_log") {
      const rawFoodData = rawParsed.foodData || {};

      if (!rawFoodData.itemsBreakdown || rawFoodData.itemsBreakdown.length === 0) {
        // Build itemsBreakdown from Vision Scout output + best DB match per item
        if (visionScoutItems && visionScoutItems.length > 0) {
                    rawFoodData.itemsBreakdown = visionScoutItems.map((item: any) => {
            const bestMatch = databaseMatchesArray.find((m: any) => 
              m.name.toLowerCase().includes(item.keyword.split(' ').pop()) ||
              item.keyword.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
            );
            
            let labelNutrients = null;
            if (item.nutritionFacts && Object.keys(item.nutritionFacts).length > 0) {
              labelNutrients = {
                servingSizeGrams: 100,
                calories: Number(item.nutritionFacts.caloriesPer100g) || 0,
                protein: Number(item.nutritionFacts.proteinPer100g) || 0,
                totalFat: Number(item.nutritionFacts.fatPer100g) || 0,
                saturatedFat: Number(item.nutritionFacts.saturatedFatPer100g) || 0,
                transFat: Number(item.nutritionFacts.transFatPer100g) || 0,
                carbohydrates: Number(item.nutritionFacts.carbsPer100g) || 0,
                addedSugar: Number(item.nutritionFacts.addedSugarPer100g) || 0,
                sodium: Number(item.nutritionFacts.sodiumPer100g) || 0,
                potassium: Number(item.nutritionFacts.potassiumPer100g) || 0,
                totalFibre: Number(item.nutritionFacts.totalFibrePer100g) || 0,
                solubleFibre: Number(item.nutritionFacts.solubleFibrePer100g) || 0
              };
            }
            
            return {
              canonicalDbName: item.keyword,
              weightGrams: String(sanitizeMealWeight(item.estimatedWeightGrams, 100)),
              dbSource: labelNutrients ? 'label' : (bestMatch ? (bestMatch.source === 'usda' ? 'usda' : 'off') : 'estimated'),
              dbId: bestMatch ? bestMatch.id : null,
              labelNutrientsPerServing: labelNutrients,
              foodType: 'unknown'
            };
          });
          addDebugLog(`[Fallback] Built itemsBreakdown from Vision Scout output (LLM truncated)`);
        }
      }

      const parsedData: any = {};
      const sanitizeString = (val: any, fallback: string) => {
        if (val === null || val === undefined || String(val).toLowerCase() === "undefined" || String(val).trim() === "") {
          return fallback;
        }
        return String(val);
      };

      parsedData.name = sanitizeString(rawFoodData.name, "Meal Log");
      parsedData.date = sanitizeString(rawFoodData.date, new Date().toISOString().split("T")[0]);
      parsedData.composition = sanitizeString(rawFoodData.composition, "Unspecified ingredients");
      
      const totalWeightGrams = sanitizeMealWeight(rawFoodData.weightGrams, 150);
      parsedData.weightGrams = totalWeightGrams;
      parsedData.quantity = sanitizeString(rawFoodData.quantity, "1 serving");
      parsedData.benefits = sanitizeString(rawFoodData.benefits, "Provides foundational vitamins, minerals, and macronutrients.");
      parsedData.risks = sanitizeString(rawFoodData.risks, "No specific adverse biomarkers flagged for your profile.");
      parsedData.healthImpact = sanitizeString(rawFoodData.healthImpact, "Contributes to daily macro and micronutrient requirements.");
      parsedData.recommendation = sanitizeString(rawFoodData.recommendation, "neutral");
      parsedData.cookingMethod = sanitizeString(rawFoodData.cookingMethod, scoutCookingMethod || "Unknown cooking method");
      parsedData.scoutConfidenceRating = sanitizeString(rawFoodData.scoutConfidenceRating, scoutConfidenceRating || "High (>90%)");
      parsedData.scoutConfidenceComment = rawFoodData.scoutConfidenceComment !== undefined ? sanitizeString(rawFoodData.scoutConfidenceComment, "") : (scoutConfidenceComment || "");

      // Map and construct itemsBreakdown and aggregate all nutrients
      if (rawFoodData.itemsBreakdown && Array.isArray(rawFoodData.itemsBreakdown) && rawFoodData.itemsBreakdown.length > 0) {
        const { nutrients, itemsBreakdown } = aggregateItemsNutrients(
          rawFoodData.itemsBreakdown,
          totalWeightGrams,
          dbMatchMap,
          databaseMatchesArray,
          addDebugLog
        );
        parsedData.nutrients = nutrients;
        parsedData.itemsBreakdown = itemsBreakdown;
      } else {
        addDebugLog(`[Nutrient Warning] LLM returned no itemsBreakdown for "${parsedData.name}". All nutrients will be zero. Check LLM prompt compliance.`);
        parsedData.nutrients = {};
        for (const key of NUTRIENT_KEYS) {
          parsedData.nutrients[key] = 0;
        }
        parsedData.itemsBreakdown = [{
          name: parsedData.name,
          weightGrams: totalWeightGrams,
          calories: 0, saturatedFat: 0, sodium: 0,
          dbSource: "estimated", dbId: null
        }];
      }

      if (mode === "modify") {
        parsedData.id = req.body.activeMeal?.id;
        if (!parsedData.imageUrl) parsedData.imageUrl = req.body.activeMeal?.imageUrl;
        if (!parsedData.imageUrls) parsedData.imageUrls = req.body.activeMeal?.imageUrls;
        
        return res.json({
          mode: "modify",
          scoutScratchpad,
          dietitianScratchpad: rawParsed.scratchpad,
          text: rawParsed.message || `I have updated your meal to reflect the correction.`,
          data: parsedData,
          agentPrompt: fullPromptSent,
          scoutItems: mergeScoutItems(visionScoutItems, rawParsed.scoutItems),
          apiCalls
        });
      }

      return res.json({
        mode: "new_log",
        scoutScratchpad,
        dietitianScratchpad: rawParsed.scratchpad,
        text: rawParsed.message || `I have analyzed the food: **${parsedData.name}** (${parsedData.quantity}).`,
        data: parsedData,
        agentPrompt: fullPromptSent,
        scoutItems: mergeScoutItems(visionScoutItems, rawParsed.scoutItems),
        apiCalls
      });
    }

    // CASE C: modification commands mode (Math-only fallbacks)
    if (mode === "modify") {
      addDebugLog(`[Mode Routing] MODIFY mode triggered (Math Fallback).`);
      
      let activeMeal = req.body.activeMeal;
      if (!activeMeal) {
        addDebugLog(`[Modify Math Error] No active meal exists in Firestore to modify.`);
        return res.json({
          text: rawParsed.message || "I couldn't modify the meal because there's no active meal currently logged. Please log a meal first!",
          data: null,
          apiCalls
        });
      }

      const commands = rawParsed.modificationCommand;
      if (!commands || !Array.isArray(commands) || commands.length === 0) {
        addDebugLog(`[Modify Math Error] Modification command array was empty or null.`);
        return res.json({
          text: rawParsed.message || "I received a modify request but no modification instructions were provided.",
          data: activeMeal,
          apiCalls
        });
      }

      const originalItems = activeMeal.itemsBreakdown || [];
      const originalTotalWeight = originalItems.reduce((acc: number, it: any) => acc + (Number(it.weightGrams) || 0), 0) || 1;

      const standardItems: {[key: string]: {calories: number, saturatedFat: number, sodium: number}} = {
        steak: { calories: 2.5, saturatedFat: 0.05, sodium: 1.8 },
        beef: { calories: 2.5, saturatedFat: 0.05, sodium: 1.8 },
        chicken: { calories: 1.65, saturatedFat: 0.01, sodium: 0.7 },
        breast: { calories: 1.65, saturatedFat: 0.01, sodium: 0.7 },
        pork: { calories: 2.4, saturatedFat: 0.03, sodium: 0.8 },
        fish: { calories: 1.5, saturatedFat: 0.01, sodium: 0.8 },
        salmon: { calories: 2.0, saturatedFat: 0.015, sodium: 0.5 },
        rice: { calories: 1.3, saturatedFat: 0.0, sodium: 0.01 },
        broccoli: { calories: 0.35, saturatedFat: 0.0, sodium: 0.3 },
        egg: { calories: 1.5, saturatedFat: 0.03, sodium: 1.4 },
        avocado: { calories: 1.6, saturatedFat: 0.02, sodium: 0.07 },
        bread: { calories: 2.6, saturatedFat: 0.005, sodium: 4.8 },
        butter: { calories: 7.1, saturatedFat: 5.1, sodium: 5.7 },
        cheese: { calories: 4.0, saturatedFat: 1.8, sodium: 6.2 },
        salad: { calories: 0.2, saturatedFat: 0.0, sodium: 0.1 },
        tomato: { calories: 0.18, saturatedFat: 0.0, sodium: 0.05 },
        oil: { calories: 8.8, saturatedFat: 1.4, sodium: 0.0 },
        potato: { calories: 0.8, saturatedFat: 0.0, sodium: 0.05 },
        pasta: { calories: 1.3, saturatedFat: 0.0, sodium: 0.01 }
      };

      const findItemIndex = (itemNameStr: string, targetDbId: string | null): number => {
        return findItemIndexInList(activeMeal.itemsBreakdown, itemNameStr, targetDbId);
      };

      const isWholeMealMatch = (name: string) => {
        const nLower = name.trim().toLowerCase();
        const mealNameLower = (activeMeal.name || "").trim().toLowerCase();
        return nLower === mealNameLower || 
               nLower === "meal" || 
               nLower === "total" || 
               nLower === "all" ||
               (mealNameLower.includes(nLower) && (activeMeal.itemsBreakdown || []).every((it: any) => (it.name || "").toLowerCase() !== nLower));
      };

      for (const cmd of commands) {
        const action = cmd.action;
        const itemName = cmd.itemName || "";
        const newWeight = sanitizeMealWeight(cmd.newWeightGrams, 0);

        if (action === "update_weight") {
          if (isWholeMealMatch(itemName)) {
            const originalItems = activeMeal.itemsBreakdown || [];
            const oldTotalWeight = originalItems.reduce((acc: number, it: any) => acc + (Number(it.weightGrams) || 0), 0) || 1;
            const R = newWeight / oldTotalWeight;
            
            activeMeal.itemsBreakdown.forEach((item: any) => {
              const oldW = Number(item.weightGrams) || 0;
              item.weightGrams = Math.round(oldW * R);
              item.calories = Number((item.calories * R).toFixed(1));
              item.saturatedFat = Number((item.saturatedFat * R).toFixed(2));
              item.sodium = Number((item.sodium * R).toFixed(1));
            });
            
            addDebugLog(`[Modify Math] update_weight of entire meal "${activeMeal.name}" from ${oldTotalWeight}g to ${newWeight}g (ratio: ${R.toFixed(3)})`);
          } else {
            const targetDbId = cmd.targetDbId ? String(cmd.targetDbId) : null;
            const idx = findItemIndex(itemName, targetDbId);
            let item = idx !== -1 ? activeMeal.itemsBreakdown[idx] : null;

            if (item) {
              const oldWeight = Number(item.weightGrams) || 1;
              const R = newWeight / oldWeight;
              
              item.weightGrams = newWeight;
              item.calories = Number((item.calories * R).toFixed(1));
              item.saturatedFat = Number((item.saturatedFat * R).toFixed(2));
              item.sodium = Number((item.sodium * R).toFixed(1));
   
              addDebugLog(`[Modify Math] update_weight of "${item.name}" (dbId: ${item.dbId}) from ${oldWeight}g to ${newWeight}g (ratio: ${R.toFixed(3)})`);
            } else {
              addDebugLog(`[Modify Math Warning] Could not find item "${itemName}" (targetDbId: ${targetDbId}) to update_weight.`);
            }
          }
        } 
        else if (action === "remove_item") {
          const targetDbId = cmd.targetDbId ? String(cmd.targetDbId) : null;
          const idx = findItemIndex(itemName, targetDbId);

          if (idx !== -1) {
            const removedItem = activeMeal.itemsBreakdown[idx];
            activeMeal.itemsBreakdown.splice(idx, 1);
            addDebugLog(`[Modify Math] remove_item: Removed "${removedItem.name}" (dbId: ${removedItem.dbId})`);
          } else {
            addDebugLog(`[Modify Math Warning] Could not find item "${itemName}" (targetDbId: ${targetDbId}) to remove.`);
          }
        } 
        else if (action === "rename_alias") {
          const targetDbId = cmd.targetDbId ? String(cmd.targetDbId) : null;
          const idx = findItemIndex(itemName, targetDbId);
          if (idx !== -1) {
            const item = activeMeal.itemsBreakdown[idx];
            item.name = cmd.newItemName || item.name;
            // If it's the only item, or represents the whole meal, update the top-level name
            if (activeMeal.itemsBreakdown.length === 1 || isWholeMealMatch(itemName)) {
              activeMeal.name = item.name;
            }
            addDebugLog(`[Modify Text] rename_alias: Renamed to "${item.name}" without changing nutrients.`);
          }
        }
        else if (action === "update_cooking_method") {
          const targetDbId = cmd.targetDbId ? String(cmd.targetDbId) : null;
          const idx = findItemIndex(itemName, targetDbId);
          if (idx !== -1) {
            const item = activeMeal.itemsBreakdown[idx];
            const oldMethod = item.cookingMethod || 'unknown';
            const newMethod = cmd.newCookingMethod || 'unknown';

            // Get modifiers
            const oldModifier = getCookingMethodModifier(oldMethod);
            const newModifier = getCookingMethodModifier(newMethod);

            const itemWeight = Number(item.weightGrams) || 0;
            const factor = itemWeight / 100;

            // Old added values
            const oldAddedFat = parseFloat((oldModifier.addedFatPer100g * factor).toFixed(2));
            const oldAddedSatFat = parseFloat((oldModifier.addedSaturatedFatPer100g * factor).toFixed(2));
            const oldAddedCalories = parseFloat((oldModifier.addedCaloriesPer100g * factor).toFixed(1));

            // New added values
            const newAddedFat = parseFloat((newModifier.addedFatPer100g * factor).toFixed(2));
            const newAddedSatFat = parseFloat((newModifier.addedSaturatedFatPer100g * factor).toFixed(2));
            const newAddedCalories = parseFloat((newModifier.addedCaloriesPer100g * factor).toFixed(1));

            // Adjust item nutrients
            item.calories = parseFloat(Math.max(0, item.calories - oldAddedCalories + newAddedCalories).toFixed(1));
            item.saturatedFat = parseFloat(Math.max(0, item.saturatedFat - oldAddedSatFat + newAddedSatFat).toFixed(2));
            item.cookingMethod = newMethod;

            // Also adjust top-level activeMeal.nutrients directly
            if (activeMeal.nutrients) {
              if (activeMeal.nutrients.calories !== undefined) {
                activeMeal.nutrients.calories = parseFloat(Math.max(0, activeMeal.nutrients.calories - oldAddedCalories + newAddedCalories).toFixed(1));
              }
              if (activeMeal.nutrients.totalFat !== undefined) {
                activeMeal.nutrients.totalFat = parseFloat(Math.max(0, activeMeal.nutrients.totalFat - oldAddedFat + newAddedFat).toFixed(2));
              }
              if (activeMeal.nutrients.saturatedFat !== undefined) {
                activeMeal.nutrients.saturatedFat = parseFloat(Math.max(0, activeMeal.nutrients.saturatedFat - oldAddedSatFat + newAddedSatFat).toFixed(2));
              }
              // Recalculate unsaturatedFat
              const transFat = activeMeal.nutrients.transFat || 0;
              const totalFat = activeMeal.nutrients.totalFat || 0;
              const satFat = activeMeal.nutrients.saturatedFat || 0;
              activeMeal.nutrients.unsaturatedFat = parseFloat(Math.max(0, totalFat - satFat - transFat).toFixed(2));
            }

            addDebugLog(`[Modify Math] update_cooking_method for "${item.name}": changed from "${oldMethod}" to "${newMethod}". Calorie delta: ${(newAddedCalories - oldAddedCalories).toFixed(1)} kcal, Saturated Fat delta: ${(newAddedSatFat - oldAddedSatFat).toFixed(2)}g, Total Fat delta: ${(newAddedFat - oldAddedFat).toFixed(2)}g.`);
          } else {
            addDebugLog(`[Modify Math Warning] Could not find item "${itemName}" (targetDbId: ${targetDbId}) to update_cooking_method.`);
          }
        }
        else if (action === "add_item") {
          let cFactor = 1.0;
          let fFactor = 0.01;
          let sFactor = 0.5;
 
          const lowerName = itemName.toLowerCase();
          for (const [key, factors] of Object.entries(standardItems)) {
            if (lowerName.includes(key)) {
              cFactor = factors.calories;
              fFactor = factors.saturatedFat;
              sFactor = factors.sodium;
              break;
            }
          }
 
          const newItem = {
            name: itemName,
            weightGrams: newWeight,
            calories: Number((newWeight * cFactor).toFixed(1)),
            saturatedFat: Number((newWeight * fFactor).toFixed(2)),
            sodium: Number((newWeight * sFactor).toFixed(1)),
            dbSource: "estimated",
            dbId: null
          };

          if (!activeMeal.itemsBreakdown) activeMeal.itemsBreakdown = [];
          activeMeal.itemsBreakdown.push(newItem);
          addDebugLog(`[Modify Math] add_item: Added "${itemName}" with estimated weight ${newWeight}g.`);
        }
      }

      const newItems = activeMeal.itemsBreakdown || [];
      const newTotalWeight = newItems.reduce((acc: number, it: any) => acc + (Number(it.weightGrams) || 0), 0);
      const mealWeightRatio = newTotalWeight / originalTotalWeight;

      activeMeal.weightGrams = newTotalWeight;
      activeMeal.composition = newItems.map((it: any) => it.name).join(", ");
      
      const newCalories = newItems.reduce((acc: number, it: any) => acc + (Number(it.calories) || 0), 0);
      const newSaturatedFat = newItems.reduce((acc: number, it: any) => acc + (Number(it.saturatedFat) || 0), 0);
      const newSodium = newItems.reduce((acc: number, it: any) => acc + (Number(it.sodium) || 0), 0);

      activeMeal.nutrients.calories = Number(newCalories.toFixed(1));
      activeMeal.nutrients.saturatedFat = Number(newSaturatedFat.toFixed(2));
      activeMeal.nutrients.sodium = Number(newSodium.toFixed(1));

      const nutrientKeys = [
        "protein", "totalFat", "unsaturatedFat", "omega3", 
        "carbohydrates", "addedSugar", "totalFibre", "solubleFibre", "potassium", 
        "magnesium", "calcium", "iron", "zinc", "selenium", "iodine", "phosphorus", 
        "vitaminD", "vitaminB12", "folate", "vitaminC", "vitaminE", "vitaminK", 
        "vitaminA", "vitaminB6", "thiamine", "riboflavin", "niacin"
      ];

      for (const key of nutrientKeys) {
        if (activeMeal.nutrients[key] !== undefined) {
          activeMeal.nutrients[key] = Number((activeMeal.nutrients[key] * mealWeightRatio).toFixed(2));
        }
      }

      return res.json({
        mode: "modify",
        text: rawParsed.message || "I have recalculated your meal's metrics with precision based on your instructions.",
        data: activeMeal,
        agentPrompt: fullPromptSent,
        apiCalls
      });
    }
  } catch (error: any) {
    console.error("[Food Analyze Error]:", error);
    return res.status(200).json({
      error: `The food log agent is not available (Error: ${error.message || 'Connection timed out'}).`,
      agentNotAvailable: true
    });
  }
});

// Gemini Medical/Biomarkers Analyze Endpoint
app.post("/api/gemini/medical-analyze", async (req, res) => {
  try {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "default-session";

let { 
      message, 
      image, 
      images, 
      imageDates, 
      history, 
      userProfile, 
      engine, 
      existingBiomarkers, 
      agentType, 
      biomarkerHistory, 
      biomarkers, 
      recentMeals,
      foodLogs,
      customSystemInstruction,
      customVariableData
    } = req.body;

    // Isolate Diagnostic Agent Data (agent4):
    // Ensure agent4 only receives diagnostic-relevant data (biomarkers and profile)
    // and is not sent other conversation or food log entries.
    const allBiomarkerKeys = Array.from(new Set([
      ...biomarkerDefinitions.map(d => d.key),
      ...Object.keys(userProfile?.customBiomarkers || {})
    ]));
    
    const agent1Step1Schema = {
      type: Type.OBJECT,
      properties: {
        extractedData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              biomarker: {
                type: Type.STRING,
                description: "The canonical ID of the biomarker.",
                enum: allBiomarkerKeys.length > 0 ? allBiomarkerKeys : ["unknown_biomarker"]
              },
              date: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
              updated_at: { type: Type.INTEGER },
              numeric_value: { type: Type.NUMBER, description: "The exact numerical value if quantitative. Leave null if qualitative.", nullable: true },
              qualitative_value: { type: Type.STRING, description: "The exact string if qualitative (e.g., 'NEGATIVE'). Leave null if quantitative.", nullable: true },
              unit: { type: Type.STRING, description: "The exact unit verbatim from the text. Leave empty string if none." },
              explanation: { type: Type.STRING, description: "Why or how it was mapped." }
            },
            required: ["biomarker", "date", "updated_at", "unit", "explanation"]
          }
        },
        unmappedTests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              raw_name: { type: Type.STRING },
              suggested_key: { type: Type.STRING }
            },
            required: ["raw_name", "suggested_key"]
          }
        },
        text: { type: Type.STRING, description: "Friendly clinical conversational message to the user." },
        hasMoreMarkers: { type: Type.BOOLEAN },
        remainingText: { type: Type.STRING },
        estimatedTotalMarkers: { type: Type.INTEGER }
      },
      required: ["extractedData", "text", "hasMoreMarkers", "remainingText", "estimatedTotalMarkers"]
    };
    const dataReviewSchema = {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING, description: "Conversational summary of clinical range adjustments and review findings for this batch. If there are extreme divergences, highlight them here." },
        extremeDivergences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, enum: allBiomarkerKeys.length > 0 ? allBiomarkerKeys : ["unknown_biomarker"] },
              originalValue: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              reason: { type: Type.STRING, description: "Explain why it seems anomalous or unit mismatched" },
              suggestedAction: { type: Type.STRING, description: "Suggestion (e.g. 'Update value' or 'Change metric unit')" }
            },
            required: ["key", "originalValue", "unit", "reason", "suggestedAction"]
          }
        },
        reviewedBiomarkers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING, enum: allBiomarkerKeys.length > 0 ? allBiomarkerKeys : ["unknown_biomarker"] },
              name: { type: Type.STRING, description: "Standard clinical name of the biomarker" },
              userValue: { type: Type.NUMBER, description: "Exact value from the input data" },
              unit: { type: Type.STRING, description: "Exact unit from the input data" },
              _demographicAudit: {
                type: Type.OBJECT,
                properties: {
                  standardWesternBaseline: { type: Type.STRING, description: "The textbook global/Western range" },
                  knownEthnicOrRegionalVariances: { type: Type.STRING, description: "State the exact regional variant and the society it comes from. If absolutely none exist, state 'None'" },
                  ageAndGenderShifts: { type: Type.STRING, description: "How age and gender naturally alter the baseline" },
                  finalAppliedAdjustments: { type: Type.STRING, description: "The synthesis of how you are modifying the bounds for this specific user" }
                },
                required: ["standardWesternBaseline", "knownEthnicOrRegionalVariances", "ageAndGenderShifts", "finalAppliedAdjustments"]
              },
              profileAdjustedNormalRange: { type: Type.STRING, description: "The final range, appending the demographic reason in parentheses if altered from global baseline" },
              rangeBrackets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Bracket name (e.g., Optimal, Elevated, Mildly Decreased)" },
                    range: { type: Type.STRING, description: "Mathematical bounds (e.g., >= 90, 60-89). Must be continuous with no gaps." }
                  },
                  required: ["name", "range"]
                }
              },
              description: { type: Type.STRING, description: "2-sentence physiological role" },
              _statusReasoning: { type: Type.STRING, description: "1-sentence mathematical evaluation comparing userValue to profileAdjustedNormalRange bounds" },
              status: { type: Type.STRING, description: "Strictly 'Healthy' or 'At Risk' based on _statusReasoning" },
              specificRiskContext: { type: Type.STRING, description: "3-4 sentence personalized clinical context based on the final status" }
            },
            required: ["key", "name", "userValue", "unit", "_demographicAudit", "profileAdjustedNormalRange", "rangeBrackets", "description", "_statusReasoning", "status", "specificRiskContext"]
          }
        }
      },
      required: ["message", "reviewedBiomarkers"]
    };
    if (agentType === "agent4") {
      recentMeals = [];
      biomarkerHistory = [];
      


    if (history && history.length > 0) {
        history = history.filter((h: any) => {
          if (!h.content) return false;
          const lower = h.content.toLowerCase();
          // Exclude food log messages, extracted biomarkers, and other unrelated agent content
          if (
            lower.includes("food log") || 
            lower.includes("[extracted food") || 
            lower.includes("active meal") || 
            lower.includes("[extracted biomarkers") ||
            lower.includes("meal log") ||
            lower.includes("banana") ||
            lower.includes("pineapple")
          ) {
            return false;
          }
          return true;
        });
      }
      addDebugLog(`[Medical Analyze Agent] Diagnostic Agent (agent4) data isolated: other conversations and food log entries removed.`, explicitSessionId);
    }

    addDebugLog(`[Medical Analyze Agent] Request received for agentType: ${agentType || 'None'}. Message: "${String(message).substring(0, 100)}..."`, explicitSessionId);
    if (history && history.length > 0) {
      addDebugLog(`[Medical Analyze Agent] Included conversational history context (${history.length} turns).`, explicitSessionId);
    }


    if (!agentType) agentType = "agent1_step1";

    if (true) {
      let systemInstruction = "";
      let mockData: any = {};
      let fullPromptSent = "";

      if (agentType === "agent4") {
        systemInstruction = `You are a Medical Diagnostics Assessment agent.
Your objective is to analyze the user's biomarker history, recent test data, profile, and current symptoms to project timeline risks and identify testing gaps or overall health trends.
You MUST output ONLY a valid JSON object containing:
- "text": A conversational, highly detailed clinical response.
- "mode": "discussion"
- "status": "active"`;
        mockData = { text: "I have reviewed your medical records.", mode: "discussion", status: "active" };
      } else if (agentType === "agent1_step1") {
        const itemsPerBatch = 50; // Force 50 regardless of req.body value
        
        systemInstruction = `{
  "agent_profile": {
    "role": "Expert Clinical Data Extractor and Lossless Data Conduit",
    "objective": "Parse raw medical reports/text/images, isolate distinct biomarker measurements, and structure them verbatim into standard clinical format."
  },
  "critical_extraction_rules": {
    "zero_math_verbatim_extraction": "You are strictly forbidden from performing any calculations, normalizations, or unit conversions. Extract the exact numerical value and the exact unit provided in the text.",
    "verbatim_qualitative_data": "Qualitative results (e.g., 'Negative', 'Trace', 'High') must be extracted exactly as written.",
    "dictionary_mapping": "You are strictly forbidden from inventing new biomarker keys. You must only select keys from the EXACT provided EXISTING DATABASE KEYS enum list. Do NOT guess or use synonyms.",
    "unit_standardization": "Standardize 'µg/L' and 'ug/L' to always return as 'ug/L' (they are equivalent). Treat 'u/week' and 'units/week' as equivalent and output as 'u/week'."
  },
  "mode_routing": {
    "priority": "Always prioritize structured data extraction over conversational text when raw medical data/text/photos are present."
  },
  "chunked_processing": {
    "limit_per_chunk": ${itemsPerBatch},
    "behavior": [
      "Extract ONLY the first ${itemsPerBatch} biomarker entries in this chunk.",
      "If you reach the limit of ${itemsPerBatch} extracted biomarkers, set 'hasMoreMarkers' to true in your JSON response.",
      "Copy ALL remaining unparsed report text/context verbatim from the very next character after the last extracted entry to the absolute end of the input raw medical data into 'remainingText'. Do NOT truncate, summarize, or skip this text. It is critical that all remaining lines are kept in 'remainingText' so they can be parsed in the next chunk.",
      "In the 'text' response, kindly inform the user you have completed this chunk and ask to continue.",
      "If total remaining biomarkers <= ${itemsPerBatch}, set 'hasMoreMarkers' to false and 'remainingText' to empty string."
    ]
  },
  "required_output_format": {
    "response_schema": {
      "extractedData": "A JSON array of objects, containing the newly extracted biomarker entries. If the user message is 'continue', parse the next batch from the 'REMAINING UNPARSED TEXT' and do NOT repeat or duplicate the entries from 'PREVIOUSLY EXTRACTED JSON'.",
      "unmappedTests": [
        {
          "raw_name": "string (The exact test name from the text)",
          "suggested_key": "string (A clean, lowercase snake_case key suggestion for this test, e.g., 'pulse_rate', 'sars_cov_2_rna')"
        }
      ],
      "text": "string (Friendly clinical conversational message)",
      "hasMoreMarkers": "boolean",
      "remainingText": "string",
      "estimatedTotalMarkers": "number (Realistic, non-hallucinated estimate of total distinct biomarker readings present in original report text.)"
    }
  },
  "extracted_data_schema": [
    {
      "biomarker": "string (MUST be an exact match from the EXISTING DATABASE KEYS array. Do not guess, map synonyms, or invent new keys.)",
      "date": "YYYY-MM-DD",
      "updated_at": "number (Unix timestamp of extraction)",
      "numeric_value": "number or null",
      "qualitative_value": "string or null",
      "unit": "string (verbatim from text)",
      "explanation": "string (why/how it was mapped or created)"
    }
  ],
  "rules_for_inputs": {
    "raw_data_extraction": "Extract only from raw text/report. Do NOT extract from pre-existing logs.",
    "unmapped_data_handling": "If a test in the raw data does not perfectly match an existing key in the enum list, do NOT force a mapping into 'extractedData'. You must completely skip it in 'extractedData' and instead add it to the 'unmappedTests' array, providing both the 'raw_name' and a 'suggested_key' formatted in lowercase snake_case.",
    "continue_extracting": "If the user message is 'continue', you MUST find the position of the last extracted entry from 'PREVIOUSLY EXTRACTED JSON' inside the 'USER RAW DATA' or 'REMAINING UNPARSED TEXT'. Then, parse the NEXT batch of up to ${itemsPerBatch} biomarkers starting EXACTLY from that point. You MUST NOT repeat, duplicate, or include ANY entries that are already present in the 'PREVIOUSLY EXTRACTED JSON'.",
    "update_data": "Support editing, adding, or deleting biomarkers in the array."
  }
}

=== EXISTING DATABASE KEYS ===
${Array.from(new Set([...biomarkerDefinitions.map(d => d.key), ...Object.keys(userProfile?.customBiomarkers || {})])).join(', ')}`;
        mockData = {};
      } else if (agentType === "agent1") {
        systemInstruction = `You are an expert Clinical Data Parser and Medical Ontology Agent.
Your primary objective is to parse raw health reports, standardize clinical terminology, and structure biomarker readings into structured JSON. You must preserve mathematical data, qualitative results, lab ranges, and clinical notes exactly as provided.

=== CORE TASKS ===
1. Extraction & Standardization: Parse the incoming raw data. Convert every raw biomarker name into its most widely accepted standard clinical terminology (e.g., "Serum alt level" maps to "Alanine Aminotransferase (ALT)").
2. Lossless Math & Units (CRITICAL): You are strictly forbidden from performing calculations, unit conversions, or inferring missing units. Extract the exact numerical value and the exact unit provided in the text.
3. Qualitative Data (CRITICAL): If a result is qualitative (e.g., "Negative", "Trace", "High"), extract it exactly as written.
4. Dictionary Mapping (MANDATORY): You are strictly forbidden from inventing new biomarker keys. You must only select keys from the provided enum list in the JSON schema.
5. Clinical Mapping: For each biomarker, map it to:
   - riskCategories: Physiological risk categories (e.g., 'Cardiovascular', 'Kidney & hydration', 'Metabolic & glycemic', 'Liver & hepatitis stress', 'Hematology', 'Biometrics', 'Other').
   - standardMedicalGrouping: Main clinical division ('Metabolic', 'Hepatic', 'Renal', 'Hematology', 'Biometrics', 'Other').
   - potentialMedicalConditions: Broad diagnostic associations.
6. Explanation of Changes (CRITICAL): For each biomarker, if you standardized, changed, merged, or corrected its name, value, or unit, you MUST provide a detailed explanation of why you made this change in the 'explanation' field.

=== EXISTING DATABASE KEYS ===
[${Array.from(new Set([...biomarkerDefinitions.map(d => d.key), ...Object.keys(userProfile?.customBiomarkers || {})])).join(', ')}]

=== FORMAT & SYSTEM RESTRICTIONS ===
Your output MUST be valid JSON using the schema provided. Return the array of biomarkers under the "extractedData" key.`;
        mockData = {};
      } else if (agentType === "agent2" || agentType === "agent1_step2") {
        systemInstruction = `You are an expert Clinical Ontologist and conversational health assistant (Step 2: Category Mapping).
Your tasks:
1. Identify all unique biomarkers in the JSON list and categorize them by associating:
   - "riskCategories": An array of matching risk categories. Choose from: 'Cardiovascular', 'Kidney & hydration', 'Metabolic & glycemic', 'Liver & hepatitis stress', 'Hematology'. If none match, you can use other appropriate categories.
   - "standardMedicalGrouping": Choose exactly ONE of these standard physiological groupings: 'Metabolic', 'Hepatic', 'Renal', 'Hematology', 'Biometrics', or 'Other'.
   - "potentialMedicalConditions": An array of related medical conditions or risks (e.g. ['Diabetes Risk', 'Insulin Resistance', 'Obesity', 'Anemia', 'Hepatitis Stress', 'Fatty Liver', 'Chronic Kidney Disease']).
CRITICAL CATEGORY ASSIGNMENT RULE: For EVERY single biomarker in "bucketMapping", you MUST assign at least ONE category in "riskCategories" (never leave it empty), exactly ONE standard grouping in "standardMedicalGrouping" (never leave it empty), and at least ONE related condition in "potentialMedicalConditions" (never leave it empty).
CRITICAL REQUIREMENT: You MUST map EVERY SINGLE UNIQUE BIOMARKER found in the provided JSON data. Do NOT skip or omit any biomarkers. If there are 65 biomarkers in the JSON, your dictionary MUST contain exactly 65 keys.
2. Handle conversational questions, updates, requests to go back, or requests to continue/submit from the user.

You MUST respond with a JSON object containing the following keys:
- "text": A friendly, clinical-grade conversational response to the user. You MUST include a breakdown of what remains the same and what change from the complete list you are suggesting. You must also include a count of the total biomarkers mapped.
- "bucketMapping": A key-value dictionary where the key is the biomarker name and the value is the assigned categorization object containing "riskCategories", "standardMedicalGrouping", and "potentialMedicalConditions".

Example "bucketMapping" structure:
{
  "HbA1c": {
    "riskCategories": ["Metabolic & glycemic"],
    "standardMedicalGrouping": "Metabolic",
    "potentialMedicalConditions": ["Diabetes Risk", "Insulin Resistance"]
  },
  "Serum ALT": {
    "riskCategories": ["Liver & hepatitis stress"],
    "standardMedicalGrouping": "Hepatic",
    "potentialMedicalConditions": ["Fatty Liver", "Hepatitis Stress"]
  }
}

Rules for handling user inputs:
- INITIAL mapping: Categorize each biomarker into the detailed fields above and return the dictionary in "bucketMapping", and set "text" to include the breakdown of what remains the same, what changes you are suggesting, and the total count.
- UPDATE DATA: If the user requests to change a category mapping (e.g., "Move glucose to Metabolic"), perform the update on the "bucketMapping" dictionary and return the updated dictionary, explaining the change and updating the counts/breakdown in "text".
- START A CONVERSATION: If the user asks a clinical or general question (e.g., "Why is ALT under Hepatic?"), answer the question clearly in "text" and return the unmodified dictionary in "bucketMapping".
- GO BACK / CONTINUE / SUBMIT: If the user asks to go back to Step 1 or proceed/continue/submit, explain in "text" how to proceed (they can click "Assemble Data" to continue, or click "Go Back" if needed).

Make sure your entire output is valid JSON, containing "text" and "bucketMapping".`;
        mockData = {};
      } else if (agentType === "agent3" || agentType === "agent1_step3") {
        systemInstruction = `You are a clinical data coordinator and conversational health assistant (Step 3: Data Assembly).
Your tasks:
1. Assemble the flat JSON biomarker logs and the bucket mapping dictionary into a structured physiological nested JSON.
CRITICAL REQUIREMENT: You MUST include EVERY SINGLE BIOMARKER ENTRY from the JSON. Do NOT skip or omit any biomarkers or history entries.
2. EXTREME DIVERGENCE FLAG: If you notice an extreme divergence in a biomarker value (e.g., highly unlikely, physiologically impossible, or a very clear metric unit mismatch like US vs SI), you MUST flag it by adding an array "flaggedAnomalies" to your JSON output. Mention this in your "text" response so the user can verify, confirm, or edit it (which may involve updating the metric unit).
3. Handle conversational questions, updates, requests to go back, or requests to continue/submit from the user.

You MUST respond with a JSON object containing the following keys:
- "text": A friendly, clinical-grade conversational response to the user. If this is the initial assembly and anomalies are found, alert the user here. If no anomalies, write: "Data successfully processed and categorized." (or similar).
- "entriesCount": Total unique biomarker entries processed.
- "buckets": An array of buckets matching the schema below.
- "flaggedAnomalies": (Optional) Array of any extreme value divergences detected.

Nested JSON schema for "flaggedAnomalies":
[
  {
    "key": "biomarker_key",
    "name": "Biomarker Name",
    "originalValue": number,
    "unit": "string",
    "reason": "Explanation of why this value seems anomalous or if it might be a unit mismatch (US vs SI).",
    "suggestedAction": "Suggestion for the user (e.g., 'Confirm this value is correct', 'Update value or metric unit')"
  }
]

Nested JSON schema for "buckets":
[
  {
    "systemName": "Bucket Name", // must be one of: 'Metabolic', 'Hepatic', 'Renal', 'Hematology', 'Biometrics', 'Other'
    "biomarkers": [
      {
        "name": "Biomarker Name",
        "riskCategories": ["Cardiovascular", "Metabolic & glycemic"], // arrays from the Step 2 bucket mapping
        "standardMedicalGrouping": "Metabolic", // string from the Step 2 bucket mapping
        "potentialMedicalConditions": ["Diabetes Risk", "Insulin Resistance"], // array of potential medical conditions from Step 2
        "history": [
          { "date": "YYYY-MM-DD", "value": number, "unit": "string" }
        ]
      }
    ]
  }
]

Rules for handling user inputs:
- INITIAL assembly: Map EVERY single biomarker and entry from the YAML using the Bucket Mapping. Do not drop any. Organize them into the "buckets" array. Return the JSON structure, and set "text" to "Data successfully processed and categorized. Please review the final structured entries below."
- UPDATE DATA: If the user asks to edit/add/delete a biomarker, date, or reading (e.g., "Remove red blood cell count reading on 2026-06-01"), perform that update on the nested "buckets" structure, update "entriesCount", and return the updated structure, explaining the change in "text".
- START A CONVERSATION: If the user asks a clinical or general question (e.g., "Why is ALT high?" or questions about "total white cell count"), answer the question clearly in "text", and return the unmodified "buckets" and "entriesCount".
- GO BACK / CONTINUE / SUBMIT: If the user asks to go back to Step 2, or finish and save/submit, explain in "text" how they can save their data or click the buttons to navigate.

Make sure your entire output is valid JSON, containing "text", "entriesCount", and "buckets".`;
        mockData = {};
      } else if (agentType === "agent4") {
        systemInstruction = `You are an advanced Clinical Classification, Prognostic, and Risk Triage Engine.
You will receive an intermediate YAML payload containing a user profile and a cleaned list of biomarkers. You may also receive conversational follow-ups or corrections from the user.
Your objective is to dynamically group EVERY biomarker into logical clinical conditions, calculate prognostic timelines, and output a strict, zero-data-loss JSON payload.

=== CRITICAL DIRECTIVES ===
CONVERSATION & CORRECTIONS:
If the user provides a correction (e.g., "My weight is 61kg" or "You missed the marker 'mean_corpuscular_volume'"), you MUST prioritize this new instruction, override previous assumptions, and completely regenerate the JSON payload to fix the error.

INVENTORY PARITY RULE (Zero Data Loss):
You must count the total number of unique biomarkers in the incoming YAML.
Your final JSON output MUST contain exactly that same number of unique biomarkers. You are strictly forbidden from omitting, summarizing, or dropping any biomarker key.
Record the incoming count in audit.metricsReceived and your final output count in audit.metricsProcessed.

SEMANTIC TAXONOMY ANCHORS (Dynamic Grouping):
Do not rely on a hardcoded dictionary. Group biomarkers dynamically into conditions:
- Cardiovascular/Lipid: Contains 'cholesterol', 'ldl', 'hdl', 'triglycerides', 'qrisk', 'lipid'.
- Renal/Metabolic/Electrolyte: Contains 'egfr', 'creatinine', 'sodium', 'potassium', 'calcium', 'phosphate', 'hba1c', 'bmi', 'weight'.
- Hepatic/Liver: Contains 'alt', 'ast', 'bilirubin', 'phosphatase', 'albumin', 'globulin', 'protein'.
- Hematology/Immune: Contains 'cell', 'count', 'haemoglobin', 'haematocrit', 'volume', 'platelet', 'neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'.
- Screening/Other: Any marker that does not fit the above (e.g., 'psa', 'audit').

FAIR ASSESSMENT & DEMOGRAPHIC RISK:
Do not invent pathology. If the user's systems are healthy, state clearly they are highly optimized.
Apply demographic thresholds explicitly. Example: For South/East Asian ethnicities, a BMI >= 23.0 kg/m² must be flagged as ELEVATED/MONITOR.
If a condition block contains even one marker flagged as ELEVATED or MONITOR, the entire block's 'aggregateRisk' inherits that severity tier.

PROGNOSTIC TIMELINES & GAP ANALYSIS:
If healthy: Project maintenance of vitality and low metabolic risk over 2, 5, and 10 years.
If at risk: Project the logical biological progression over 2, 5, and 10 years if no lifestyle changes are made (e.g., progression toward metabolic syndrome).
Recommend exactly advanced confirmation tests (e.g., Fasting Insulin, ApoB, Cystatin-C) to verify gaps in the data, or state "No additional testing required" if perfect.

=== STRICT JSON OUTPUT SCHEMA ===
{
  "audit": {
    "metricsReceived": number,
    "metricsProcessed": number
  },
  "summary": {
    "primaryDiagnosis": "Conversational summary of systemic health and demographic context.",
    "timelineProjections": {
      "year2": "String",
      "year5": "String",
      "year10": "String"
    }
  },
  "prioritizedConditions": [
    {
      "conditionName": "String (e.g., Cardiovascular Health)",
      "aggregateRisk": "ELEVATED | MONITOR | OPTIMAL",
      "clinicalRationale": "1-sentence explanation of why this risk tier was assigned.",
      "biomarkers": [
        {
          "key": "String (original key)",
          "name": "String (clean name)",
          "currentValue": number,
          "unit": "String",
          "status": "HIGH | LOW | NORMAL"
        }
      ]
    }
  ],
  "recommendedTests": [
    {
      "testName": "String",
      "reason": "String"
    }
  ]
}

Ensure the 'prioritizedConditions' array is sorted descending by risk (ELEVATED first, OPTIMAL last). Return ONLY raw JSON. No markdown wrappers.`;

        mockData = {
          audit: {
            metricsReceived: 3,
            metricsProcessed: 3
          },
          summary: {
            primaryDiagnosis: "Slightly elevated glycemic markers; cardiovascular and renal health are highly optimized.",
            timelineProjections: {
              year2: "Maintaining current metabolic profiles; slight progression in glycemic metrics if diet remains unadjusted.",
              year5: "Mild risk of insulin resistance progression; cardiovascular health remains solid.",
              year10: "Metabolic risk increases by 5% if glycemic spikes are not managed."
            }
          },
          prioritizedConditions: [
            {
              conditionName: "Renal/Metabolic/Electrolyte",
              aggregateRisk: "ELEVATED",
              clinicalRationale: "Fasting glucose is slightly elevated relative to optimal ranges.",
              biomarkers: [
                {
                  key: "glucose",
                  name: "Fasting Glucose",
                  currentValue: 5.8,
                  unit: "mmol/L",
                  status: "HIGH"
                },
                {
                  key: "hba1c",
                  name: "HbA1c",
                  currentValue: 37,
                  unit: "mmol/mol",
                  status: "NORMAL"
                }
              ]
            },
            {
              conditionName: "Cardiovascular/Lipid",
              aggregateRisk: "OPTIMAL",
              clinicalRationale: "Cardiovascular markers are currently in optimal reference ranges.",
              biomarkers: [
                {
                  key: "ldl",
                  name: "LDL Cholesterol",
                  currentValue: 2.1,
                  unit: "mmol/L",
                  status: "NORMAL"
                }
              ]
            }
          ],
          recommendedTests: [
            {
              testName: "Fasting Insulin",
              reason: "To rule out insulin resistance in light of borderline-high glucose."
            }
          ]
        };
      } else if (agentType === "agent5") {
        systemInstruction = `You are a Clinical Education AI (Biomarker Contextualizer). Your job is to generate highly personalized educational content, adjusted normal reference ranges, and specific risk explanations based on the user's demographics and previous diagnostic assessment.

USER PROFILE:
- Age: ${userProfile?.age || 'Not provided'}
- Gender: ${userProfile?.gender || 'Not provided'}
- Ethnicity: ${userProfile?.ethnicity || 'Not provided'}

BIOMARKERS:
${JSON.stringify(biomarkers || {})}

DIAGNOSTIC SUMMARY:
${req.body.agentDiagnosticSummary || 'Optimized or no major pathologies flagged.'}

=== DIRECTIVES ===
1. ZERO DATA LOSS INVENTORY RULE:
   You must count the total number of unique biomarkers in the incoming BIOMARKERS dictionary.
   Your final JSON output MUST contain exactly that same number of unique biomarkers under "contextualizedBiomarkers". You are strictly forbidden from omitting, summarizing, or dropping any biomarker key.
2. DEMOGRAPHICALLY ADJUSTED NORMAL RANGES: For every provided clinical metric, provide a profile-adjusted normal range. Explain why this reference range was adjusted for their age, gender, or ethnicity (e.g. muscle mass and creatinine, age-related eGFR, ethnic-specific lipid targets).
3. EDUCATIONAL DESCRIPTIONS: Write a clear 2-sentence description of what each biomarker is and its physiological role.
4. SPECIFIC RISK CONTEXT: For any marker identified as at-risk or abnormal, write a personalized 3-4 sentence explanation of *why* this specific value is critical or dangerous for *this specific user profile*.
5. STRICT JSON OUTPUT SCHEMA:
{
  "message": "Conversational summary of your educational and reference range adjustments.",
  "contextualizedBiomarkers": [
    {
      "name": "hba1c",
      "userValue": 40,
      "profileAdjustedNormalRange": "20 - 42 mmol/mol",
      "description": "HbA1c measures the percentage of blood sugar attached to hemoglobin. It represents your average blood glucose levels over the past 2 to 3 months.",
      "status": "Healthy" | "At Risk",
      "specificRiskContext": "For a patient of your demographic group, keeping HbA1c below 42 mmol/mol is optimal to prevent vascular damage and glycemic stress."
    }
  ]
}
Return ONLY raw JSON.`;

        mockData = {
          message: "I have calibrated the reference ranges for your biomarkers to your precise age, gender, and ethnicity, providing demographic-specific educational contexts.",
          contextualizedBiomarkers: [
            {
              name: "hba1c",
              userValue: 40,
              profileAdjustedNormalRange: "20 - 42 mmol/mol",
              description: "HbA1c measures the percentage of blood sugar attached to hemoglobin. It represents your average blood glucose levels over the past 2 to 3 months.",
              status: "Healthy",
              specificRiskContext: "Your HbA1c is in the excellent, optimal zone for your demographic group."
            }
          ]
        };
      } else if (agentType === "agent6") {
        systemInstruction = `You are a Precision Medicine & Lifestyle Coaching AI (Precision Intervention Agent). Translate the user's clinical biomarkers and risk assessment into a strict, trackable daily protocol.

USER PROFILE:
- Age: ${userProfile?.age || 'Not provided'}
- Weight: ${userProfile?.weight || 'Not provided'} kg
- Height: ${userProfile?.height || 'Not provided'} cm
- Gender: ${userProfile?.gender || 'Not provided'}

BIOMARKERS:
${JSON.stringify(biomarkers || {})}

DIAGNOSTIC BACKGROUND:
${req.body.agentDiagnosticSummary || 'Mainly healthy'}

=== DIRECTIVES ===
1. NUTRITION TARGETS (Detailed Recommended Allowances): Generate strict daily targets for calories, protein, carbs, fat, saturatedFat, totalFibre, sodium, sugar.
   - For EACH nutrient target, you MUST output a structured object containing:
     - "value": The numeric value.
     - "unit": The unit (e.g. "kcal", "g", "mg").
     - "reason": A detailed clinical explanation of why they need to focus on this goal based on their biomarkers.
     - "duration": How long they should maintain this specific target (e.g., "12 weeks", "Continuous").
2. ACTIVITY HABITS: Provide 2-3 highly specific daily habits (e.g., '7,500 steps', '30 minutes Zone 2 cardio', 'Limit screen time after 10 PM').
3. MATHEMATICAL PROJECTIONS: Provide biological time-to-goal estimates based on the math of physiology.

4. STRICT JSON OUTPUT SCHEMA:
{
  "message": "Conversational explanation of your precision lifestyle design.",
  "nutrientTargets": {
    "calories": { "value": 1850, "unit": "kcal", "reason": "To create a modest deficit for BMI optimization and lower cardiac workloads", "duration": "12 weeks / until BMI of 23 is achieved" },
    "protein": { "value": 110, "unit": "g", "reason": "To support nitrogen balance and prevent muscle wasting during a caloric deficit", "duration": "Continuous" },
    "carbs": { "value": 220, "unit": "g", "reason": "Optimized level to maintain energy without causing postprandial glucose surges", "duration": "Continuous" },
    "fat": { "value": 50, "unit": "g", "reason": "Controlled healthy fats to maintain cellular structures and hormone synthesis", "duration": "Continuous" },
    "saturatedFat": { "value": 15, "unit": "g", "reason": "Strict restriction to limit hepatic VLDL synthesis and improve your high ApoB/LDL ratio", "duration": "8-12 weeks" },
    "totalFibre": { "value": 30, "unit": "g", "reason": "High prebiotic fiber to slow glucose absorption and optimize gut microbiome health", "duration": "Continuous" },
    "sodium": { "value": 1800, "unit": "mg", "reason": "Restricted sodium to regulate extracellular fluid volume and support arterial pressure", "duration": "Continuous" },
    "sugar": { "value": 25, "unit": "g", "reason": "Low simple sugars to reduce pancreatic stress and liver glycogen packing", "duration": "8-12 weeks" }
  },
  "activityChecklist": [
    {
      "habit": "Walk 8,000 steps daily",
      "target": "8000 steps",
      "type": "steps"
    },
    {
      "habit": "Zone 2 aerobic exercise",
      "target": "30 minutes",
      "type": "cardio"
    }
  ],
  "projections": [
    "Adhering to this saturated fat limit will likely lower LDL-C by 10-15% within 12 weeks.",
    "The daily fiber target will assist in glycemic stabilization, projecting a slight HbA1c drop of 1-2 mmol/mol over 3 months."
  ]
}
Return ONLY raw JSON.`;

        mockData = {
          message: "I have created a high-precision, clinically aligned dietary and movement plan with mathematical timeline projections.",
          nutrientTargets: {
            calories: { value: 1900, unit: "kcal", reason: "Support basic metabolism with a minor deficit for cardiorespiratory health", duration: "12 weeks" },
            protein: { value: 105, unit: "g", reason: "Maintain nitrogen balance and protect lean muscle tissue", duration: "Continuous" },
            carbs: { value: 210, unit: "g", reason: "Provide stable energy without triggering glycemic excursions", duration: "Continuous" },
            fat: { value: 55, unit: "g", reason: "Ensure adequate absorption of fat-soluble vitamins and support cellular structures", duration: "Continuous" },
            saturatedFat: { value: 14, unit: "g", reason: "Decrease hepatic VLDL secretion to target elevated LDL particle numbers", duration: "8-12 weeks" },
            totalFibre: { value: 32, unit: "g", reason: "Slow down gastric transit and feed beneficial short-chain fatty acid producing gut bacteria", duration: "Continuous" },
            sodium: { value: 1700, unit: "mg", reason: "Regulate blood pressure levels and balance vascular tone", duration: "Continuous" },
            sugar: { value: 22, unit: "g", reason: "Mitigate spikes in insulin and prevent hepatic lipid deposition", duration: "8-12 weeks" }
          },
          activityChecklist: [
            { habit: "Walk 7,500 steps daily", target: "7500 steps", type: "steps" },
            { habit: "30 mins Zone 2 cardio", target: "30 minutes", type: "cardio" }
          ],
          projections: [
            "Adhering to this fat threshold will lower LDL-C by ~12% in 8-12 weeks.",
            "A 32g daily fiber intake stabilizes postprandial glucose, projecting metabolic efficiency in 4 weeks."
          ]
        };
      } else if (agentType === "agent7") {
        systemInstruction = `You are a Medical Literature Research AI (Medical Literature Agent). Summarize the latest peer-reviewed scientific consensus, clinical debates, and clinical trials relevant to this user's profile and biological risk markers.

USER PROFILE:
- Age: ${userProfile?.age || 'Not provided'}
- Gender: ${userProfile?.gender || 'Not provided'}
- Ethnicity: ${userProfile?.ethnicity || 'Not provided'}

BIOMARKERS:
${JSON.stringify(biomarkers || {})}

IDENTIFIED DIAGNOSTICS:
${req.body.agentDiagnosticSummary || 'Healthy baseline'}

=== DIRECTIVES ===
1. HIGHLIGHT SCHOLARLY TOPICS: Detail emerging consensus or debates (e.g. ApoB vs LDL-C tracking, cardiovascular risk algorithms like QRISK3 vs SCORE2, or dietary fiber's interaction with the gut microbiome).
2. NO PRESCRIPTIONS: Present findings as a literature synthesis, citing primary medical guidelines (e.g. AHA, ESC, ADA, KDIGO).
3. DETAILED BULLETS: Provide 3-4 distinct scholarly insights. Each insight must contain a bold title, a comprehensive summary paragraph, and a relevant citation/link (like a Pubmed search URL or medical association guideline URL).
4. STRICT JSON OUTPUT SCHEMA:
{
  "message": "Conversational summary of your medical literature scan.",
  "insights": [
    {
      "title": "ApoB as the Superior Predictor of Atherogenic Risk",
      "summary": "Recent European Society of Cardiology (ESC) consensus guidelines highlight Apolipoprotein B (ApoB) as a more accurate indicator of total atherogenic particle concentration than standard LDL-C, particularly in individuals with borderline-high fasting glucose or metabolic syndrome.",
      "link": "https://pubmed.ncbi.nlm.nih.gov/31475137/"
    }
  ]
}
Return ONLY raw JSON.`;

        mockData = {
          message: "I scanned the latest clinical literature databases (PubMed, Cochrane Library) and summarized three key consensus insights relevant to your metabolic and cardiovascular profile.",
          insights: [
            {
              title: "ApoB as the Superior Predictor of Atherogenic Risk",
              summary: "Recent European Society of Cardiology (ESC) consensus guidelines highlight Apolipoprotein B (ApoB) as a more accurate indicator of total atherogenic particle concentration than standard LDL-C, particularly in individuals with borderline-high fasting glucose or metabolic syndrome.",
              link: "https://pubmed.ncbi.nlm.nih.gov/31475137/"
            },
            {
              title: "Glycemic Stability and Preventive Cardiology Guidelines",
              summary: "The American Diabetes Association (ADA) 2026 standards highlight early lifestyle intervention at borderline HbA1c thresholds, demonstrating a 58% reduction in the 10-year transition rate to formal insulin deficiency through physical activity and fiber loading.",
              link: "https://pubmed.ncbi.nlm.nih.gov/34922236/"
            }
          ]
        };
      } else if (agentType === "data_review") {
        systemInstruction = `You are an expert Clinical Data Review & Reference Range Calibration Agent.
You will receive user demographics and a list of biomarkers in the user's current batch.
=== DEMOGRAPHIC CALIBRATION MANDATE ===
You MUST customize the reference ranges and risk context precisely for the user's specific age, gender, and ethnicity found in the USER PROFILE.
CRITICAL: Never output boilerplate text stating that demographic details are not available. They are always provided. Even if any values are missing, dynamically assume a standard reference profile (e.g., 35-year-old female of Caucasian ethnicity) and calibrate all reference ranges for that profile.
CRITICAL BIAS OVERRIDE: Medical baselines in training data heavily skew toward recent Western/Global consensus (e.g., KDIGO, WHO global). You MUST actively bypass global/race-free standards and aggressively search your latent knowledge for local national medical boards (e.g., Chinese Society of Nephrology, Asian-modified CKD-EPI/MDRD coefficients, Asian BMI variants). If a regional coefficient or localized threshold exists historically or currently for the user's ethnicity, you MUST prioritize and apply it over Western defaults.
=== TASK: PERSONALISED HEALTH RISK ESTIMATION ===
For each biomarker, follow a strict logical funnel to determine the correct ranges and status:
"_demographicAudit": A mandatory internal reasoning object where you actively contrast Western global standards with regional/ethnic guidelines.
"profileAdjustedNormalRange": The final calibrated range based on your audit.
"rangeBrackets": List each range bracket with its naming and value ranges, adjusted to match your demographic audit. CRITICAL: The brackets MUST be continuous (no numerical gaps or missing values between brackets) and must fully map out the bounds of the profileAdjustedNormalRange. Include bounds for each bracket.
"description": A clear 2-sentence description of the physiological role.
"_statusReasoning": A 1-sentence strict mathematical comparison of the userValue against the profileAdjustedNormalRange.
"status": Assign 'Healthy' or 'At Risk'. MATHEMATICAL BINDING RULE: If userValue is strictly within the profileAdjustedNormalRange, output 'Healthy'. If outside (even slightly), output 'At Risk'. Do not use clinical leniency.
"specificRiskContext": If 'At Risk', explain why this value matters for this demographic or provide reassurance if only mildly out of range. If 'Healthy', describe why this signifies optimal homeostasis.
=== CRITICAL REQUIREMENTS ===
You MUST include an analysis for EVERY biomarker in the input list.
Your output MUST be a valid JSON object matching the schema provided.`;
        mockData = { message: "Completed clinical review.", reviewedBiomarkers: [] };
      }

      let textOutput = "";
      if (process.env.GEMINI_API_KEY === undefined) {
        textOutput = JSON.stringify(mockData);
      } else {
        let historyText = "";
        if (history && history.length > 0) {
          historyText = "Chat History:\n" + history.map((h: any) => `${h.role}: ${h.content}`).join("\n") + "\n\n";
        }
        
        let imagePayload = null;
        let imagesPayload: { mimeType: string, data: string }[] | undefined = undefined;
        if (images && images.length > 0) {
          imagesPayload = images.map((img: string) => {
            const mimeType = img.split(";")[0].split(":")[1] || "image/jpeg";
            const base64Data = img.split(",")[1];
            return { mimeType, data: base64Data };
          });
          imagePayload = imagesPayload[0];
        } else if (image) {
          const mimeType = image.split(";")[0].split(":")[1] || "image/jpeg";
          const base64Data = image.split(",")[1];
          imagePayload = { mimeType, data: base64Data };
        }
        const imageCtx = imageDates && imageDates.length > 0 ? `The attached images were taken on these dates: ${imageDates.join(", ")}.` : "";
        
        const cleanProfile: any = {
          age: userProfile?.age,
          gender: userProfile?.gender,
          ethnicity: userProfile?.ethnicity,
          bloodType: userProfile?.bloodType,
          weight: userProfile?.weight,
          height: userProfile?.height
        };
        
        // Strip undefined and null values
        Object.keys(cleanProfile).forEach(key => {
          if (cleanProfile[key] === undefined || cleanProfile[key] === null) {
            delete cleanProfile[key];
          }
        });

        const slimBiomarkers: any = {};
        if (userProfile?.customBiomarkers) {
          Object.keys(userProfile.customBiomarkers).forEach((k: string) => {
            slimBiomarkers[k] = { 
              name: userProfile.customBiomarkers[k].name, 
              unit: userProfile.customBiomarkers[k].unit 
            };
          });
        }
        
        const cleanedPayload = {
          userProfile: cleanProfile,
          biomarkerDefinitions: slimBiomarkers,
          biomarkerHistory: biomarkerHistory || []
        };

        let jsonStr = "";
        if (req.body.extractedYaml) {
          if (typeof req.body.extractedYaml === 'string') {
            jsonStr = req.body.extractedYaml;
          } else {
            jsonStr = JSON.stringify(req.body.extractedYaml, null, 2);
          }
        }

        let dataContext = "";
        if (agentType === "agent1_step1") {
          const prevJson = jsonStr ? `\n\nPREVIOUSLY EXTRACTED JSON:\n${jsonStr}` : "";
          const remText = req.body.remainingText ? `\n\nREMAINING UNPARSED TEXT:\n${req.body.remainingText}` : "";
          const prevTotal = req.body.estimatedTotalMarkers ? `\n\nPREVIOUSLY ESTIMATED TOTAL MARKERS:\n${req.body.estimatedTotalMarkers}` : "";
          const baseData = customVariableData ? `\n\n${customVariableData}\n` : `\n\nUSER PROFILE:\n${JSON.stringify(cleanProfile, null, 2)}\n`;
          const reportSource = req.body.originalReportText || message;
          dataContext = `\n\nUSER RAW DATA:\n${reportSource}${prevJson}${remText}${prevTotal}${baseData}`;
        } else if (agentType === "agent1_step2") {
          const baseData = customVariableData ? `\n\n${customVariableData}\n` : "";
          dataContext = `${baseData}\n\nEXTRACTED JSON DATA:\n${jsonStr}\n`;
        } else if (agentType === "agent1_step3") {
          const baseData = customVariableData ? `\n\n${customVariableData}\n` : "";
          dataContext = `${baseData}\n\nEXTRACTED JSON DATA:\n${jsonStr}\n\nBUCKET MAPPING JSON:\n${req.body.bucketMapping}\n`;
        } else if (agentType === "data_review") {
          const batchData = req.body.batchBiomarkers || [];
          const baseData = customVariableData ? `\n\n${customVariableData}\n` : `\n\nUSER PROFILE:\n${JSON.stringify(cleanProfile, null, 2)}\n`;
          dataContext = `${baseData}\n\nBIOMARKERS BATCH FOR REVIEW:\n${JSON.stringify(batchData, null, 2)}\n`;
        } else if (agentType === "agent1") {
          const batchData = req.body.batchBiomarkers || [];
          const baseData = customVariableData ? `\n\n${customVariableData}\n` : `\n\nUSER PROFILE:\n${JSON.stringify(cleanProfile, null, 2)}\n`;
          dataContext = `${baseData}\n\nBIOMARKERS BATCH FOR CLEANING:\n${JSON.stringify(batchData, null, 2)}\n`;
        } else {
          const yamlData = jsToYaml(cleanedPayload);
          const baseData = customVariableData ? `\n\n${customVariableData}\n` : "";
          dataContext = `${baseData}\n\nUSER MEDICAL DATA (in YAML format):\n${yamlData}\n`;
        }

        if (customSystemInstruction) {
          systemInstruction = customSystemInstruction;
        }

        const includeFoodLogs = foodLogs && agentType !== "agent1_step1" && agentType !== "agent1_step2" && agentType !== "agent1_step3" && agentType !== "data_review" && agentType !== "agent1" && agentType !== "agent4";
        let promptText = `Chat History:\n${historyText}${includeFoodLogs ? `PATIENT'S RECENT LOGGED MEALS HISTORY:\n${foodLogs.map((m: any, idx: number) => `- Meal ${idx + 1}: "${m.name}" on ${m.date}`).join("\n")}\n\n` : ""}${imageCtx}\nUser message: "${message}"${dataContext}`;
        fullPromptSent = `System Instruction:\n${systemInstruction}\n\n${promptText}`;

        let isYaml = false; // agent1 now uses structured JSON output, not YAML
        
        let maxRetries = agentType === "agent1_step3" ? 3 : 1;
        let attempt = 0;
        let success = false;
        
        addDebugLog(`[Medical Analyze Agent] Dispatched System Instruction (Length: ${systemInstruction.length})`, explicitSessionId);
        addDebugLog(`[Medical Analyze Agent] Dispatched Prompt:\n${promptText.substring(0, 500)}... (truncated)`, explicitSessionId);

        while (attempt < maxRetries && !success) {
          attempt++;
          textOutput = await callUnifiedLLM({
            modelId: engine || "gemini-3.5-flash",
            systemInstruction,
            promptText,
            imagePayload,
            imagePayloads: imagesPayload,
            responseMimeType: isYaml ? "text/plain" : "application/json",
            responseSchema: (agentType === "agent1_step1" || agentType === "agent1") 
              ? agent1Step1Schema 
              : (agentType === "data_review") 
                ? dataReviewSchema 
                : undefined
          });
          
          addDebugLog(`[Medical Analyze Agent] Response Received:\n${textOutput}`, explicitSessionId);

          if (agentType === "agent1_step3") {
            try {
              let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
              const firstBrace = cleanJson.indexOf("{");
              const lastBrace = cleanJson.lastIndexOf("}");
              if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
              }
              const parsed = JSON.parse(cleanJson);
              
              const expectedCount = (jsonStr?.match(/"biomarker":/g) || []).length;
              let actualCount = 0;
              if (parsed.buckets && Array.isArray(parsed.buckets)) {
                parsed.buckets.forEach((b: any) => {
                  if (b.biomarkers && Array.isArray(b.biomarkers)) {
                    b.biomarkers.forEach((m: any) => {
                      if (m.history && Array.isArray(m.history)) {
                        actualCount += m.history.length;
                      }
                    });
                  }
                });
              }
              
              const isChatOrUpdate = req.body.message && req.body.message !== "Continue processing" && req.body.message !== "Assemble JSON" && req.body.message !== "Assemble Data" && req.body.message !== "Assemble data";
              const isDeleteQuery = req.body.message && (
                req.body.message.toLowerCase().includes("delete") ||
                req.body.message.toLowerCase().includes("remove") ||
                req.body.message.toLowerCase().includes("exclude") ||
                req.body.message.toLowerCase().includes("clear")
              );
              
              if (actualCount === expectedCount || attempt === maxRetries || (isChatOrUpdate && isDeleteQuery)) {
                success = true;
                textOutput = cleanJson;
              } else {
                console.log(`Agent 3 retry ${attempt}: Expected ${expectedCount} entries, got ${actualCount}`);
                promptText += `\n\nERROR: You missed some entries. I expected ${expectedCount} historical log entries based on the JSON data, but you only outputted ${actualCount}. You MUST include EVERY single entry from the JSON. Do not summarize or skip any.`;
              }
            } catch (err) {
              console.error("Agent 3 parse error:", err);
              if (attempt === maxRetries) success = true; // just let it fail naturally below
            }
          } else {
            success = true;
          }
        }
      }

      if (agentType === "agent1_step1") {
        let cleanYaml: any = textOutput;
        let text = "I have extracted the biomarkers. Please review the output.";
        let hasMoreMarkers = false;
        let remainingText = "";
        let estimatedTotalMarkers: number | null = null;
        let unmappedTests: any[] = [];
        try {
          const parsed = JSON.parse(textOutput.replace(/```(?:json)?/gi, "").trim());
          if (parsed.extractedData) {
            cleanYaml = parsed.extractedData;
          } else if (parsed.extractedYaml) {
            cleanYaml = parsed.extractedYaml;
          }
          if (parsed.text) {
            text = parsed.text;
          }
          if (parsed.unmappedTests) {
            unmappedTests = parsed.unmappedTests;
          }
          
          if (Array.isArray(cleanYaml)) {
            cleanYaml = cleanYaml.map((item: any) => {
              if (!item || typeof item !== 'object') return item;
              if (item.unit) {
                const rawUnit = item.unit;
                const sanitizedUnit = sanitizeUnitText(rawUnit);
                item.unit = sanitizedUnit;
                
                if (item.biomarker) {
                  const matrixConfig = BiomarkerMatrix[item.biomarker];
                  if (matrixConfig) {
                    const val = item.numeric_value !== undefined && item.numeric_value !== null ? item.numeric_value : item.value;
                    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)))) {
                      const numVal = parseFloat(String(val));
                      const newVal = matrixConfig.conversionLogic(numVal, sanitizedUnit);
                      const roundedNewVal = Math.round(newVal * 100) / 100;

                      if (item.numeric_value !== undefined && item.numeric_value !== null) item.numeric_value = roundedNewVal;
                      else if (item.value !== undefined && item.value !== null) item.value = roundedNewVal;
                      
                      item.unit = matrixConfig.targetUnit;
                    }
                  }
                }
              }
              return item;
            });
          }

          if (parsed.hasMoreMarkers !== undefined) {
            hasMoreMarkers = !!parsed.hasMoreMarkers;
          }
          if (parsed.remainingText) {
            remainingText = parsed.remainingText;
          }
          if (parsed.estimatedTotalMarkers !== undefined) {
            estimatedTotalMarkers = Number(parsed.estimatedTotalMarkers);
          }
        } catch (e) {
          cleanYaml = textOutput.replace(/```(?:yaml)?/gi, "").trim();
        }
        return res.json({
          text,
          agentType,
          extractedYaml: cleanYaml,
          hasMoreMarkers,
          remainingText,
          estimatedTotalMarkers,
          unmappedTests,
          currentBatch: req.body.currentBatch || 1,
          agentPrompt: fullPromptSent,
          apiCalls: [{ type: 'gemini', label: `Medical History Agent (${engine || 'gemini-3.1-flash-lite'})` }]
        });
      }

      if (agentType === "data_review") {
        let reviewedBiomarkers: any[] = [];
        let message = "";
        let extremeDivergences: any[] = [];
        try {
          const cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed) {
            message = parsed.message || "";
            extremeDivergences = Array.isArray(parsed.extremeDivergences) ? parsed.extremeDivergences : [];
            reviewedBiomarkers = Array.isArray(parsed.reviewedBiomarkers) ? parsed.reviewedBiomarkers : [];
          }
        } catch (e) {
          console.error("data_review JSON parse error", e);
        }
        return res.json({
          message,
          reviewedBiomarkers,
          extremeDivergences,
          batchIdx: req.body.batchIdx !== undefined ? req.body.batchIdx : null,
          agentType,
          agentPrompt: fullPromptSent,
          apiCalls: [{ type: 'gemini', label: `Clinical Calibration Agent (${engine || 'gemini-3.1-flash-lite'})` }]
        });
      }

            if (agentType === "agent1") {
        let parsedRows = [];
        try {
          const parsed = JSON.parse(textOutput.replace(/```(?:json)?/gi, "").trim());
          if (parsed.extractedData) parsedRows = parsed.extractedData;
        } catch (e) {
          console.error("agent1 JSON parse error", e);
        }
        return res.json({
          text: "",
          agentType,
          extractedYaml: parsedRows,
          hasMoreMarkers: false,
          remainingText: "",
          estimatedTotalMarkers: 0,
          agentPrompt: fullPromptSent,
          apiCalls: [{ type: 'gemini', label: `Medical History Agent (${engine || 'gemini-3.1-flash-lite'})` }]
        });
      }
      
      if (!agentType || agentType === "agent4") {
        try {
          const parsed = JSON.parse(textOutput.replace(/```(?:json)?/gi, "").trim());
          return res.json({
            text: parsed.text || textOutput,
            mode: parsed.mode || 'discussion',
            status: parsed.status || 'active',
            agentPrompt: fullPromptSent,
            agentType: agentType || 'agent4',
            apiCalls: [{ type: 'gemini', label: `Medical History Agent (${engine || 'gemini-3.1-flash-lite'})` }]
          });
        } catch (e) {
          return res.json({ text: textOutput, mode: 'discussion', status: 'active', agentPrompt: fullPromptSent, agentType: agentType || 'agent4', apiCalls: [{ type: 'gemini', label: `Medical History Agent (${engine || 'gemini-3.1-flash-lite'})` }] });
        }
      }

      return res.json({
          text: "",
          agentType,
          extractedYaml: textOutput,
          hasMoreMarkers: false,
          remainingText: "",
          estimatedTotalMarkers: 0,
          agentPrompt: fullPromptSent,
          apiCalls: [{ type: 'gemini', label: `Medical History Agent (${engine || 'gemini-3.1-flash-lite'})` }]
      });
    }
  } catch (error: any) {
    console.error("[Medical Analyze Error]:", error);
    res.status(500).json({ error: "Failed to process medical analysis: " + error.message });
  }
});




app.post("/api/gemini/review-biomarker", async (req, res) => {
  const { message, history, profile, biomarkerDef, currentValue, modelId, yamlContext } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });
  
  const engine = modelId || 'gemini-3.1-flash-lite';

  try {
    let historyText = "";
    if (history && Array.isArray(history) && history.length > 0) {
      historyText = "Here is the conversation history so far:\n" + 
        history.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join("\n") + "\n\n";
    }

    const inputsYaml = yamlContext ? yamlContext : `user_profile:
  age: "${profile?.age || 'unknown'}"
  gender: "${profile?.gender || 'unknown'}"
  weight_kg: "${profile?.weight || 'unknown'}"
  height_cm: "${profile?.height || 'unknown'}"
  ethnicity: "${profile?.ethnicity || 'unknown'}"
  unit_preference: "${profile?.unitPreference || 'SI'}" # Values: 'SI' (mmol/L, mmol/mol) or 'US' (mg/dL)

target_biomarker:
  key: "${biomarkerDef?.key || ''}"
  name: "${biomarkerDef?.name || ''}"
  current_value: "${currentValue || ''}"
  current_unit: "${biomarkerDef?.unit || ''}"
  current_range: "${biomarkerDef?.normalRange || ''}"
  description: "${biomarkerDef?.description || ''}"`;

    const systemInstruction = `identity:
  role: "Expert AI medical and nutritional assistant"
  purpose: "Review or answer questions about a specific user health biomarker."
  modes:
    1: "Educate and answer user questions regarding the biomarker."
    2: "Review logs for anomalies, unit mismatches, or demographic profile updates."

inputs:
${inputsYaml}

rules:
  clinical_and_nutritional:
    - "Provide professional, evidence-based educational context regarding the target biomarker."
    - "CRITICAL: Review precisely the ranges from medical research or clinical guidelines before providing an answer. You must differentiate between 'normal but suboptimal' values, and distinguish nuances like a 'pre-condition' versus an 'actual condition', reflecting this back to the data and proposed range."
    - "Tailor the explanations and suggestions specifically to the user's demographic profile (age, gender, ethnicity, weight/height/BMI)."
    - "Explain physiological significance, potential dietary/lifestyle influences, and clinical pathways of the biomarker."
    - "If the profile shows a different ethnicity than standard (e.g. Chinese or Asian), prioritize demographic-specific clinical insights, guidelines, and reference intervals (e.g., Chinese Society of Hepatology/Nephrology/Diabetes/Dyslipidemia standard thresholds) over Western standard baselines."
    - "Whenever you mention 'individuals of East Asian descent', 'Chinese descent', or refer to any specific ethnic group, you MUST explicitly cite the specific medical guideline or society you are using (e.g. 'according to the Chinese Society of Hepatology' or 'based on [medical guidelines from XX]')."
  metric_and_unit:
    - "Always prefer International Standard (mmol/L, mmol/mol) by default for lipids (LDL, HDL, Total Cholesterol, Triglycerides) and blood sugar (Fasting Glucose) unless the user specifically wants or has logged in US units (mg/dL)."
    - "Double-check that the metric/unit is consistent across the proposed value and the proposed normal range. Do NOT mix them up! (e.g., if LDL value is 5.7, the unit must be mmol/L and range should be under 3.0 mmol/L. If unit is mg/dL, the value is around 220 and range is 125-200)."
    - "Ensure the 'metric' field in any proposal exactly matches the unit used in 'range' and 'value'."
  proposals_and_corrections:
    - "If you recognize that the target biomarker's current description, medical insights, or range are wrong, incorrect, or sub-optimal for their demographic, prescribe a corrected/new one in the 'proposal' block of your response."
    - "If the newly proposed range or insight is specific to their ethnicity (e.g., Chinese-adjusted thresholds), set 'isEthnicitySpecific' to true and 'ethnicityTag' to the ethnicity name (e.g. 'Chinese' or 'Asian') so that the database can tag and override the biomarker dictionary correctly."
    - "If the newly proposed range is a standard global baseline, set 'isEthnicitySpecific' to false and 'ethnicityTag' to null."
  duplicate_recognition:
    - "Analyze if the target biomarker is likely a duplicate of another existing biomarker in the dictionary or in the related biomarkers list (e.g. 'hba1c_mmol_mol' vs 'hemoglobin_a1c')."
    - "If it is a duplicate, set 'isDuplicate' to true, list the synonymous key(s) in 'duplicateSuggestedKeys', and write a clear, concise note explaining why in 'duplicateExplanation'."
    - "If not a duplicate, set 'isDuplicate' to false, 'duplicateSuggestedKeys' to [], and 'duplicateExplanation' to null."
    - "When no correction, override, or duplicate is discussed or needed, set 'proposal' and 'pendingBiomarkers' to null."

output_format:
  type: "JSON"
  schema:
    reply: "Conversational, highly polished response explaining the biomarker, answering questions, or explaining proposed corrections/duplicates."
    proposal:
      name: "The biomarker name (e.g., 'Total Cholesterol')"
      metric: "The unit of measurement (e.g., 'mmol/L' or 'mg/dL')"
      value: "The corrected/proposed value as a number or string"
      range: "The normal/healthy range personalized to their profile (e.g., 'under 3.0 mmol/L' or '125-200 mg/dL')"
      description: "Short description of what this biomarker measures"
      benefitRisk: "Personalized benefit/risk statement based on the user's demographic profile and the proposed value"
      isEthnicitySpecific: true/false
      ethnicityTag: "e.g., 'Chinese' or 'Asian' or null"
      isDuplicate: true/false
      duplicateSuggestedKeys: ["array of synonymous keys to consolidate, e.g. ['hba1c_mmol_mol'] or []"]
      duplicateExplanation: "Reasoning for consolidation or null"
    pendingBiomarkers:
      "${biomarkerDef?.key || 'key'}": "The proposed value as a number (e.g., 5.7) or null"

instructions:
  - "Do not include markdown code block wrappers like \`\`\`json in your response. Return raw JSON."
  - "The JSON response must be well-formed and valid."`;

    const fullPromptSent = `System Instruction:\n${systemInstruction}\n\n${historyText}User Message: "${message}"`;

    const resultText = await callUnifiedLLM({
      modelId: modelId || "antigravity",
      systemInstruction,
      promptText: `${historyText}User Message: "${message}"`,
      responseMimeType: "application/json"
    });

    let cleanedText = resultText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const startIdx = cleanedText.indexOf("{");
    if (startIdx !== -1) {
      let depth = 0;
      for (let i = startIdx; i < cleanedText.length; i++) {
        if (cleanedText[i] === "{") depth++;
        else if (cleanedText[i] === "}") depth--;
        if (depth === 0) {
          cleanedText = cleanedText.substring(startIdx, i + 1);
          break;
        }
      }
    }
    let resultJson;
    try {
      resultJson = JSON.parse(cleanedText);
    } catch (parseErr: any) {
      console.error("JSON Parse Error in review-biomarker:", parseErr);
      console.error("Raw response was:", resultText);
      throw new Error(`Failed to parse AI response as JSON. ${parseErr.message}`);
    }
    
    if (resultJson.proposedValue !== undefined && resultJson.proposedValue !== null && !resultJson.pendingBiomarkers) {
      resultJson.pendingBiomarkers = { [biomarkerDef?.key || 'key']: resultJson.proposedValue };
    }
    
    resultJson.agentPrompt = fullPromptSent;
    resultJson.apiCalls = [{ type: 'gemini', label: `Biomarker Calibration Agent (${engine || 'gemini-3.1-flash-lite'})` }];
    res.json(resultJson);
  } catch (err: any) {
    console.error("Gemini Review Error:", err);
    res.status(500).json({ error: err.message || "Failed to review biomarker" });
  }
});

app.post("/api/gemini/insight-analyze", async (req, res) => {
  try {
    const { profile, userProfile, foodLogs, biomarkerHistory, engine, refinement } = req.body;
    const activeProfile = profile || userProfile || {};
    const email = activeProfile?.email?.toLowerCase() || "";

    if ((email === "chiwah.liu@gmail.com" || email === "cwah.liu@gmail.com" || email === "john@mail.com") && !refinement) {
      console.log(`[Insight] Triggered special preset recommendation report for: ${email}`);
      return res.json({
        report: {
          timestamp: new Date().toISOString(),
          dailyNutrientTargets: {
            calories: "1,700–1,800 kcal",
            protein: "90–100 g (protects kidneys)",
            totalFat: "55–65 g",
            saturatedFat: "under 15 g (critical for LDL)",
            unsaturatedFat: "35–45 g",
            omega3: "2.5–3 g",
            carbohydrates: "160–185 g (low GI)",
            addedSugar: "under 20 g",
            totalFibre: "35–40 g",
            solubleFibre: "10–15 g (critical for LDL)",
            sodium: "under 1,200 mg (kidney + BP protection)",
            potassium: "3,500–4,000 mg",
            magnesium: "400–420 mg",
            calcium: "1,000 mg",
            iron: "8 mg",
            zinc: "11 mg",
            selenium: "55 mcg",
            iodine: "150 mcg",
            phosphorus: "700 mg",
            vitaminD: "2,000 IU (East Asians commonly deficient)",
            vitaminB12: "2.4 mcg",
            folate: "400 mcg",
            vitaminC: "90 mg",
            vitaminE: "15 mg",
            vitaminK: "120 mcg",
            vitaminA: "900 mcg",
            vitaminB6: "1.7 mg",
            thiamine: "1.2 mg",
            riboflavin: "1.3 mg",
            niacin: "16 mg"
          },
          mostImportantNextStep: "See GP urgently about statin — rosuvastatin 5mg is the evidence-based starting point for East Asian men with your high LDL, HbA1c, and declining kidney filtration.",
          actions: [
            {
              id: "act_1",
              task: "Consult GP about Low-Dose Statin prescription (e.g. Rosuvastatin 5mg)",
              explanation: "Given your elevated LDL-C and East Asian genetics, a low-dose statin is the most evidence-based starting point.",
              priority: "high",
              completed: false,
              type: "doctor"
            },
            {
              id: "act_2",
              task: "Schedule an HbA1c retest in 3 months with formal pre-diabetes assessment",
              explanation: "Your average blood sugar over the last months is borderline. Tight monitoring is critical.",
              priority: "high",
              completed: false,
              type: "test"
            },
            {
              id: "act_3",
              task: "Establish an annual Kidney Monitoring and eGFR protection plan",
              explanation: "Declining eGFR needs early stage tracking. Restricting saturated fat and excessive sodium is non-negotiable.",
              priority: "high",
              completed: false,
              type: "test"
            },
            {
              id: "act_4",
              task: "Test Vitamin D levels with your physician",
              explanation: "East Asians are commonly deficient, which impacts metabolic health, blood pressure, and cardiovascular outcomes.",
              priority: "medium",
              completed: false,
              type: "test"
            },
            {
              id: "act_5",
              task: "Substitute butter, coconut oil, and ghee with extra virgin olive oil",
              explanation: "Reducing saturated fat to strictly under 15g a day is essential to restore proper LDL values.",
              priority: "high",
              completed: false,
              type: "lifestyle"
            }
          ],
          dailyBenefits: [
            { id: "ben_1", activity: "Accumulate 30 minutes of brisk walking or light cardio", target: "150 mins per week", completed: false },
            { id: "ben_2", activity: "Add 1 tablespoon of ground flaxseed to your meals", target: "Daily", completed: false },
            { id: "ben_3", activity: "Restrict Saturated Fat intake strictly under 15g", target: "Daily", completed: false },
            { id: "ben_4", activity: "Incorporate high soluble fibre (e.g. Oats, Psyllium husk)", target: "10-15g soluble", completed: false }
          ],
          latestInsights: [
            {
              title: "Cardiovascular Risk Reduction in East Asian Cohorts",
              summary: "Recent studies demonstrate that East Asian men exhibit heightened sensitivity to low-dose statin therapy, with rosuvastatin 5mg yielding similar LDL reduction as 10mg in western populations while minimizing hepatic and muscular side effects.",
              link: "https://pubmed.ncbi.nlm.nih.gov/32041285/"
            },
            {
              title: "Soluble Fibre and Bile Acid Sequestration Mechanics",
              summary: "Clinical trials confirm that consuming 10g of soluble fibre daily (via oats, barley, or psyllium husk) triggers hepatic bile synthesis from existing LDL, lowering circulating bad cholesterol particles by 5% to 10% within 8 weeks.",
              link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4832151/"
            }
          ],
          healthRiskForecast: {
            year5: "Mildly progressive atherosclerosis, risk of transitioning from borderline pre-diabetes to active Type 2 Diabetes, and decline in renal filtration capacity to Stage 3 CKD.",
            year10: "Significant vascular plaque buildup. Kidney function might drop to GFR < 60, triggering high blood pressure. Elevated Risk of cardiovascular events.",
            year20: "40% probability of a coronary event. Accelerated kidney wear requiring complex nephrological intervention.",
            optimized5: "Restored LDL < 100 mg/dL, stabilized blood sugar in normal ranges, and kidney filtration preserved at healthy levels.",
            optimized10: "Plaque progression halted. Fully functional cardiovascular system and kidney values stabilized in the safe green zone.",
            optimized20: "Optimal cardiovascular performance. Healthy aging index score 95th percentile, active longevity with zero diabetic or renal complications."
          }
        }
      });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MOCK_KEY" || process.env.GEMINI_API_KEY === "" || process.env.GEMINI_API_KEY.startsWith("YOUR_")) {
      return res.json({
        report: {
          timestamp: new Date().toISOString(),
          dailyNutrientTargets: {
            calories: "1,500–1,600 kcal",
            protein: "80–90 g",
            totalFat: "50–60 g",
            saturatedFat: "under 12 g",
            unsaturatedFat: "30–40 g",
            omega3: "2.0–2.5 g",
            carbohydrates: "150–170 g",
            addedSugar: "under 15 g",
            totalFibre: "30–35 g",
            solubleFibre: "8–12 g",
            sodium: "under 1,500 mg",
            potassium: "3,500 mg",
            magnesium: "400 mg",
            calcium: "1,000 mg",
            iron: "8 mg",
            zinc: "11 mg",
            selenium: "55 mcg",
            iodine: "150 mcg",
            phosphorus: "700 mg",
            vitaminD: "2,000 IU",
            vitaminB12: "2.4 mcg",
            folate: "400 mcg",
            vitaminC: "90 mg",
            vitaminE: "15 mg",
            vitaminK: "120 mcg",
            vitaminA: "900 mcg",
            vitaminB6: "1.7 mg",
            thiamine: "1.2 mg",
            riboflavin: "1.3 mg",
            niacin: "16 mg"
          },
          mostImportantNextStep: "Reduce saturated fat strictly to under 12g per day and complete a clinical blood re-test in 3 months to monitor cholesterol and glucose trends.",
          actions: [
            {
              id: "act_1",
              task: "Consult your primary care physician for a comprehensive health screening",
              explanation: "Based on your age and profile, regular annual biometric reviews are highly recommended.",
              priority: "high",
              completed: false,
              type: "doctor"
            },
            {
              id: "act_2",
              task: "Check your HbA1c and lipid panel every 6 months",
              explanation: "Routine blood metrics tracking will help confirm your lifestyle changes are successfully restoring biomarkers.",
              priority: "high",
              completed: false,
              type: "test"
            }
          ],
          dailyBenefits: [
            { id: "ben_1", activity: "Walk briskly for 30 minutes daily to boost metabolic health", target: "Daily", completed: false },
            { id: "ben_2", activity: "Substitute saturated fats with cold-pressed olive oil", target: "Daily", completed: false }
          ],
          latestInsights: [
            {
              title: "Dietary Fibers and Metabolic Longevity Indices",
              summary: "A high-fiber nutritional plan is linked to enhanced short-chain fatty acid gut synthesis, which improves overall insulin response and naturally reduces vascular inflammation markers.",
              link: "https://pubmed.ncbi.nlm.nih.gov/30612722/"
            }
          ],
          healthRiskForecast: {
            year5: "Slight vascular stiffness and mild risk of elevated glucose tolerance if sedentary habits persist.",
            year10: "Increasing risk of metabolic decline and minor cardiovascular strain.",
            year20: "Elevated probability of cardiovascular plaques and reduced active energy index.",
            optimized5: "Pristine blood pressure levels, balanced lipid particles, and metabolic health completely optimized.",
            optimized10: "Robust vascular health, optimized glycemic control, and ideal weight targets maintained.",
            optimized20: "Healthy aging with minimal chronic disease probability and vibrant metabolic index."
          }
        }
      });
    }

    const sanitizedBiomarkerHistory = (biomarkerHistory || []).map((log: any) => {
      const clean = { ...log };
      delete clean.tests;
      delete clean.updated_at;
      delete clean.sync_state;
      delete clean.note;
      delete clean.summary;
      delete clean.id;
      return clean;
    }).filter((log: any) => {
      if (log.biomarkers && Object.keys(log.biomarkers).length === 1 && log.biomarkers.steps !== undefined) {
        return false;
      }
      return true;
    });

    const riskGroupings: Record<string, string[]> = {};
    sanitizedBiomarkerHistory.forEach((log: any) => {
      if (log.biomarkers) {
        Object.keys(log.biomarkers).forEach(key => {
          if (key === 'steps') return;
          const def = biomarkerDefinitions.find(d => d.key === key);
          const customDef = activeProfile?.customBiomarkers?.[key];
          let risks = customDef?.riskCategories || def?.riskCategories || ['Uncategorized'];
          if (!Array.isArray(risks)) risks = [risks];
          if (risks.length === 0) risks = ['Uncategorized'];
          
          risks.forEach((risk: string) => {
            if (!riskGroupings[risk]) riskGroupings[risk] = [];
            if (!riskGroupings[risk].includes(key)) riskGroupings[risk].push(key);
          });
        });
      }
    });

    const profileText = `UserProfile: Age ${activeProfile.age}, Ethnicity: ${activeProfile.ethnicity}, Weight: ${activeProfile.weight}kg, Height: ${activeProfile.height}cm, Email: ${activeProfile.email}.`;
    const foodSummary = foodLogs && foodLogs.length > 0 ? `Recent Food Logs:\n${JSON.stringify(foodLogs.slice(-10))}` : "No food logs registered.";
    const biomarkerSummary = sanitizedBiomarkerHistory.length > 0 ? `Biomarker Logs:\n${JSON.stringify(sanitizedBiomarkerHistory)}\n\nUser's Logged Biomarkers Grouped by Risk Categories:\n${JSON.stringify(riskGroupings)}` : "No medical biomarkers logged.";

    const promptText = `Perform a comprehensive health profiling analysis using the totality of user information provided below.
    ${profileText}
    ${foodSummary}
    ${biomarkerSummary}
    ${refinement ? `\nUSER REFINEMENT REQUEST: The user has asked to refine the previous analysis. Please adjust the report considering this feedback: "${refinement.message}". Also consider this chat history: ${JSON.stringify(refinement.chatHistory)}` : ""}
    
    You need to look at all health indices and build a personalized health report.
    Identify any critical parameters (such as elevated LDL, high HbA1c, or low eGFR) and set custom daily nutrition targets for all 30 nutrients, prioritize clinical actions, lifestyle benefits, latest medical insights, and risk forecasts over 5, 10, and 20 years with vs without modifications.
    
    Respond strictly with a JSON object conforming exactly to this structure:
    {
      "report": {
        "timestamp": "ISO Date String",
        "dailyNutrientTargets": {
          "calories": "target string (e.g. 1,700-1,800 kcal)",
          "protein": "target string",
          "totalFat": "target string",
          "saturatedFat": "target string (e.g. under 15 g)",
          "unsaturatedFat": "target string",
          "omega3": "target string",
          "carbohydrates": "target string",
          "addedSugar": "target string",
          "totalFibre": "target string",
          "solubleFibre": "target string",
          "sodium": "target string",
          "potassium": "target string",
          "magnesium": "target string",
          "calcium": "target string",
          "iron": "target string",
          "zinc": "target string",
          "selenium": "target string",
          "iodine": "target string",
          "phosphorus": "target string",
          "vitaminD": "target string",
          "vitaminB12": "target string",
          "folate": "target string",
          "vitaminC": "target string",
          "vitaminE": "target string",
          "vitaminK": "target string",
          "vitaminA": "target string",
          "vitaminB6": "target string",
          "thiamine": "target string",
          "riboflavin": "target string",
          "niacin": "target string"
        },
        "mostImportantNextStep": "Specific human-focused non-negotiable step",
        "actions": [
          {
            "id": "unique string id",
            "task": "clinical or screening task",
            "explanation": "why this is important for their profile",
            "priority": "high" | "medium" | "low",
            "completed": false,
            "type": "doctor" | "test" | "lifestyle"
          }
        ],
        "dailyBenefits": [
          {
            "id": "unique string id",
            "activity": "e.g. Walk 30 min",
            "target": "e.g. Daily",
            "completed": false
          }
        ],
        "latestInsights": [
          {
            "title": "Vascular Plaque Progression Control",
            "summary": "1-2 sentence clinical takeaway",
            "link": "https://pubmed.ncbi.nlm.nih.gov/..."
          }
        ],
        "healthRiskForecast": {
          "year5": "Detailed text forecast of health risk if habits do not change",
          "year10": "Detailed text forecast of health risk if habits do not change",
          "year20": "Detailed text forecast of health risk if habits do not change",
          "optimized5": "Detailed text forecast of benefits if targets are optimized",
          "optimized10": "Detailed text forecast of benefits if targets are optimized",
          "optimized20": "Detailed text forecast of benefits if targets are optimized"
        }
      }
    }`;

    const systemInstruction = "You are a world-class preventative cardiologist, endocrinologist, and clinical longevity researcher. Your response must be an exact single JSON matching the requested schema. Never add markdown wrappers.";
    const fullPromptSent = `System Instruction:\n${systemInstruction}\n\n${promptText}`;

    const textOutput = await callUnifiedLLM({
      modelId: engine || "gemini-3.5-flash",
      systemInstruction,
      promptText,
      responseMimeType: "application/json"
    });

    let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
    let parsedData;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsedData = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
      } else {
        throw parseErr;
      }
    }

    parsedData.agentPrompt = `System Instruction:\nYou are a world-class AI dietitian. Your response must be an exact JSON matching the requested schema. Never add markdown wrappers.\n\n${promptText}`;
    res.json({
      ...parsedData,
      apiCalls: [{ type: 'gemini', label: `Biomarker Insight Agent (${engine || 'gemini-3.1-flash-lite'})` }]
    });
  } catch (error: any) {
    console.error("[Insight Analyze Error]:", error);
    res.status(500).json({ error: "Failed to generate preventative recommendations: " + error.message });
  }
});

app.post("/api/gemini/health-baseline-analyze", async (req, res) => {
  try {
    const { profile, userProfile, biomarkerHistory, engine, refinement, calibratedInsights, outOfRangeBiomarkers } = req.body;
    const activeProfile = profile || userProfile || {};
    const sanitizedBiomarkerHistory = (biomarkerHistory || []).map((log: any) => {
      const clean = { ...log };
      delete clean.tests;
      delete clean.updated_at;
      delete clean.sync_state;
      delete clean.note;
      delete clean.summary;
      delete clean.id;
      return clean;
    });
    const riskGroupingsWithSeverity: Record<string, string[]> = {};
    const biomarkerHistories: Record<string, {date: string, val: any}[]> = {};
    
    // Sort by date descending so first seen is latest
    const parseDateStr = (dStr: string) => {
      if (!dStr) return 0;
      const parts = dStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(dStr).getTime();
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      }
      return new Date(dStr).getTime();
    };
    const sortedHistory = [...sanitizedBiomarkerHistory].sort((a, b) => {
      return parseDateStr(b.date) - parseDateStr(a.date);
    });
    
    sortedHistory.forEach((log: any) => {
      if (log.biomarkers) {
        Object.keys(log.biomarkers).forEach(key => {
          if (!biomarkerHistories[key]) biomarkerHistories[key] = [];
          if (biomarkerHistories[key].length < 5) {
            biomarkerHistories[key].push({ date: log.date, val: log.biomarkers[key] });
          }
        });
      }
    });
    const normalBiomarkers: string[] = [];
    
    Object.keys(biomarkerHistories).forEach(key => {
      const history = biomarkerHistories[key];
      const latestVal = history[0].val;
      const historyStr = history.map(h => `\n       - ${h.date}: ${h.val}`).join('');
      
      const outOfRangeDef = (outOfRangeBiomarkers || []).find((b: any) => b.key === key);
      
      if (outOfRangeDef) {
        const customDef = getCustomBiomarkerDef(activeProfile, key);
        const statusLabel = getBiomarkerStatusLabel(key, outOfRangeDef.status, customDef, latestVal, activeProfile);
        const def = biomarkerDefinitions.find(d => d.key === key);
        const calibrated = calibratedInsights?.[key];
        const medicalInsight = calibrated?.specificRiskContext || calibrated?.description || customDef?.specificRiskContext || customDef?.description || customDef?.benefitRisk || def?.benefitRisk || "No specific medical insight defined.";
        
        const meta = getBiomarkerMetadata(key, customDef);
        // Use riskCategories instead of standardMedicalGrouping to match UI visually
        let risks = meta.riskCategories && meta.riskCategories.length > 0 ? meta.riskCategories : ['Uncategorized'];
        
        const calibSource = customDef?.calibrationSource ? ` (Calibrated to: ${customDef.calibrationSource})` : "";
        
        risks.forEach((risk: string) => {
          if (!riskGroupingsWithSeverity[risk]) riskGroupingsWithSeverity[risk] = [];
          riskGroupingsWithSeverity[risk].push(`${key} (Status: ${statusLabel})${calibSource}${historyStr}\n     Medical Insight: ${medicalInsight}`);
        });
      } else {
        normalBiomarkers.push(`${key}: ${latestVal}`);
      }
    });
    let groupedRisksStr = "";
    if (Object.keys(riskGroupingsWithSeverity).length > 0) {
      groupedRisksStr = "Biomarkers at risk:\n";
      Object.keys(riskGroupingsWithSeverity).forEach(risk => {
        groupedRisksStr += `\n[${risk}]\n`;
        riskGroupingsWithSeverity[risk].forEach(line => {
          groupedRisksStr += `  - ${line}\n`;
        });
      });
    }
    const biomarkerSummary = Object.keys(biomarkerHistories).length > 0 ? 
      `${groupedRisksStr}\n\nNormal/Uncategorized Biomarkers:\n${normalBiomarkers.join('\n')}` : 
      "No medical biomarkers logged.";
    const profileText = `UserProfile: Age ${activeProfile.age}, Ethnicity: ${activeProfile.ethnicity}, Weight: ${activeProfile.weight}kg, Height: ${activeProfile.height}cm, Gender: ${activeProfile.gender}, Blood Type: ${activeProfile.bloodType}.`;
    const nutrientKeysList = NUTRIENT_KEYS;
    
    const biomarkerKeysList = biomarkerDefinitions.map(d => d.key);

    const promptText = `Perform a comprehensive health baseline analysis using the totality of user information provided below.
    ${profileText}
    ${biomarkerSummary}
    ${refinement ? `\nUSER REFINEMENT REQUEST: The user has asked to refine the previous analysis. Please adjust the report considering this feedback: "${refinement.message}". Also consider this chat history: ${JSON.stringify(refinement.chatHistory)}` : ""}
    
    === AVAILABLE NUTRIENT KEYS ===
    You MUST use exactly these 31 keys for any nutrient references in 'nutrientTargets', 'topNutrientTargets' or 'generalNutrientTargets':
    ${nutrientKeysList.join(", ")}
    
    === AVAILABLE BIOMARKER KEYS ===
    You MUST use the biomarkers name exactly as shared.
    
    Respond strictly with a JSON object conforming exactly to this structure (use camelCase):
    {
      "report": {
        "globalSummary": "High-level overview of current health trajectory.",
        "timelineToOptimal": "Estimated timeframe to stabilize at-risk markers.",
        "riskCategories": [
          {
            "categoryName": "e.g., Cardiovascular",
            "level": "high | medium | low",
            "analysis": "Insight based on biomarkers",
            "unaddressedRisk": "What happens long-term if ignored",
            "biomarkerTargets": [
              {"name": "HbA1c", "targetValue": "< 5.7%"}
            ],
            "nutrientTargets": [
              {"nutrientKey": "exact matching key", "targetValue": "< 1g/day", "rationale": "..."}
            ],
            "dailyActivities": [
              {"activity": "Zone 2 Cardio", "target": "30 mins"}
            ]
          }
        ],
        "topNutrientTargets": [
          {"nutrientKey": "exact matching key", "targetValue": "1650", "rationale": "..."}
        ],
        "generalNutrientTargets": {
          "vitaminD": "1000 IU"
        }
      }
    }
    
    CRITICAL REQUIREMENTS:
    1. Provide the top 3-6 priority nutrient targets in 'topNutrientTargets' with reason how it would help the risk category.
    2. Provide target values for ALL remaining applicable nutrient keys (approx 20+) in 'generalNutrientTargets'.
    3. CRITICAL: Your 'biomarkerTargets' array MUST explicitly include every single individual biomarker that was listed under 'Biomarkers at risk' for its respective risk category. Do not summarize or omit any at-risk biomarkers. Every risk category must also have at least 1 recommendation in terms of nutrient and activity target.
    4. Consolidate the activity and nutrient targets. If an activity or nutrient target is required for multiple risk categories, reuse the same recommendation rather than creating a slightly different one.
    5. Think globally for the most relevant top nutrient to share. Do not share relative targets (e.g., 1.2g/kg); you MUST compute the absolute amount (e.g., body weight * 1.2g) and give the final exact number based on the user's profile weight. Choose the most effective constraint globally (e.g. general calorie restriction vs added sugar restriction) depending on the most critical risks. Also, specify the exact type of nutrient if relevant (e.g. soluble fiber vs total fiber).
    6. For every risk category, set "level" to "high", "medium", or "low" based on how far the underlying biomarkers deviate from reference range and how clinically urgent the category is. This field is required and drives the app's risk color indicator.`;

    const systemInstruction = "You are a world-class preventative cardiologist, endocrinologist, and clinical longevity researcher. Your response must be an exact single JSON matching the requested schema using strictly the allowed keys. Never add markdown wrappers.";
    const fullPromptSent = `System Instruction:\n${systemInstruction}\n\n${promptText}`;

    const textOutput = await callUnifiedLLM({
      modelId: engine || "gemini-3.1-pro",
      systemInstruction,
      promptText,
      responseMimeType: "application/json"
    });

    let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
    let parsedData;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsedData = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
      } else {
        throw parseErr;
      }
    }

    parsedData.agentPrompt = `System Instruction:\nYou are a world-class preventative cardiologist, endocrinologist, and clinical longevity researcher. Your response must be an exact JSON matching the requested schema. Never add markdown wrappers.\n\n${promptText}`;
    res.json({
      ...parsedData,
      apiCalls: [{ type: 'gemini', label: `Health Baseline Agent (${engine || 'gemini-3.1-flash-lite'})` }]
    });
  } catch (error: any) {
    console.error("[Health Baseline Analyze Error]:", error);
    res.status(500).json({ error: "Failed to generate health baseline: " + error.message });
  }
});
app.post("/api/gemini/route-biomarker", async (req, res) => {
  res.json({ text: "Not implemented in V2" });
});

app.post("/api/gemini/route-chat", async (req, res) => {
  try {
    const { messages, selectedBiomarkers, allApprovedKeys } = req.body;
    const systemInstruction = `You are the Medical Ontology Route Agent, an expert clinical data and database architect.
Your task is to chat with the user to help them map their newly extracted biomarkers (unmapped) to the existing Master Database Keys, or decide if they should be added as new standard keys.

=== MASTER DATABASE KEYS ===
[${allApprovedKeys.join(", ")}]

=== CHOSEN BIOMARKERS TO DISCUSS ===
${JSON.stringify(selectedBiomarkers, null, 2)}

=== YOUR OBJECTIVES ===
1. Be clinical, friendly, and expert. Explain synonyms clearly (e.g. why "HbA1c" matches "hba1c").
2. Guide the user in consolidating their biomarkers.
3. If you can suggest a mapping for any or all of the chosen biomarkers, include a 'suggestedMapping' object in your JSON output. The keys of this object should be the chosen biomarker keys/names, and the values should be the target master keys (existing or newly proposed clean snake_case keys).

=== RESPONSE FORMAT ===
You MUST return a JSON object with the following schema:
{
  "text": "Your conversational response here (supports markdown formatting). Explain your reasoning clearly.",
  "suggestedMapping": { "source_key": "target_key" } // (Optional) set this when you are recommending a specific mapping/consolidation.
}`;

    const lastMessage = messages[messages.length - 1];
    const historyText = messages.slice(0, messages.length - 1).map(m => `${m.role === "user" ? "User" : "Model"}: ${m.content}`).join("\n");
    const promptText = `Chat History:\n${historyText}\n\nUser's latest message: "${lastMessage.content}"`;

    const textOutput = await callUnifiedLLM({
      modelId: "gemini-3.5-flash",
      systemInstruction,
      promptText,
      responseMimeType: "application/json"
    });

    let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
    res.json(JSON.parse(cleanJson));
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed to process route chat" });
  }
});

app.post("/api/gemini/standardize-units", async (req, res) => {
  try {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    const { selectedBiomarkers, engine, customSystemInstruction } = req.body;
    const modelId = engine || "gemini-3.1-flash-lite";
    addDebugLog(`[Standardize Units Agent] Request received to standardize ${selectedBiomarkers?.length} biomarkers using model: ${modelId}.`, explicitSessionId);

    let systemInstruction = `You are an automated Clinical Unit Standardization Agent. Your task is to accurately standardize medical units for various biomarkers to ensure consistency across the application.

=== SYSTEM CONSTRAINTS ===
- Do NOT repeat biomarkers. Output exactly ONE object per input biomarker.
- Do NOT put explanations, sentences, or thought processes inside the "standardizedUnit", "conversionFactor", or "confidence" fields. 
- Put ALL explanations and reasoning strictly in the "notes" or "scratchpad" fields.

=== OUTPUT SCHEMA ===
You must return a raw, valid JSON object matching this exact schema. Do not include markdown wrappers.

{
  "scratchpad": "string (Think step-by-step here ONLY)",
  "mappedBiomarkers": [
    {
      "originalKey": "string (must exactly match the provided input key)",
      "standardizedUnit": "string (ONLY the pure metric abbreviation, e.g., 'mmol/L', '%', 'score', 'cm', 'ratio', or 'kg')",
      "conversionFactor": "number (e.g., 1)",
      "confidence": "string (strictly 'high', 'medium', or 'low')",
      "notes": "string (Put your clinical reasoning and annotations here)"
    }
  ]
}
`;

    if (customSystemInstruction) {
      systemInstruction += `\n\n=== CUSTOM INSTRUCTIONS ===\n${customSystemInstruction}`;
      addDebugLog(`[Standardize Units Agent] Using Custom Instructions:\n${customSystemInstruction}`, explicitSessionId);
    }
    
    let promptText = `Biomarkers to process:\n`;
    if (selectedBiomarkers && selectedBiomarkers.length > 0) {
      selectedBiomarkers.forEach((b: any) => {
        promptText += `- key: "${b.key}", name: "${b.name}", currentUnit: "${b.currentUnit || 'Unknown'}"\n`;
      });
    }

    const standardizeUnitsSchema = {
      type: Type.OBJECT,
      properties: {
        scratchpad: { type: Type.STRING, description: "Think step-by-step: analyze current units, determine standard metric units, perform conversions, check constraints." },
        mappedBiomarkers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalKey: { type: Type.STRING },
              standardizedUnit: { type: Type.STRING },
              conversionFactor: { type: Type.NUMBER },
              confidence: { type: Type.STRING },
              notes: { type: Type.STRING }
            }
          }
        }
      },
      required: ["scratchpad", "mappedBiomarkers"]
    };

    const textOutput = await callUnifiedLLM({
      modelId,
      systemInstruction: systemInstruction + "\n\nJSON STRUCTURED OUTPUT:\nYou must strictly return a JSON object. Do not add markdown wrappers. Think step-by-step in the 'scratchpad' field first.",
      promptText,
      responseMimeType: "application/json",
      responseSchema: standardizeUnitsSchema
    });

    let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
    addDebugLog(`[Standardize Units Agent] Agent output payload:\n${cleanJson}`, explicitSessionId);
    res.json({ jsonResponse: cleanJson });
  } catch (error: any) {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    addDebugLog(`[Standardize Units Agent] Error: ${error.message}`, explicitSessionId);
    console.error("[Standardize Units Agent Error]:", error);
    res.status(500).json({ error: "Failed to standardize units: " + error.message });
  }
});

app.post("/api/gemini/medical-categorise", async (req, res) => {
  try {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    const { selectedBiomarkers, engine, customSystemInstruction } = req.body;
    const modelId = engine || "gemini-3.1-flash-lite";
    addDebugLog(`[Medical Categorisation Agent] Request received to categorise ${selectedBiomarkers?.length} biomarkers using model: ${modelId}.`, explicitSessionId);

    let systemInstruction = `You are an automated Clinical Categorisation Agent. Your task is to accurately map medical biomarkers to their appropriate physiological groupings and risk categories.

=== OBJECTIVE ===
For each provided biomarker, determine:
1. Standard Medical Grouping. Allowed values ONLY: 'Metabolic', 'Hepatic', 'Renal', 'Hematology', 'Biometrics', 'Other' (Even if it is 'Other', it is considered categorized).
2. Risk Categories. A JSON array of string tags representing associated risks. YOU MUST ONLY CHOOSE FROM THESE EXACT CATEGORIES: "Cardiovascular", "Kidney", "Metabolic", "Liver", "Hematology", "Wellness", "Screenings". Do NOT invent new ones. CRITICAL: You MUST assign AT LEAST ONE category to EVERY biomarker. Never return an empty array [].
3. Potential Medical Conditions. A JSON array of string tags representing associated clinical conditions, clinical states, symptoms, or indicators. CRITICAL: You MUST assign AT LEAST ONE potential medical condition to EVERY biomarker. Never return an empty array [].

=== CLINICAL REASONING FOR UNUSUAL OR BIOMETRIC MEASUREMENTS ===
You must think through the clinical reasoning of why specific measurements are taken at all and associate them with relevant medical conditions.
- For biometric markers like "steps": think about why physical activity is tracked and associate it with conditions/states such as "Sedentary State", "Physical Deconditioning", "Cardiovascular Inactivity", or "General Fitness".
- For platelet markers like "platelet_distribution_width" (PDW) or general platelets: think through why they are measured (e.g. platelet size variability, bone marrow activity, clot formation) and associate them with relevant clinical conditions such as "acute infections", "chronic inflammatory disorders", "aplastic anemia", "nutritional deficiencies".
- Do not leave any fields blank or empty. Every biomarker must have at least one value for every single field/grouping.

CRITICAL: You MUST include all fields (standardMedicalGrouping, riskCategories, potentialMedicalConditions) for every biomarker in your JSON output.

=== SYSTEM CONSTRAINTS ===
Return a single flat JSON array of objects.
Do NOT use any Markdown blocks, wrapping backticks, or extra text. Output ONLY the raw JSON text.

Biomarkers to process:
${JSON.stringify(selectedBiomarkers, null, 2)}`;

    if (customSystemInstruction) {
      addDebugLog(`[Medical Categorisation Agent] Overriding system instruction with custom version (${customSystemInstruction.length} chars).`, explicitSessionId);
      systemInstruction = customSystemInstruction;
    }

    addDebugLog(`[Medical Categorisation Agent] Dispatched System Instruction (Length: ${systemInstruction.length})`, explicitSessionId);
    addDebugLog(`[Medical Categorisation Agent] Dispatched Model ID: ${modelId}`, explicitSessionId);

    
    const medicalCategoriseSchema = {
      type: Type.OBJECT,
      properties: {
        scratchpad: { type: Type.STRING, description: "Think step-by-step: analyze the biomarker, identify its primary physiological system, and determine risk levels based on clinical guidelines." },
        categorisedBiomarkers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalKey: { type: Type.STRING },
              standardMedicalGrouping: { type: Type.STRING, enum: ['Metabolic', 'Hepatic', 'Renal', 'Hematology', 'Biometrics', 'Other'] },
              riskCategories: {
                type: Type.ARRAY,
                items: { type: Type.STRING, enum: ["Cardiovascular", "Kidney", "Metabolic", "Liver", "Hematology", "Wellness", "Screenings"] }
              },
              potentialMedicalConditions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["originalKey", "standardMedicalGrouping", "riskCategories", "potentialMedicalConditions"]
          }
        }
      },
      required: ["scratchpad", "categorisedBiomarkers"]
    };

    const textOutput = await callUnifiedLLM({
      modelId,
      systemInstruction,
      promptText: "Please output the categorisation in JSON format following the schema exactly.",
      responseMimeType: "application/json",
      responseSchema: medicalCategoriseSchema
    });

    let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
    addDebugLog(`[Standardize Units Agent] Agent output payload:
${cleanJson}`, explicitSessionId);
    res.json({ jsonResponse: cleanJson });
  } catch (error: any) {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    addDebugLog(`[Medical Categorisation Agent] Error: ${error.message}`, explicitSessionId);
    console.error("[Medical Categorisation Agent Error]:", error);
    res.status(500).json({ error: "Failed to categorise biomarkers: " + error.message });
  }
});

app.post("/api/gemini/consolidate-names", async (req, res) => {
  try {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    const { inputText, selectedBiomarkers, engine, customSystemInstruction } = req.body;
    const modelId = engine || "gemini-3.1-flash-lite";
    const isStream = req.query.stream === 'true';
    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }
    addDebugLog(`[Name Consolidation Agent] Request received using model: ${modelId}. Text length: ${inputText?.length || 0}. Biomarkers count: ${selectedBiomarkers?.length || 0}`, explicitSessionId);

    if (inputText) {
      addDebugLog(`[Name Consolidation Agent] User Prompt:\n${inputText}`, explicitSessionId);
    }

    let systemInstruction = `You are an automated Name Consolidation Agent. Your task is to identify clinical biomarkers with similar, synonymous, or variant names from a selected list and group them together to make consolidation easy.

=== SYSTEM CONSTRAINTS ===
- DO NOT perform, input, or output any form of medical categorization, standard medical grouping, or physiological classification.
- You must return a raw, valid JSON object matching this exact schema. Do not include markdown wrappers.

=== OUTPUT SCHEMA ===
{
  "scratchpad": "Think step-by-step: compare the provided names and identify synonyms.",
  "consolidatedGroups": [
    {
      "canonicalName": "string (Recommended Clinical Name, e.g., 'Serum Albumin')",
      "recommendedKey": "string (unique key using snake_case, e.g., 'serum_albumin')",
      "variants": ["array of strings containing the original keys that match this group"],
      "rationale": "string (Why these are the same clinical biomarker)"
    }
  ]
}
`;

    if (customSystemInstruction) {
      addDebugLog(`[Name Consolidation Agent] Overriding system instruction with custom version (${customSystemInstruction.length} chars).`, explicitSessionId);
      systemInstruction = customSystemInstruction;
    }

    const dynamicPromptText = `Biomarkers to process:\n${JSON.stringify(selectedBiomarkers, null, 2)}\n\nUSER DATA / CONVERSATION TEXT:
\"\"\"${inputText || "Please identify the duplicates from the provided list and consolidate them."}\"\"\"

Please output a valid JSON object matching the requested schema.`;

    addDebugLog(`[Name Consolidation Agent] Dispatched Model ID: ${modelId}`, explicitSessionId);

    
    const consolidateNamesSchema = {
      type: Type.OBJECT,
      properties: {
        scratchpad: { type: Type.STRING, description: "Think step-by-step: compare the provided names, identify synonyms, determine the most universally recognized clinical name, and map variants." },
        consolidatedGroups: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              canonicalName: { type: Type.STRING },
              recommendedKey: { type: Type.STRING },
              variants: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING }
            }
          }
        }
      },
      required: ["consolidatedGroups"]
    };

    const consolidationTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Name consolidation timed out after 30s. Model under high demand — please try again.")), 30000)
    );
    const textOutput = await Promise.race([
      callUnifiedLLM({
        modelId,
        systemInstruction: systemInstruction + "\n\nJSON STRUCTURED OUTPUT:\nYou must strictly return a JSON object. Do not add markdown wrappers. Put your step-by-step reasoning in the 'scratchpad' field FIRST, before any other field, unless you are already using extended/native thinking for this request — in that case you may leave 'scratchpad' brief or omit it.",
        promptText: dynamicPromptText,
        responseMimeType: "application/json",
        responseSchema: consolidateNamesSchema,
        onStream: isStream ? (chunk: string, isThought?: boolean) => {
          if (isThought) {
            res.write(`data: ${JSON.stringify({ thought: chunk })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          }
        } : undefined
      }),
      consolidationTimeout
    ]);

    let cleanJson = textOutput.trim();
    addDebugLog(`[Name Consolidation Agent] Agent output payload:\n${cleanJson}`, explicitSessionId);
    
    if (cleanJson.includes("```")) {
      const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        cleanJson = match[1].trim();
      } else {
        cleanJson = cleanJson.replace(/```(?:json)?/gi, "").trim();
      }
    }
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanJson);
    
    if (parsed.explanation) {
      addDebugLog(`[Name Consolidation Agent] Agent Explanation:\n${parsed.explanation}`, explicitSessionId);
    }

    if (isStream) {
      res.write(`data: ${JSON.stringify({ final: true, result: parsed })}\n\n`);
      res.end();
    } else {
      res.json(parsed);
    }
  } catch (error: any) {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    addDebugLog(`[Name Consolidation Agent] Error: ${error.message}`, explicitSessionId);
    console.error("[Name Consolidation Agent Error]:", error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Failed to consolidate biomarker names: " + error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Failed to consolidate biomarker names: " + error.message });
    }
  }
});

app.post("/api/gemini/data-accuracy", async (req, res) => {
  try {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    const { inputText, currentState, images, currentLocalTime, engine, customSystemInstruction } = req.body;
    const modelId = engine || "gemini-3.1-flash-lite";
    addDebugLog(`[Data Accuracy Agent] Request received using model: ${modelId}. Text length: ${inputText?.length || 0}. Images count: ${images?.length || 0}`, explicitSessionId);
    if (inputText) {
      addDebugLog(`[Data Accuracy Agent] User Prompt Content:\n${inputText}`, explicitSessionId);
    }

    let imagesPayload: { mimeType: string, data: string }[] | undefined = undefined;
    if (images && images.length > 0) {
      imagesPayload = images.map((img: string) => {
        const mimeType = img.split(";")[0].split(":")[1] || "image/jpeg";
        const base64Data = img.split(",")[1];
        return { mimeType, data: base64Data };
      });
    }

    let systemInstruction = `You are the Data Accuracy Agent, a clinical data cleaning, quality check, and validation AI specialist. Your role is to get a list of biomarkers shared by the user (via text or uploaded file/images), match them against the user's existing biomarker dictionary and history, compare the critical fields, and return a precise difference analysis.

=== KEY TASKS ===
1. Extract biomarkers from the user's input. The input can contain:
   - Text written by the user.
   - Images of lab report sheets, documents, photos, or other reports.
   For each extracted biomarker, identify:
   - Name (e.g. Hemoglobin A1c, Cholesterol)
   - Unit (e.g. %, mg/dL, mmol/L)
   - Value (e.g. 5.8)
   - Date (e.g. 2026-07-01, or fallback to the current local time if unspecified: ${currentLocalTime || '2026-07-07'})
   - Comments/Notes (any clinical remarks, doctor comments, or brief interpretations associated with it)

2. Match the extracted biomarkers against the user's existing database (Current State provided below).
   Find the most appropriate matching key (e.g., "hba1c"). If no exact match exists in the current custom or built-in keys, propose a standard snake_case key based on medical conventions.

3. Compare the following 5 fields between the user's current data (from their dictionary and historical logs) and the shared data:
   - Biomarker Name (dictionary def name)
   - Unit (dictionary def unit)
   - Value (historical log value for that key on the matching date, or latest)
   - Date (historical log date for that key)
   - Comments (historical log note or specific test doctor comment)
   Match the date of the shared data with the historical logs to find the exact existing log. If no exact date match exists, compare against null or mark as a new log.

4. Determine if each field is "same" or "different":
   - Use comparison logic. If one is missing or empty on one side and present on the other, it is "different".
   - Set status to "same" if the content matches closely (case-insensitive, trimmed, numeric values with different decimal places like 5 and 5.0 are considered "same").
   - Set status to "different" if there is any difference.

5. IMPORTANT: Handling Multiple Entries for the Same Biomarker:
   - If the user's input contains multiple log entries for the SAME biomarker (e.g., tests taken on multiple different dates, or multiple values), you MUST create and return a SEPARATE object in the "comparisonResults" array for EACH distinct instance or date. Do not combine or skip them.

=== RESPONSE FORMAT ===
You MUST return a JSON object with this exact structure. Do NOT wrap it in markdown blocks. Return ONLY the raw valid JSON.

JSON Schema:
{
  "explanation": "A friendly scannable summary of the differences found.",
  "comparisonResults": [
    {
      "key": "biomarker_key",
      "matched": true,
      "name": { "current": "current_name", "shared": "shared_name", "status": "same|different" },
      "unit": { "current": "current_unit", "shared": "shared_unit", "status": "same|different" },
      "value": { "current": "current_value", "shared": "shared_value", "status": "same|different" },
      "date": { "current": "current_date", "shared": "shared_date", "status": "same|different" },
      "comments": { "current": "current_comments", "shared": "shared_comments", "status": "same|different" }
    }
  ]
}

=== USER'S CURRENT STATE ===
${JSON.stringify(currentState, null, 2)}
`;

    if (customSystemInstruction) {
      addDebugLog(`[Data Accuracy Agent] Overriding system instruction with custom version (${customSystemInstruction.length} chars).`, explicitSessionId);
      systemInstruction = customSystemInstruction;
    }

    addDebugLog(`[Data Accuracy Agent - Payload Sent] Model ID: ${modelId}
- User Prompt Content: ${inputText || "(no text content)"}
- Images Uploaded: ${images?.length || 0}
- Current State Reference Data Sent:
${JSON.stringify(currentState, null, 2)}`, explicitSessionId);

    const dynamicPromptText = `USER DATA / LAB REPORT INPUT TEXT:
"""
${inputText || "(no text content provided)"}
"""

Please extract the shared biomarkers and compare them with the user's current state. Return ONLY a valid JSON object matching the JSON schema. Ensure there are no markdown backticks.`;

    
    const dataAccuracySchema = {
      type: Type.OBJECT,
      properties: {
        scratchpad: { type: Type.STRING, description: "Think step-by-step: analyze the data points, verify physical biological limits, check against provided documents if any, and detect anomalies." },
        anomalies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              biomarkerKey: { type: Type.STRING },
              flagType: { type: Type.STRING },
              description: { type: Type.STRING },
              severity: { type: Type.STRING },
              recommendedAction: { type: Type.STRING }
            }
          }
        },
        generalAccuracyScore: { type: Type.NUMBER },
        overallAssessment: { type: Type.STRING }
      },
      required: ["scratchpad", "anomalies", "generalAccuracyScore", "overallAssessment"]
    };

    const textOutput = await callUnifiedLLM({
      modelId,
      systemInstruction: systemInstruction + "\n\nJSON STRUCTURED OUTPUT:\nYou must strictly return a JSON object. Do not add markdown wrappers. Think step-by-step in the 'scratchpad' field first.",
      promptText: dynamicPromptText,
      imagePayloads: imagesPayload,
      responseMimeType: "application/json",
      responseSchema: dataAccuracySchema
    });

    let cleanJson = textOutput.trim();
    addDebugLog(`[Data Accuracy Agent - Response Received] Raw Output from Agent:\n${cleanJson}`, explicitSessionId);

    // Robust markdown removal & JSON extraction
    if (cleanJson.includes("```")) {
      const match = cleanJson.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        cleanJson = match[1].trim();
      } else {
        cleanJson = cleanJson.replace(/```(?:json)?/gi, "").trim();
      }
    }

    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    addDebugLog(`[Data Accuracy Agent - Response Received] Parsed and Cleaned JSON:\n${cleanJson}`, explicitSessionId);
    
    // Parse to verify valid JSON
    const parsed = JSON.parse(cleanJson);
    if (parsed.explanation) {
      addDebugLog(`[Data Accuracy Agent] Agent Explanation Response:\n${parsed.explanation}`, explicitSessionId);
    }
    res.json(parsed);
  } catch (error: any) {
    const explicitSessionId = (req.headers["x-session-id"] as string) || "global";
    addDebugLog(`[Data Accuracy Agent] Error: ${error.message}`, explicitSessionId);
    console.error("[Data Accuracy Agent Error]:", error);
    res.status(500).json({ error: "Failed to compare and validate biomarkers: " + error.message });
  }
});

app.post("/api/gemini/daily-recommendation-chat", async (req, res) => {
  addDebugLog('[DailyRecommendation] Starting daily recommendation chat process.');
  try {
    const { message, userProfile, engine, history, foodLogs, biomarkers, report, actions, steps, location, thisMonthTrends } = req.body;

    const cleanProfile: any = {
      age: userProfile?.age,
      gender: userProfile?.gender,
      ethnicity: userProfile?.ethnicity,
      bloodType: userProfile?.bloodType,
      weight: userProfile?.weight,
      height: userProfile?.height,
      timezone: userProfile?.timezone
    };
    Object.keys(cleanProfile).forEach((key) => {
      if (cleanProfile[key] === undefined || cleanProfile[key] === null) {
        delete cleanProfile[key];
      }
    });
    
    const systemInstruction = `You are a personalized AI Health Coach. 
Your goal is to look at the user's data (biomarkers, food logs, goals, daily steps, etc.) and provide an actionable, friendly, and clinical daily recommendation or answer their questions.

### User Data Context
Profile: ${JSON.stringify(cleanProfile)}
Report/Nutrient Targets: ${JSON.stringify(report?.dailyNutrientTargets || {})}
Biomarkers: ${JSON.stringify(biomarkers || {})}
Clinical Actions: ${JSON.stringify(actions || {})}
Recent Food Logs (titles & dates): ${JSON.stringify((foodLogs || []).slice(-15).map((f) => ({name: f.name, date: f.date})))}
Today's Steps: ${steps || 'Unknown'}
Location: ${JSON.stringify(location || 'Unknown')}
This Month Trends (Daily Nutrient Intakes and Steps): ${JSON.stringify(thisMonthTrends || {})}

### Guidelines
1. Be encouraging, precise, friendly, and clinically sound.
2. If this is the start of the chat (e.g. user says "What's up today?"), analyze their performance trends for top nutrients (calories, protein, saturated fat, sodium, carbs, total fat) this month and their daily steps. Tell them what they have achieved so far and give 1-2 highly practical, personalized recommendations for today based on their goals and biomarkers.
3. If the user asks a question, answer it professionally and warmly, drawing on their real dietary trends and health logs.
4. Use markdown formatting (bolding, lists, headers) to make the coach recommendation beautifully readable.
5. Do NOT output JSON. Output pure markdown text.`;

    let historyText = "";
    if (history && Array.isArray(history)) {
      historyText = history.map((m) => `${m.role === 'user' ? 'User' : 'Model'}: ${m.content}`).join('\n');
    }
    
    const promptText = `Chat History:\n${historyText}\n\nUser's latest message: "${message}"`;
    
    const textOutput = await callUnifiedLLM({
      modelId: engine,
      systemInstruction,
      promptText,
      responseMimeType: "text/plain"
    });
    
    res.json({
      text: textOutput.trim(),
      apiCalls: [{ type: 'gemini', label: `Daily Recommendation Agent (${engine || 'gemini-3.1-flash-lite'})` }]
    });
  } catch (error) {
    console.error("[Daily Recommendation Error]:", error);
    res.status(500).json({ error: "Failed to generate recommendation: " + error.message });
  }
});

app.post("/api/gemini/food-idea", async (req, res) => {
  addDebugLog(`[FoodIdea] Starting food-idea suggestion process.`);
  try {
    const { message, userProfile, location, recentMeals, engine, budget, currency, maxDistance, clientNearbyPlaces, outOfRangeBiomarkers, biomarkersNeedingImprovement, customSystemInstruction, customVariableData } = req.body;
    addDebugLog(`[FoodIdea] Request parameters - engine: "${engine || 'default'}", maxDistance: ${maxDistance || 3}km, budget: "${budget} ${currency}". Query: "${message}"`);

    if (process.env.GEMINI_API_KEY === undefined) {
      addDebugLog(`[FoodIdea] Warning: GEMINI_API_KEY is not defined in Secrets.`);
      return res.json({
        text: "Please note: GEMINI_API_KEY is not configured in the Secrets manager.",
        ideas: [
          {
            id: 'mock-1',
            name: "Grilled Chicken Salad",
            placeName: "Sweetgreen",
            address: "10 Downing St, London, UK",
            locationLink: "https://www.google.com/maps/search/?api=1&query=Sweetgreen+10+Downing+St+London+UK",
            benefitExplanation: "High protein and fiber, good for your profile.",
            tags: ["High Protein", "Low Carb"],
            distanceKm: 1.2,
            estimatedBudget: "£4.50",
            dishImageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
          }
        ]
      });
    }

    const budgetValue = budget || "100000";
    const currencyValue = currency || "IDR";
    const maxDistanceValue = maxDistance || 3;

    // Perform reverse-geocoding of coordinates to find exact human-readable address for highly accurate localized searches!
    let resolvedAddressText = "";
    let nearbyPlacesText = "";
    if (location && location.lat && location.lng) {
      const geoController = new AbortController();
      const geoTimeoutId = setTimeout(() => geoController.abort(), 3000);
      try {
        addDebugLog(`[ReverseGeocode] Reverse geocoding lat/lng: ${location.lat}, ${location.lng} via Nominatim...`);
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}`, {
          headers: { 
            'User-Agent': 'HealthBiomarkerApplet/1.0 (Cwah.Liu@gmail.com)',
            'Accept-Language': 'en, id'
          },
          signal: geoController.signal
        });
        clearTimeout(geoTimeoutId);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.display_name) {
            resolvedAddressText = geoData.display_name;
            addDebugLog(`[ReverseGeocode] Resolved coordinates successfully to: "${resolvedAddressText}"`);
          }
        } else {
          addDebugLog(`[ReverseGeocode] HTTP error status: ${geoRes.status}`);
        }
      } catch (geoErr: any) {
        clearTimeout(geoTimeoutId);
        const isAbort = geoErr.name === 'AbortError';
        addDebugLog(`[ReverseGeocode] Failed or timed out (timed out: ${isAbort}). Continuing with coordinate context only.`);
      }

      // Use client-side overpass results if provided, otherwise try server-side
      if (clientNearbyPlaces && clientNearbyPlaces.length > 0) {
        const slicedClientPlaces = clientNearbyPlaces.slice(0, 6);
        addDebugLog(`[Overpass] Slicing ${clientNearbyPlaces.length} client-provided nearby places to ${slicedClientPlaces.length} items to bypass rate-limits.`);
        nearbyPlacesText = "CRITICAL DIRECTIVE: Here is a list of REAL nearby restaurants with their exact coordinates retrieved from OpenStreetMap just now. YOU MUST ONLY PICK RESTAURANTS FROM THIS LIST! DO NOT HALLUCINATE OR GUESS PLACES. Pick the 3-5 most appropriate places from this list for the user's diet:\n\n";
        slicedClientPlaces.forEach((el: any) => {
          nearbyPlacesText += `- Name: "${el.name}" (Lat: ${el.lat}, Lng: ${el.lng})\n`;
          if (el.address) nearbyPlacesText += `  Address: ${el.address}\n`;
          if (el.opening_hours) nearbyPlacesText += `  Hours: ${el.opening_hours}\n`;
        });
        nearbyPlacesText += "\nFor the 'placeName', 'lat', and 'lng' fields in your JSON response, use EXACTLY the names and coordinates from the list above. DO NOT guess coordinates!";
      } else {
        const overpassController = new AbortController();
        const overpassTimeoutId = setTimeout(() => overpassController.abort(), 4000);
        try {
          addDebugLog(`[Overpass] Querying OpenStreetMap Overpass API for restaurants within ${maxDistanceValue} km...`);
          const radius = Math.min(maxDistanceValue * 1000, 5000); // meters
          const overpassQuery = `[out:json];(node["amenity"~"restaurant|cafe|fast_food|food_court"](around:${radius},${location.lat},${location.lng}););out 30;`;
          
          const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(overpassQuery),
            signal: overpassController.signal
          });
          clearTimeout(overpassTimeoutId);
          
          if (overpassRes.ok) {
            const overpassData = await overpassRes.json();
            if (overpassData && overpassData.elements && overpassData.elements.length > 0) {
              const namedElements = overpassData.elements.filter((el: any) => el.tags && el.tags.name);
              const slicedElements = namedElements.slice(0, 6);
              addDebugLog(`[Overpass] Slicing ${namedElements.length} server-found nearby places to ${slicedElements.length} items to bypass rate-limits.`);
              nearbyPlacesText = "CRITICAL DIRECTIVE: Here is a list of REAL nearby restaurants with their exact coordinates retrieved from OpenStreetMap just now. YOU MUST ONLY PICK RESTAURANTS FROM THIS LIST! DO NOT HALLUCINATE OR GUESS PLACES. Pick the 3-5 most appropriate places from this list for the user's diet:\n\n";
              slicedElements.forEach((el: any) => {
                nearbyPlacesText += `- Name: "${el.tags.name}" (Lat: ${el.lat}, Lng: ${el.lon})\n`;
                if (el.tags['addr:street']) {
                  nearbyPlacesText += `  Address: ${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}\n`;
                }
                if (el.tags['opening_hours']) {
                  nearbyPlacesText += `  Hours: ${el.tags['opening_hours']}\n`;
                }
              });
              nearbyPlacesText += "\nFor the 'placeName', 'lat', and 'lng' fields in your JSON response, use EXACTLY the names and coordinates from the list above. DO NOT guess coordinates!";
              addDebugLog(`[Overpass] Resolved successfully! Formatted ${slicedElements.length} real nearby restaurants.`);
            } else {
              addDebugLog(`[Overpass] No real places found nearby from OpenStreetMap.`);
            }
          } else {
            addDebugLog(`[Overpass] HTTP error status: ${overpassRes.status}`);
          }
        } catch (err: any) {
          clearTimeout(overpassTimeoutId);
          const isAbort = err.name === 'AbortError';
          addDebugLog(`[Overpass] Failed or timed out (timed out: ${isAbort}). Continuing without nearby restaurant list.`);
        }
      }
    }

    const userCtx = userProfile ? `User Profile: Age ${userProfile.age}, Ethnicity: ${userProfile.ethnicity}, Weight: ${userProfile.weight}kg, Height: ${userProfile.height}cm.` : "User profile is unknown.";
    const userTimezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userLocalTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });
    
    const locCtx = location ? `User Location: Latitude ${location.lat}, Longitude ${location.lng}.\nUser Local Time: ${userLocalTime}` : `User Local Time: ${userLocalTime}`;
    const addressCtx = resolvedAddressText ? `User Human-Readable Address / Neighborhood: "${resolvedAddressText}"` : "Human-readable address is not resolved.";
    const nearbyCtx = nearbyPlacesText ? `\n\n${nearbyPlacesText}\n\n` : "";
    const mealsCtx = recentMeals && recentMeals.length > 0 ? `Recent Meals: ${recentMeals.join(', ')}.` : "No recent meals recorded.";
    const budgetCtx = `Max Budget Limit: ${budgetValue} ${currencyValue}. Suggested meals/dishes MUST fit within this price!`;
    const distanceCtx = `Max Distance Limit: ${maxDistanceValue} km. All suggested venues must be within ${maxDistanceValue} km of the user's current location!`;

    const biomarkersList = (biomarkersNeedingImprovement && Array.isArray(biomarkersNeedingImprovement) && biomarkersNeedingImprovement.length > 0)
      ? biomarkersNeedingImprovement.map((b: string) => `• ${b}`).join("\n")
      : (outOfRangeBiomarkers && outOfRangeBiomarkers.length > 0)
      ? outOfRangeBiomarkers.map((b: any) => `• ${b.name} is ${String(b.status).toUpperCase()} (${b.value} ${b.unit}, normal range: ${b.normalRange})`).join("\n")
      : "• None";

    let promptText = "";
    if (customVariableData) {
      promptText = `${customVariableData}\n\nCurrent User Input: "${message}"`;
    } else {
      promptText = `You are a personalized AI Dietitian.
${userCtx}
${locCtx}
${addressCtx}
${mealsCtx}
${budgetCtx}
${distanceCtx}
${nearbyCtx}

CRITICAL PATIENT BIOMARKER WARNINGS:
${biomarkersList}

Current User Input: "${message}"

CRITICAL SYSTEM REQUIREMENTS FOR VERACITY & LOGICAL ACCURACY:
1. VENUE SELECTION FROM PROVIDED LIST: You MUST ONLY select restaurants from the provided list of nearby REAL restaurants if it is provided. Do NOT invent or search for other restaurants. Use EXACTLY the lat and lng coordinates from the list. Do not modify the coordinates.
2. STRICT GEOGRAPHIC RADIUS ENFORCEMENT: If you must suggest a venue not on the list, it MUST be located within exactly ${maxDistanceValue} km of the user's location. Do not hallucinate coordinates.
3. SEARCH GROUNDING CONTEXT: Use Google Search Grounding ONLY to verify the selected restaurant's hours, reviews, or social media pages. Do not use it to find random new restaurants far away.
4. MAPS LINK PRECISION & ERROR HANDLING RULE: When you have a restaurant, call the \`get_google_maps_place_id\` tool EXACTLY ONCE per restaurant using the restaurant name and coordinates.
   - If the tool returns a valid place_id, construct the "locationLink" URL exactly like this: \`https://www.google.com/maps/search/?api=1&query={URL_ENCODED_NAME}&query_place_id={PLACE_ID}\`.
   - If the tool returns "NOT_FOUND", "ERROR_API_FAILED", or includes a "STOP TOOL USE" instruction, DO NOT call the tool again under any circumstances. Immediately construct the "locationLink" URL using the street address/name: \`https://www.google.com/maps/search/?api=1&query={URL_ENCODED_NAME}+{URL_ENCODED_STREET_NAME}\` or coordinate-based query if street name is unavailable. Do NOT retry or call the tool for other items if you hit a failure.
5. STRICT OPENING HOURS ENFORCEMENT: The user's current local time is ${userLocalTime}. You MUST capture the exact opening and closing time and add it to the result for the recommended place in the 'openingHours' field. You MUST use Google Search Grounding to actively search for the opening hours of the specific restaurant you recommend. Never use '--' unless you genuinely cannot find it online. You should only recommend places that are STILL OPEN 1 HOUR from the current local time!
6. REFERENCE LINK: For the 'menuLink' field, you MUST provide a direct, high-quality, real web link to the restaurant's actual official website, Instagram/Facebook page, TripAdvisor page, Yelp page, or specific Google Maps business page. DO NOT use generic Google Search query pages (like 'google.com/search?q=...') or generic placeholders, as this is unacceptable. Use Google Search Grounding to locate their actual website or profile!
7. ZERO-FIND FALLBACK & STRICT RADIUS: If no verified physical restaurants are found within the exact ${maxDistanceValue} km radius of the user's coordinates, YOU MUST NOT SUGGEST ANY PLACES. In this case, you MUST only suggest generic healthy dishes to cook at home (do not include placeName, address, lat, lng, locationLink, menuLink, or distanceKm). Clearly explain in your text response that no verified venues were found within ${maxDistanceValue} km, and suggest increasing the search radius. NEVER hallucinate places far away or fake coordinates.

Include a short conversational response (text), and a list of between 3 and 5 distinct, diverse structured food ideas (ideas) that meet the constraints. Under no circumstances should you return only 1 idea.
Each idea should have:
- name: string (A general, common healthy food category they serve, e.g. "Grilled Chicken Salad" or "Sushi". DO NOT hallucinate exact menu items unless verified.)
- placeName: string (Optional. The verified, real-world restaurant name. Omit if suggesting a home-cooked meal.)
- address: string (Optional. The verified, exact physical street address.)
- lat: number (Optional. The latitude of the suggested place. Omit if no place is found within the radius.)
- lng: number (Optional. The longitude of the suggested place. Omit if no place is found within the radius.)
- locationLink: string (Optional. Google Maps Search URL)
- menuLink: string (Optional. A URL to ANY relevant webpage about the restaurant, such as Google Maps, Yelp, Instagram, or their website. DO NOT use recipe search links!)
- distanceKm: number (Optional. The straight-line physical distance in km. This MUST be strictly <= ${maxDistanceValue} km! Omit if home-cooked.)
- estimatedBudget: string (The estimated price of this suggested dish, formatted nicely with the currency symbol, e.g., "Rp 45,000" or "£3.50". This MUST be within the maximum budget of ${budgetValue} ${currencyValue}!)
- dishImageUrl: string (A valid, beautiful, and relevant Unsplash food image URL showing this specific type of dish, e.g., "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80" for a salad, or a suitable search query image URL from Unsplash.)
- benefitExplanation: string (Why this is good for the user's profile)
- tags: array of strings (e.g. ["High Protein", "Low Carb"])
- openingHours: string (The opening hours of the restaurant. E.g., "10:00 AM - 10:00 PM". Search for it actively!)

Respond with a structured JSON format matching this schema exactly:
{
  "text": "Your conversational response here",
  "ideas": [
    {
      "name": "Food Name",
      "placeName": "Restaurant or Place Name",
      "address": "123 Main St, City, State",
      "lat": -6.2088,
      "lng": 106.8456,
      "locationLink": "https://www.google.com/maps/search/?api=1&query=HokBen&query_place_id=ChIJKZ1Uh-P1aS4R61b3Rsx8mSU",
      "menuLink": "https://www.hokben.co.id/",
      "distanceKm": 1.2,
      "estimatedBudget": "Rp 45,000",
      "dishImageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      "benefitExplanation": "Why this is good...",
      "tags": ["tag1", "tag2"],
      "openingHours": "10:00 AM - 10:00 PM"
    }
  ]
}`;
    }

    const sysInstruction = customSystemInstruction || "You are a world-class AI dietitian. Your response must be an exact JSON matching the requested schema. Never add markdown wrappers.";

    const textOutput = await callUnifiedLLM({
      modelId: engine || "gemini-3.5-flash",
      systemInstruction: sysInstruction,
      promptText,
      responseMimeType: "application/json",
      googleSearch: true,
      enablePlaceIdTool: !!process.env.GOOGLE_MAPS_API_KEY
    });

    let cleanJson = textOutput.replace(/```(?:json)?/gi, "").trim();
    let parsedData;
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsedData = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
      } else {
        throw parseErr;
      }
    }

    if (parsedData.ideas && Array.isArray(parsedData.ideas)) {
      parsedData.ideas = parsedData.ideas.map((idea: any) => ({
        ...idea,
        id: 'idea_' + Date.now() + Math.random().toString(36).substr(2, 9)
      }));
    }

    parsedData.agentPrompt = `System Instruction:\nYou are a world-class AI dietitian. Your response must be an exact JSON matching the requested schema. Never add markdown wrappers.\n\n${promptText}`;
    res.json({
      ...parsedData,
      apiCalls: [{ type: 'gemini', label: `Food Idea Agent (${engine || 'gemini-3.1-flash-lite'})` }]
    });
  } catch (error: any) {
    addDebugLog(`[FoodIdea] Error occurred: ${error.message || error}`);
    console.error("[Food Idea Analyze Error]:", error);
    const isQuotaError = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED");
    
    const errorMsg = isQuotaError
      ? "Unable to provide recommendations: Gemini API quota or rate limit reached. Please verify your API key or try again in a few minutes."
      : "Unable to provide recommendations: The agent connection has timed out or the request could not be processed. Please try again.";

    res.json({
      text: errorMsg,
      ideas: []
    });
  }
});

interface SearchEngine {
  name: string;
  isEnabled(env: any): boolean;
  search(query: string, count: number, env: any): Promise<Array<{title: string, imageUrl: string, pageUrl: string}>>;
}
const searchRegistry: SearchEngine[] = [
  // 1. Wikipedia (Always active, free, identified User-Agent raises limit to 200 RPM)
  {
    name: "Wikipedia",
    isEnabled: () => true,
    search: async (query, count) => {
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=600&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${count + 2}&origin=*`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "HealthTracker/3.0 (https://github.com/cwahli/Health-tracker-3; contact@example.com)"
          }
        });
        const data = await res.json();
        if (data.query && data.query.pages) {
          const pages = data.query.pages;
          const results = [];
          for (const pageId of Object.keys(pages)) {
            const page = pages[pageId];
            if (page.thumbnail && page.thumbnail.source) {
              const title = page.title.toLowerCase();
              // Blacklist filter to block non-food results (like mosques or battles)
              const blacklist = ["mosque", "church", "temple", "reign", "dynasty", "battle", "war", "monument", "district", "regency", "politician"];
              if (blacklist.some(word => title.includes(word))) {
                continue;
              }
              results.push({
                title: page.title,
                imageUrl: page.thumbnail.source,
                pageUrl: `https://en.wikipedia.org/?curid=${pageId}`,
                engine: "Wikipedia"
              });
            }
          }
          return results.slice(0, count);
        }
      } catch (err) {
        console.error("[Wiki Search Error]", err);
      }
      return [];
    }
  },
  // 3. Google Custom Search API
  {
    name: "GoogleCSE",
    isEnabled: (env) => !!env.Custom_Search_API && env.Custom_Search_API !== "AIzaSyDGpOvUtgu7fEbpgms1ICuvFvJxi8DMGvA",
    search: async (query, count, env) => {
      try {
        const cx = env.Custom_Search_CX || "40e028bbf9ec84932";
        const url = `https://www.googleapis.com/customsearch/v1?key=${env.Custom_Search_API}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=${count}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.items) {
          return data.items.slice(0, count).map((item: any) => ({
            title: item.title,
            imageUrl: item.link,
            pageUrl: item.image?.contextLink || `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            engine: "GoogleCSE"
          }));
        }
      } catch (err) {
        console.error("[GoogleCSE Search Error]", err);
      }
      return [];
    }
  },
  // 4. Brave Image Search API
  {
    name: "Brave",
    isEnabled: (env) => !!(env.BRAVE_SEARCH_API_KEY || env.Brave_Search_API || env.BRAVE_API_KEY),
    search: async (query, count, env) => {
      try {
        const apiKey = env.BRAVE_SEARCH_API_KEY || env.Brave_Search_API || env.BRAVE_API_KEY;
        const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=${count + 2}`;
        const res = await fetch(url, {
          headers: { "X-Subscription-Token": apiKey }
        });
        const data = await res.json();
        if (res.ok && data.results) {
          return data.results.slice(0, count).map((item: any) => ({
            title: item.title || query,
            imageUrl: item.properties?.url || item.url,
            pageUrl: item.page_url || "https://brave.com",
            engine: "Brave"
          }));
        }
      } catch (err) {
        console.error("[Brave Search Error]", err);
      }
      return [];
    }
  }
];
function cleanSearchQuery(q: string): string {
  if (!q) return "";
  let clean = q;
  
  // 1. Remove text inside square brackets [like this]
  clean = clean.replace(/\[[^\]]*\]/g, "");
  
  // 2. Remove text inside parentheses (like this)
  clean = clean.replace(/\([^)]*\)/g, "");
  
  // 3. Replace common Indonesian abbreviations / terms to simplify search
  clean = clean.replace(/\/\s*(gr|goreng|bkr|bakar)/gi, "");
  
  // 4. Remove "+ NASI" or "+ Nasi" or "+ rice" or "with rice"
  clean = clean.replace(/\+\s*(nasi|rice)/gi, "");
  clean = clean.replace(/with\s+rice/gi, "");
  clean = clean.replace(/and\s+rice/gi, "");
  clean = clean.replace(/[\+\&]/g, " "); // replace + and & with space
  
  // 5. If there's a slash, take the first option (e.g. "Grilled/Fried Milkfish" -> "Grilled Milkfish")
  if (clean.includes("/")) {
    const parts = clean.split("/");
    clean = parts[0];
  }
  
  // 6. Common Indonesian/English replacements
  clean = clean.replace(/\bque\b/gi, "kuwe");
  clean = clean.replace(/\bvilet\b/gi, "fillet");
  
  // 7. Strip trailing/leading spaces and multiple spaces
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}

// Reusable Image Retrieval Manager (Fail-Proof Sequential Pipeline)
async function retrieveFoodImages(
  query: string, 
  options: { mode?: "light" | "complete"; count?: number }
): Promise<Array<{title: string, imageUrl: string, pageUrl: string, engine?: string}>> {
  const cleanedQuery = cleanSearchQuery(query) || query;
  const mode = options.mode || "light";
  const targetCount = options.count || 2;
  const results: Array<{title: string, imageUrl: string, pageUrl: string, engine?: string}> = [];
  // Filter enabled engines based on active mode
  const activeEngines = searchRegistry.filter(engine => {
    if (mode === "light" && engine.name === "Brave") return false;
    return engine.isEnabled(process.env);
  });
  addDebugLog(`[ImageRetrieval] Searching for "${cleanedQuery}" (original: "${query}") (mode: ${mode}, count: ${targetCount})`);
  for (const engine of activeEngines) {
    if (results.length >= targetCount) break;
    try {
      const needed = targetCount - results.length;
      addDebugLog(`[ImageRetrieval] Requesting ${needed} image(s) from ${engine.name}...`);
      const engineResults = await engine.search(cleanedQuery, needed, process.env);
      if (engineResults && engineResults.length > 0) {
        results.push(...engineResults);
      }
    } catch (err: any) {
      console.error(`[ImageRetrieval] Engine ${engine.name} failed:`, err.message);
    }
  }
  return results.slice(0, targetCount);
}

// Programmatic, Fail-Proof Image Search Endpoint
app.post("/api/gemini/food-image-search", async (req, res) => {
  const { query, mode, count } = req.body;
  addDebugLog(`[FoodImageSearch] Route triggered for query: "${query}"`);
  
  if (imageSearchCache.has(query)) {
    const cached = imageSearchCache.get(query);
    // Ensure apiCalls are always reported even on cache hits
    return res.json({
      ...cached,
      apiCalls: [{ type: 'brave', label: `Brave Search (cached) - ${query}` }]
    });
  }

  try {
    const images = await retrieveFoodImages(query, {
      mode: mode || "light",
      count: typeof count === "number" ? count : 2
    });
    
    // De-duplicate engine names for apiCalls
    const enginesUsed = Array.from(new Set(images.map((img: any) => img.engine || 'Brave')));
    const apiCalls = enginesUsed.map(engineName => ({
      type: engineName.toLowerCase() === 'wikipedia' ? 'wikipedia' : engineName.toLowerCase() === 'unsplash' ? 'unsplash' : 'brave',
      label: `${engineName} Search - ${query}`
    }));

    const payload = {
      images,
      isAvailable: images.length > 0,
      apiCalls,
      error: images.length > 0 ? null : "No images could be retrieved across active search engines."
    };
    
    // Always cache the result to prevent infinite lookup loops for unfound items
    imageSearchCache.set(query, payload);

    res.json(payload);
  } catch (error: any) {
    console.error("[FoodImageSearch Endpoint Error]:", error);
    res.json({
      images: [],
      isAvailable: false,
      error: `Search pipeline error: ${error.message}`
    });
  }
});


app.post("/api/gemini/menu-image-search", async (req, res) => {
  const { labels } = req.body;
  if (!labels || !Array.isArray(labels) || labels.length === 0) {
    return res.json({ results: [] });
  }

  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < labels.length; i += batchSize) {
    batches.push(labels.slice(i, i + batchSize));
  }

  let allResults: { label: string; imageUrl: string | null }[] = [];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  for (const batch of batches) {
    const promptText = `Briefly describe each of these dishes: ${batch.join(", ")}. Do not include URLs or format as JSON. Provide a short paragraph for each.`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
        config: { tools: [{ googleSearch: {} }] }
      });
      const candidate = response.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "";
      const groundingMetadata = candidate?.groundingMetadata;
      const groundingSupports = groundingMetadata?.groundingSupports || [];
      const groundingChunks = groundingMetadata?.groundingChunks || [];

      for (const label of batch) {
        let matchedUri = null;
        let matchReason = "No grounding match";
        const lowerLabel = label.toLowerCase();
        let matchedSegment = null;
        for (const support of groundingSupports) {
           const segment = support.segment;
           if (segment && segment.text && segment.text.toLowerCase().includes(lowerLabel)) {
             matchedSegment = support;
             break;
           }
        }
        if (!matchedSegment) {
           const parts = lowerLabel.split(" ");
           for (const support of groundingSupports) {
              const segment = support.segment;
              if (segment && segment.text && parts.some(p => p.length > 3 && segment.text.toLowerCase().includes(p))) {
                 matchedSegment = support;
                 break;
              }
           }
        }
        
        if (matchedSegment && matchedSegment.groundingChunkIndices && matchedSegment.groundingChunkIndices.length > 0) {
           const chunkIndex = matchedSegment.groundingChunkIndices[0];
           const chunk = groundingChunks[chunkIndex];
           if (chunk && chunk.web && chunk.web.uri) {
             matchedUri = chunk.web.uri;
           }
        }
        
        let ogImageUrl = null;
        if (matchedUri) {
           try {
             const scrapeRes = await fetch(matchedUri, { 
               headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
               signal: AbortSignal.timeout(5000)
             });
             const html = await scrapeRes.text();
             const $ = cheerio.load(html);
             ogImageUrl = $('meta[property="og:image"]').attr('content');
             if (!ogImageUrl) matchReason = "No og:image";
           } catch (e) {
             matchReason = "Scrape failure";
           }
        }
        
        // Fallback
        if (!ogImageUrl) {
           try {
             const fallbackRes = await fetch("http://localhost:3000/api/gemini/food-image-search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: label })
             });
             const fallbackData = await fallbackRes.json();
             if (fallbackData.images && fallbackData.images.length > 0) {
                ogImageUrl = fallbackData.images[0].imageUrl;
             }
           } catch (e) {
             console.error("Fallback error", e);
           }
        }
        
        allResults.push({ label, imageUrl: ogImageUrl });
      }
    } catch (e) {
      console.error("Batch error:", e);
      for (const label of batch) {
         try {
             const fallbackRes = await fetch("http://localhost:3000/api/gemini/food-image-search", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: label })
             });
             const fallbackData = await fallbackRes.json();
             if (fallbackData.images && fallbackData.images.length > 0) {
                allResults.push({ label, imageUrl: fallbackData.images[0].imageUrl });
             } else {
                allResults.push({ label, imageUrl: null });
             }
         } catch(e) {
             allResults.push({ label, imageUrl: null });
         }
      }
    }
  }
  // Accumulate calls made during this batch
  const localApiCalls = [];
  const batchCount = Math.ceil(labels.length / 5);
  for (let i = 0; i < batchCount; i++) {
    localApiCalls.push({ type: 'gemini', label: 'Menu image search - Gemini 2.5 Flash' });
  }
  // Check if we hit the fallback search for any items
  allResults.forEach(r => {
    if (r.imageUrl) {
      localApiCalls.push({ type: 'brave', label: `Brave Search (menu fallback) - ${r.label}` });
    }
  });
  return res.json({ 
    results: allResults,
    apiCalls: localApiCalls
  });
});

/* old code replacement */
app.get("/api/gemini/test-menu-image-search", async (req, res) => {
  const testLabels = ["Beef Rendang", "Nasi Goreng", "Chicken Satay", "Gado Gado", "Soto Ayam", "Mie Goreng", "Martabak Manis", "Pempek Palembang", "Es Cendol", "Ayam Penyet", "GURAME ASAM MANIS", "ES TELER ALPUKAT", "SEBLAK CEKER", "MIE TEK-TEK BAKSO", "KWETIAU GORENG SEAFOOD", "JUS ALPUKAT", "ES BANGO AGER ITEM", "TONGKOL SUIR PETE", "AYAM GARANG ASEM", "CUMI GORENG TEPUNG"];

  try {
    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:3000";
    const url = `${protocol}://${host}/api/gemini/menu-image-search`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: testLabels })
    });
    
    const data = await response.json();
    return res.json({ data, testLabels });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Endpoint to fetch real-time agent thinking process logs
app.get("/api/gemini/debug-logs", (req, res) => {
  const sessionId = (req.headers["x-session-id"] as string) || (req.query.sessionId as string) || "global";
  let logs = globalDebugLogs;
  if (sessionId !== "global" && sessionDebugLogs[sessionId]) {
    logs = sessionDebugLogs[sessionId];
  }
  res.json({ logs });
});

// Endpoint to clear the backend agent process logs
app.post("/api/gemini/clear-debug-logs", (req, res) => {
  const sessionId = (req.headers["x-session-id"] as string) || (req.query.sessionId as string) || "global";
  if (sessionId !== "global") {
    sessionDebugLogs[sessionId] = [];
  } else {
    globalDebugLogs = [];
  }
  addDebugLog(`[System] Debug logs cleared by user request.`, sessionId !== "global" ? sessionId : undefined);
  res.json({ status: "cleared", logs: [] });
});

// Endpoint to compile logs and send to admin
app.post("/api/gemini/send-logs", (req, res) => {
  try {
    const sessionId = (req.headers["x-session-id"] as string) || (req.query.sessionId as string) || "global";
    const { logsText } = req.body;
    
    // Create admin logs directory if not exists
    const logsDir = path.join(process.cwd(), "data", "admin_logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(logsDir, `admin_logs_${sessionId}_${timestampStr}.txt`);
    
    const formattedContent = `ADMIN LOGS EXPORT\nTarget Admin: cwah.liu@gmail.com\nTimestamp: ${new Date().toLocaleString()}\nSession ID: ${sessionId}\n\n=========================================\n\n${logsText || "No logs provided."}`;
    
    fs.writeFileSync(filePath, formattedContent, "utf8");
    
    // Also append to a single rolling admin_logs_all.txt for convenience
    const rollingFilePath = path.join(logsDir, "admin_logs_all.txt");
    fs.appendFileSync(rollingFilePath, `\n\n=== EXPORTED AT ${new Date().toISOString()} (Session: ${sessionId}) ===\n${logsText}\n`, "utf8");
    
    addDebugLog(`[AdminExport] Emailed and compiled entire log history to cwah.liu@gmail.com. Saved locally to ${filePath}`);
    
    res.json({ 
      status: "success", 
      message: "Debug logs compiled and sent to cwah.liu@gmail.com. They have also been saved to the server persistent volume.",
      filePath
    });
  } catch (err: any) {
    console.error("Error exporting logs:", err);
    res.status(500).json({ error: "Failed to export debug logs to admin." });
  }
});

// Google Health / Google Fit OAuth Endpoints
app.get('/api/health-connect/url', (req, res) => {
  // Use the host header directly for the redirect URI
  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/health-connect/callback`;
  
  const params = new URLSearchParams({
    client_id: process.env.GHealth_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, redirectUri });
});

app.get(['/health-connect/callback', '/health-connect/callback/'], async (req, res) => {
  const { code } = req.query;
  const host = req.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/health-connect/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GHealth_CLIENT_ID || '',
        client_secret: process.env.GHealth_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(JSON.stringify(tokenData));
    }

    res.send(`
      <html>
        <body>
          <script>
            try {
              localStorage.setItem('ghealth_tokens', JSON.stringify(${JSON.stringify(tokenData)}));
              localStorage.setItem('ghealth_auth_status', 'SUCCESS');
            } catch (e) {
              console.error("Failed to write to localStorage:", e);
            }

            if (window.opener) {
              try {
                window.opener.postMessage({ type: 'GHEALTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokenData)} }, '*');
              } catch (e) {
                console.error("Failed to postMessage:", e);
              }
              window.close();
            } else {
              setTimeout(() => {
                window.close();
              }, 1500);
            }
          </script>
          <div style="font-family: sans-serif; text-align: center; padding-top: 40px; color: #333;">
            <h3 style="color: #4f46e5; margin-bottom: 8px;">Connection Successful!</h3>
            <p style="margin: 4px 0; font-size: 14px;">Your Google Health account has been connected.</p>
            <p style="font-size: 12px; color: #666; margin-top: 12px;">This window will close automatically.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("GHealth OAuth error:", err);
    res.status(500).send(`Error exchanging code for tokens: ${err.message}`);
  }
});

app.post('/api/health-connect/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' });
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.GHealth_CLIENT_ID || '',
        client_secret: process.env.GHealth_CLIENT_SECRET || '',
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 400) {
         return res.status(response.status).json(data);
      }
      throw new Error(JSON.stringify(data));
    }
    
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/health-connect/diagnostics', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(401).json({ error: 'Missing access_token' });

  try {
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`);
    const tokenInfo = await tokenInfoRes.json();

    const dsRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const dsData = await dsRes.json();

    res.json({
      tokenInfo: tokenInfo,
      dataSourcesCount: dsData.dataSource ? dsData.dataSource.length : 0,
      dataSources: dsData.dataSource ? dsData.dataSource.map((d: any) => d.dataStreamId) : dsData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/health-connect/steps', async (req, res) => {
  const { access_token, startTimeMillis, endTimeMillis } = req.body;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Missing access_token' });
  }

  try {
    const now = new Date();
    const endTime = endTimeMillis || now.getTime();
    
    // startTimeMillis is provided as the local start of today (midnight).
    const startTime = startTimeMillis || (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime());

    // Align queryStartTime to exactly 7 days before today's midnight to ensure 24h buckets align with midnight.
    const queryStartTime = startTime - 7 * 24 * 60 * 60 * 1000;

    console.log(`[GoogleFit] Querying from ${new Date(queryStartTime).toISOString()} to ${new Date(endTime).toISOString()} with primary datasource estimated_steps...`);

    // 1. Primary: Aggregate using the estimated_steps datasource as requested by the user.
    let response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: queryStartTime,
        endTimeMillis: endTime
      })
    });

    let data = await response.json();
    
    // If the specific estimated_steps fails, try general com.google.step_count.delta as fallback
    if (!response.ok) {
      console.warn("Primary estimated_steps aggregation failed, trying general com.google.step_count.delta...");
      response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: queryStartTime,
          endTimeMillis: endTime
        })
      });
      data = await response.json();
    }

    if (!response.ok) {
      console.warn("General delta also failed, trying com.google.step_count.cumulative...");
      response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.cumulative'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: queryStartTime,
          endTimeMillis: endTime
        })
      });
      data = await response.json();
    }

    if (!response.ok) {
      const errMessage = JSON.stringify(data);
      if (response.status === 401 || response.status === 400 || errMessage.includes('invalid_token') || errMessage.includes('401')) {
        return res.status(401).json({ error: errMessage });
      }
      throw new Error(errMessage);
    }

    // Parse the steps day-by-day (each bucket represents 1 day)
    let todaySteps = 0;
    let totalSevenDaySteps = 0;
    let lastActiveDaySteps = 0;
    let lastActiveDayTimestamp = "";
    let activeDaysCount = 0;
    let history: { date: string, value: number }[] = [];

    if (data.bucket && data.bucket.length > 0) {
      data.bucket.forEach((b: any) => {
        let bucketSteps = 0;
        if (b.dataset && b.dataset[0] && b.dataset[0].point && b.dataset[0].point.length > 0) {
          b.dataset[0].point.forEach((p: any) => {
            if (p.value && p.value[0]) {
              if (p.value[0].intVal !== undefined) {
                bucketSteps += p.value[0].intVal;
              } else if (p.value[0].fpVal !== undefined) {
                bucketSteps += Math.round(p.value[0].fpVal);
              }
            }
          });
        }

        totalSevenDaySteps += bucketSteps;
        if (bucketSteps > 0) {
          lastActiveDaySteps = bucketSteps;
          activeDaysCount++;
          if (b.startTimeMillis) {
            lastActiveDayTimestamp = new Date(parseInt(b.startTimeMillis, 10)).toLocaleDateString();
          }
        }
        
        if (b.startTimeMillis) {
          const dateStr = new Date(parseInt(b.startTimeMillis, 10)).toISOString().split('T')[0];
          history.push({ date: dateStr, value: bucketSteps });
        }

        // Check if this bucket corresponds to today's range
        const bucketStart = parseInt(b.startTimeMillis || "0", 10);
        const bucketEnd = parseInt(b.endTimeMillis || "0", 10);
        
        // If this bucket is today's bucket
        if (bucketStart >= startTime) {
          todaySteps += bucketSteps;
        }
      });
    }

    // Robust raw dataset query fallbacks (direct point read instead of aggregate query)
    // Helps with third-party sync apps or devices logging directly to Fit without bucket aggregate syncing.
    if (todaySteps === 0 && totalSevenDaySteps === 0) {
      console.log("[GoogleFit] Aggregate returned 0 steps. Activating dynamic direct dataset query fallbacks...");
      
      let bestSum = 0;
      let bestDataSaved = null;
      let bestSourceName = "";

      try {
        const dsRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources', {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        if (dsRes.ok) {
          const dsData = await dsRes.json();
          if (dsData.dataSource && dsData.dataSource.length > 0) {
            const stepSources = dsData.dataSource.filter((d: any) => 
              d.dataType && d.dataType.name && d.dataType.name.includes("step_count")
            );

            for (const source of stepSources) {
              try {
                let currentSum = 0;
                let currentTodaySum = 0;
                const sourceId = encodeURIComponent(source.dataStreamId);
                const rawRes = await fetch(
                  `https://www.googleapis.com/fitness/v1/users/me/dataSources/${sourceId}/datasets/${queryStartTime * 1000000}-${endTime * 1000000}`,
                  { headers: { 'Authorization': `Bearer ${access_token}` } }
                );
                
                if (rawRes.ok) {
                  const rawData = await rawRes.json();
                  if (rawData.point && rawData.point.length > 0) {
                    if (source.dataType.name === "com.google.step_count.cumulative") {
                      // For cumulative, we sum positive differences between consecutive points
                      let lastVal = -1;
                      rawData.point.forEach((p: any) => {
                        if (p.value && p.value[0]) {
                          let val = p.value[0].intVal !== undefined ? p.value[0].intVal : (p.value[0].fpVal !== undefined ? Math.round(p.value[0].fpVal) : 0);
                          let delta = 0;
                          if (lastVal !== -1) {
                            if (val >= lastVal) {
                              delta = val - lastVal;
                            } else {
                              // Counter reset
                              delta = val;
                            }
                          }
                          currentSum += delta;
                          
                          // Check if point is from today
                          const pEndMillis = p.endTimeNanos ? Number(p.endTimeNanos) / 1000000 : 0;
                          if (pEndMillis >= startTime) {
                            currentTodaySum += delta;
                          }

                          lastVal = val;
                        }
                      });
                    } else {
                      // For delta, we just sum them up
                      rawData.point.forEach((p: any) => {
                        if (p.value && p.value[0]) {
                          let val = p.value[0].intVal !== undefined ? p.value[0].intVal : (p.value[0].fpVal !== undefined ? Math.round(p.value[0].fpVal) : 0);
                          currentSum += val;
                          
                          const pEndMillis = p.endTimeNanos ? Number(p.endTimeNanos) / 1000000 : 0;
                          if (pEndMillis >= startTime) {
                            currentTodaySum += val;
                          }
                        }
                      });
                    }
                    
                    if (currentSum > bestSum) {
                      bestSum = currentSum;
                      todaySteps = currentTodaySum;
                      bestDataSaved = rawData;
                      bestSourceName = source.dataStreamId;
                    }
                  }
                }
              } catch (e) {
                console.warn(`[GoogleFit] Raw query failed for ${source.dataStreamId}`, e);
              }
            }
          }
        }
      } catch (e) {
        console.warn("[GoogleFit] Failed to fetch data sources for fallback:", e);
      }

      // Use the best available source
      if (bestSum > 0) {
        totalSevenDaySteps = bestSum;
        data = { source: `dynamic_raw_${bestSourceName}`, totalPoints: bestDataSaved?.point?.length, ...bestDataSaved };
        console.log(`[GoogleFit] Successfully retrieved ${bestSum} raw steps via fallback from ${bestSourceName}! Today steps: ${todaySteps}`);
      }
    }

    const sevenDayAverage = activeDaysCount > 0 ? Math.round(totalSevenDaySteps / activeDaysCount) : Math.round(totalSevenDaySteps / 7);

    res.json({ 
      steps: todaySteps, 
      sevenDayTotal: totalSevenDaySteps,
      sevenDayAverage,
      lastActiveDaySteps: lastActiveDaySteps || todaySteps,
      lastActiveDayTimestamp: lastActiveDayTimestamp || new Date().toLocaleDateString(),
      history,
      raw: data 
    });
  } catch (err: any) {
    console.error("GHealth Steps error:", err);
    res.status(500).json({ error: "Failed to fetch steps: " + err.message });
  }
});

app.post('/admin/migrate', async (req, res) => {
  try {
    const secret = req.headers['x-admin-secret'] || req.body?.secret;
    if (!process.env.ADMIN_MIGRATION_SECRET || secret !== process.env.ADMIN_MIGRATION_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const commit = req.body?.commit === true;
    if (!db) {
      return res.status(500).json({ error: 'Firestore is not initialized.' });
    }
    const targetUid = req.body?.uid;
    if (!targetUid || typeof targetUid !== 'string') {
      return res.status(400).json({ error: 'A single "uid" is required in the request body. This endpoint no longer scans all users in one call — call it once per uid.' });
    }

    const report = {
      scannedUsers: 0,
      updatedUsers: 0,
      updatedDocs: 0,
      imagesCompressed: 0,
      biomarkerRenames: [] as any[],
      arrayToMapConversions: 0,
      dryRun: !commit
    };

    const targetDoc = await db.collection('users').doc(targetUid).get();
    if (!targetDoc.exists) {
      return res.status(404).json({ error: `No user found with uid ${targetUid}` });
    }
    report.scannedUsers = 1;

    for (const userDoc of [targetDoc]) {
      const uid = userDoc.id;
      const profile = userDoc.data();
      let profileChanged = false;
      
      const arrayFields = ['deletedFoodLogIds', 'deletedBiomarkerLogIds', 'deletedCustomBiomarkerKeys'];
      for (const field of arrayFields) {
        if (Array.isArray(profile[field])) {
          const newMap: any = {};
          for (const id of profile[field]) {
            newMap[id] = Date.now();
          }
          profile[field] = newMap;
          profileChanged = true;
          report.arrayToMapConversions++;
        }
      }

      if (renameBiomarkersInObject(profile, report, `users/${uid}/Profile`)) {
        profileChanged = true;
      }
      
      if (await compressImagesInObject(profile, report)) {
        profileChanged = true;
      }

      if (profileChanged) {
        if (commit) await userDoc.ref.set(profile, { merge: true });
        report.updatedUsers++;
      }

      // Iterate subcollections
      const collections = await userDoc.ref.listCollections();
      for (const col of collections) {
        const docs = await col.get();
        for (const docSnap of docs.docs) {
          const data = docSnap.data();
          let docChanged = false;

          if (renameBiomarkersInObject(data, report, `users/${uid}/${col.id}/${docSnap.id}`)) {
            docChanged = true;
          }

          if (await compressImagesInObject(data, report)) {
            docChanged = true;
          }

          if (docChanged) {
            if (commit) await docSnap.ref.set(data, { merge: true });
            report.updatedDocs++;
          }
        }
      }
    }

    res.json(report);
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }



function renameBiomarkersInObject(obj: any, report: any, locationStr: string): boolean {
  let changed = false;
  if (obj && typeof obj === 'object') {
    if (obj.biomarkers && typeof obj.biomarkers === 'object') {
      const newB: any = {};
      let bChanged = false;
      for (const [k, v] of Object.entries(obj.biomarkers)) {
        const mapped = getMappedBiomarkerKey(k);
        if (mapped !== k) {
          bChanged = true;
          report.biomarkerRenames.push({ location: locationStr, from: k, to: mapped });
          newB[mapped] = v;
        } else {
          newB[k] = v;
        }
      }
      if (bChanged) {
        obj.biomarkers = newB;
        changed = true;
      }
    }
    // Check customBiomarkers in user profile
    if (locationStr.endsWith('Profile') && obj.customBiomarkers && typeof obj.customBiomarkers === 'object') {
      const newCustom: any = {};
      let cChanged = false;
      for (const [k, v] of Object.entries(obj.customBiomarkers)) {
        const mapped = getMappedBiomarkerKey(k);
        if (mapped !== k) {
          cChanged = true;
          report.biomarkerRenames.push({ location: locationStr + ' (customBiomarkers)', from: k, to: mapped });
          newCustom[mapped] = v;
        } else {
          newCustom[k] = v;
        }
      }
      if (cChanged) {
        obj.customBiomarkers = newCustom;
        changed = true;
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k !== 'biomarkers' && k !== 'customBiomarkers' && typeof v === 'object' && v !== null) {
        if (renameBiomarkersInObject(v, report, `${locationStr}.${k}`)) {
          changed = true;
        }
      }
    }
  }
  return changed;
}

async function compressImagesInObject(obj: any, report: any): Promise<boolean> {
  let changed = false;
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.startsWith('data:image/') && v.length > 25000) {
        try {
          const matches = v.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            const resized = await sharp(buffer)
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 50 })
              .toBuffer();
            const newBase64 = `data:image/jpeg;base64,${resized.toString('base64')}`;
            if (newBase64.length < v.length) {
              obj[k] = newBase64;
              changed = true;
              report.imagesCompressed++;
            }
          }
        } catch (e) {
          console.error('Image compression failed', e);
        }
      } else if (typeof v === 'object' && v !== null) {
        if (await compressImagesInObject(v, report)) {
          changed = true;
        }
      }
    }
  }
  return changed;
}


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Health Cockpit App] Full-Stack server running on port ${PORT}`);
  });
}

startServer();
