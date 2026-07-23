import { z } from "zod";
import { extractBalancedJson } from "./server_pure_helpers";

export const ScoutItemComponentSchema = z.object({
  searchQuery: z.string(),
  volumePercentage: z.number().finite().positive(),
});

export const ScoutItemSchema = z.object({
  keyword: z.string().optional(),
  itemConfidence: z.string().optional(),
  estimatedWeightGrams: z.number().finite().positive().optional(),
  cookingMethod: z.string().optional(),
  components: z.array(ScoutItemComponentSchema).optional(),
}).passthrough();

export const VisionScoutSchema = z.object({
  items: z.array(ScoutItemSchema).optional(),
}).passthrough();

export const scoutSystemInstruction = `You are a fast, precise visual food identification and localization agent. You will receive one or more images along with the user's optional textual message.
STEP 1 — IMAGE CLASSIFICATION (do this FIRST for every image):
For each image, determine if it contains:
  (a) A product label, price tag, or packaging showing a food name and/or weight
  (b) A close-up Nutrition Facts panel (Informasi Nilai Gizi) or Ingredients list (Komposisi)
  (c) An actual food photo showing prepared or raw ingredients
  (d) A cooking scene (e.g., boiling in a pot, frying on a pan)
  (e) A restaurant menu, promotional poster, billboard, or combo board listing multiple options
STEP 2 — DENSITY APPRAISAL:
Appraise ALL provided images together and estimate the TOTAL number of distinct food items, menu options, or physical packages present across every image. Then follow ONE branch below. In BOTH branches you MUST always populate the "items" array with real JSON objects — never a flattened or delimited text row — and every object MUST carry a real \`boundingBox2D\`. This must work correctly whether there are 2 items on the table or 100 items on a menu.

BRANCH A — LOW DENSITY (< 15 total items):
- Extract EVERY single food item, product package, or nutrition label individually into "items".
- Draw a tight, precise \`boundingBox2D\` around each item.
- MEAL vs. COMPARISON ROUTING: if the images show distinct packaged products or menu options of the same category meant to be compared (e.g., 4 different bread wrappers, or a menu of options), set "recommendedMode" to "evaluation". If the images show ingredients or dishes meant to be eaten together as one meal (e.g., fish + rice + a side, or several grocery items for a single meal), set "recommendedMode" to "new_log".
- COMPONENT DECOMPOSITION DIRECTIVE: For every identified item, decompose complex dishes or products into their core sub-components inside the 'components' array with corresponding estimated volume percentages (totaling 100%). For example, 'siomai with seaweed' becomes keyword: 'siomai dumpling' with component: 'pork dumpling' (80%) and component: 'seaweed' (20%). If the food is simple and has no sub-components, just add a single component matching the base food name with 100% volume.
- FIRST-PRINCIPLES RESTAURANT MEAL DECOMPOSITION DIRECTIVE: For restaurant or cooked meals (e.g., pan-fried steak, grilled salmon, pasta, fried rice), think in terms of raw base ingredients for database querying (e.g., 'raw beef steak', 'raw potato') so that the database lookup retrieves raw nutrient baselines. Identify the exact restaurant cooking method (e.g., 'pan_fried', 'roasted', 'deep_fried') so backend coefficients will properly add cooking fat, calories, and seasoning salt.

BRANCH B — HIGH DENSITY (>= 15 total items):
Still populate "items" as real JSON objects. Adapt HOW you group items based on the visual layout to guarantee 100% coverage without crashing token limits:
  1. TEXT-HEAVY STRUCTURED MENUS: Use semantic category blocking. One entry per section (e.g. "Aneka Ikan Bakar"). Draw ONE \`boundingBox2D\` around the section. Set "keyword" to the category name, and "originalName" to a comma-separated list of items.
  2. PHYSICAL GROCERY SHELVES & IMAGE GRIDS (e.g. rows of drinks or chips): Group by PHYSICAL SPACE.
     - CRITICAL REJECTION: You are strictly FORBIDDEN from drawing a single massive bounding box around the entire image (e.g., covering the whole frame).
     - You MUST physically slice the image into 3 to 6 distinct spatial rows or shelves (e.g., "Top Row", "Middle Row").
     - Create one "items" object per row. 
     - Set \`keyword\` to the spatial name. 
     - Set \`originalName\` to a comma-separated list of all legible products in that specific row.
  3. UNSTRUCTURED TEXT LISTS: Group by physical proximity. One \`boundingBox2D\` per cluster of roughly 8-10 lines.
  Every "items" entry, however it is grouped, MUST still carry a real, specific \`boundingBox2D\` and \`sourceImageIndex\` — never default to the full image bounds unless the item genuinely fills the entire frame.
STEP 3 — CORE EXTRACTION & GROUPING LAWS (apply in both branches):
- PRODUCT/PRICE LABELS (type a): Read the EXACT food name and weight. Convert kg to grams.
- NUTRITION FACTS LABELS (type b): DO NOT perform math or scale values per 100g. Transcribe the EXACT total package weight, serving size weight, and nutrients per serving exactly as printed into the "rawNutritionLabel" object. Extract the full printed ingredients/Komposisi text into "ingredientsList". If an item has NO legible physical nutrition panel visible, leave "rawNutritionLabel" as {} and "ingredientsList" as null — do not estimate or hallucinate these values. The "nutritionFacts" field is reserved for downstream use and must always be left as {} by you; never populate it yourself.
- FOOD PHOTOS (type c): Identify items and estimate weight using visual references (plates, hands, packaging markers). CRITICAL: Scale weight estimates to the actual visual size (e.g., miniature street-food vs. large restaurant portions) rather than defaulting to textbook averages. If traditional components (like dipping sauces) are physically absent, state this explicitly in anomalyFlags (e.g., "sauce absent").
- MENUS AND POSTERS (type e): covered by the density branches above.
- CLASSIFICATION LAW: Base "contentType" on the primary visual layout of the image, NOT the extraction method used.
  * If the image is a restaurant menu, promotional poster, or combo board (regardless of whether it contains food photos or just text), you MUST set "contentType" to "menu_or_poster".
  * If the image is a photo of a physical meal on a table, raw ingredients, or a single food item without a menu layout, set "contentType" to "visual".
  * If the image is purely a close-up of a receipt or nutrition label, set "contentType" to "text".
CRITICAL RULES:
- \`keyword\` MUST be a short, clean, database-friendly English name so the backend search functions successfully (e.g., "beef blade cut", "sweet potato").
- \`originalName\` PRESERVATION: This field is clinically vital. You MUST capture the EXACT local/original name and preparation words exactly as written or observed on the menu or label (e.g., "Yakiimo", "Daging Empal", "Ayam Goreng"). Do NOT translate, normalize, or summarize this field.
- THE "FLAG AND EXTRACT" DIRECTIVE (STRICT):
  Never silently drop or omit an item due to glare, abbreviations, hidden food, or OCR contradictions. You must extract EVERY item you see to the best of your ability.
  CRITICAL: If you see a package, label, or food item but are unsure what it is, you MUST STILL EXTRACT IT. Use 'unknown item' or a best guess for the keyword. Do NOT drop it.
  Instead of omitting, you MUST use the \`anomalyFlags\` array to explain the issue (e.g., ["glare covering letters", "guessed Ikan from IK", "unidentifiable package"]). If any anomaly is flagged, you are mathematically required to set \`itemConfidence\` to Medium or Low.
- FOREGROUND ISOLATION vs. SHELF SCANNING (CRITICAL OVERRIDE):
  Before extracting, determine the camera's focus and depth of field:
  * HELD ITEMS / CLOSE-UPS: If the image clearly shows a hand holding a specific product in the foreground, or is a clear macro close-up of a single package/label, that single item is the SOLE subject. You MUST completely ignore and omit all out-of-focus products and background store shelves. The "Flag and Extract" rule does NOT apply to background inventory in this scenario. Do not extract them.
  * WIDE SHELF SCANS: If the image is a wide shot of a grocery shelf or display with NO single item held in the foreground, then the shelf itself is the primary subject. Proceed with Branch B density rules.
  * PLATED MEALS: For a meal on a table, extract ALL visible dishes, sides, drinks, and condiments as SEPARATE items in the \`items\` array, each with its OWN distinct \`boundingBox2D\`. Do NOT group distinct foods (e.g., a steak and its side of potatoes) into a single overarching "meal" item. They must be individually bounded and listed. Never treat a side dish on a table as "background inventory."
- USER TEXT SUPREMACY & TARGET FILTERING (CRITICAL FOCUS OVERRIDE):
  The user's text message is the absolute authority on WHAT to extract and HOW MUCH:

  Subject Isolation (What to extract): If the user's text explicitly names a specific item, category, or subset of foods (e.g., "I ate the mung bean pia", "Compare the chips", "Is this beef healthy?", "Just the red bags"), you MUST restrict your extraction ONLY to the items that semantically match their text. Completely ignore and omit all other visible foods, menu items, or products in the image, treating them as irrelevant background.

  Explicit Quantities (How much): Treat relative quantities and absolute weights differently.

  Absolute Weights: If the user text provides a hard weight (e.g., "150g", "4 oz"), use that exact number, overriding visual volume entirely.

  Relative Quantities: If the user text provides a fraction, percentage, or piece count (e.g., "1/4 of", "half", "3 pieces"), you MUST first visually estimate the total weight of the specific whole item shown in the image. Then, apply the user's math to your visual estimate. NEVER apply user fractions to generic textbook averages; ground the math in the visual size of the actual food photographed.
- SEMANTIC ALIGNMENT & KEYWORD ACCURACY:
  The English keyword you generate MUST biologically and semantically match the text you extracted in originalName and what is visually in the photo. Do not hallucinate categories or keys. If the originalName indicates a protein/meat (e.g., "Ikan" means fish), the keyword cannot be a vegetable. If unsure of a translation, default to a generic category (e.g., "fish", "meat").
  * Be extremely precise and cautious with local Southeast Asian translations. For example, "Takap putih" (or "Kakap putih") is Barramundi/Asian Seabass, which is a protein/fish. It is NOT mustard green or any other vegetable.
  * In images with multiple raw ingredients or mixed items, examine the physical items in detail. If multiple fish species or parts of different fishes are cut and grouped together in the same bowl or plate (e.g., cut steaks of Pomfret/"Bawal laut" and Barramundi/"Takap putih" in one bowl), identify them as separate, distinct items in the JSON list with their respective bounding boxes.
- CRITICAL LOCALIZATION DIRECTIVE:
  For EVERY item in \`items\`, you MUST compute and provide \`boundingBox2D\` as a 4-element array of normalized integers \`[ymin, xmin, ymax, xmax]\` on a scale of 0 to 1000 (e.g. \`[150, 200, 800, 750]\`) tightly surrounding the food item or package in the image. NEVER omit \`boundingBox2D\` or default to \`[0, 0, 1000, 1000]\` unless the item genuinely spans the entire frame.
- CRITICAL NON-EMPTY ITEMS MANDATE:
  You MUST ALWAYS populate the \`items\` array with real JSON item objects whenever food items are present in the image. NEVER return an empty \`items\` list or top-level summary keys instead of populating \`items\`.

=== SYSTEM CONSTRAINTS ===

First, think step-by-step in plain text.

Second, output exactly one JSON object.

The JSON must contain ONLY the fields requested below. Do NOT include a scratchpad field inside the JSON.

=== OUTPUT INSTRUCTIONS ===

First, write out your step-by-step reasoning in plain text. Explain how you are classifying the image, density appraisal, items found, and your weight reasoning for each.

Then, output your final mapped results in a raw, valid JSON block.

Ensure EVERY JSON field is correctly separated by a comma and that all strings are properly closed with quotation marks. Do not add markdown formatting blocks (such as \`\`\`json) around your JSON response.

JSON SCHEMA STRICT REQUIREMENT:
{
  "recommendedMode": "new_log | evaluation | discussion",
  "contentType": "visual | menu_or_poster | text",
  "items": [
    {
      "keyword": "string (The core base item only. No toppings, flavors, or subcomponents. e.g., 'siomai dumpling', 'pomfret fish')",
      "estimatedWeightGrams": "number",
      "components": [
        {
          "searchQuery": "string (Simple component name for the database, e.g., 'pork dumpling' or 'seaweed')",
          "volumePercentage": "number (Volume percentage of this component in the total item weight, e.g., 80)"
        }
      ],
      "originalName": "string",
      "visualIngredients": ["string"],
      "source": "label | visual",
      "boundingBox2D": [150, 200, 800, 750],
      "sourceImageIndex": 0,
      "ingredientsList": "string | null",
      "rawNutritionLabel": "{ 'servingSize': string, 'calories': number, 'protein': string, 'totalFat': string, 'saturatedFat': string, 'totalCarbohydrate': string, 'sugar': string, 'sodium': string }",
      "nutritionFacts": "{}",
      "anomalyFlags": ["string"],
      "itemConfidence": "High | Medium | Low",
      "cookingMethod": "deep_fried | pan_fried | stir_fried | roasted | boiled | steamed | grilled | baked | raw | unknown"
    }
  ],
  "cookingMethod": "string",
  "scanCompleteness": "full | partial"
}
`;

function validateOrFallback<T>(
  schema: z.ZodType<T>,
  parsed: any,
  rawText: string,
  label: string,
  fallback: T,
  addDebugLog: (msg: string) => void
): T {
  const result = schema.safeParse(parsed);
  if (!result.success) {
    addDebugLog(`[Zod Validation Failed] ${label}: ${result.error.message}. Raw output: ${rawText}`);
    return fallback;
  }
  return result.data;
}

export function mergeScoutItems(visionItems: any[], llmItems: any[] | null | undefined): any[] {
  if (!visionItems || visionItems.length === 0) {
    return (llmItems && llmItems.length > 0) ? llmItems : [];
  }
  if (!llmItems || llmItems.length === 0) {
    return visionItems;
  }
  return visionItems.map((vItem: any, idx: number) => {
    const lItem = llmItems.find((l: any) => l.scoutIndex === vItem.scoutIndex) || llmItems[idx];
    if (lItem) {
      return {
        ...vItem,
        ...lItem,
        rawNutritionLabel: vItem.rawNutritionLabel,
        nutritionFacts: vItem.nutritionFacts,
        ingredientsList: vItem.ingredientsList,
        visualIngredients: vItem.visualIngredients || [],
        boundingBox2D: vItem.boundingBox2D,
        sourceImageIndex: vItem.sourceImageIndex,
        source: vItem.source
      };
    }
    return vItem;
  });
}

export interface VisionScoutResult {
  scratchpad?: string;
  items: any[];
  scoutConfidenceRating: string;
  scoutConfidenceComment: string;
  scoutCookingMethod: string;
  visionScoutContentType: string;
  scoutRecommendedMode: string | null;
  queriesToSearch: string[];
  visionScoutRanAndReturnedItems: boolean;
}

export function parseAndHealVisionScout(
  scoutOutput: any,
  addDebugLog: (msg: string) => void
): VisionScoutResult {
  let parsedScout: any = null;
  let extractedScratchpad = "";
  try {
    parsedScout = typeof scoutOutput === "string" ? JSON.parse(scoutOutput) : scoutOutput;
  } catch (e) {
    const cleanOutput = typeof scoutOutput === "string" ? scoutOutput : JSON.stringify(scoutOutput);
    const jsonStr = extractBalancedJson(cleanOutput);
    extractedScratchpad = cleanOutput.replace(jsonStr, "").trim();
    parsedScout = JSON.parse(jsonStr);
  }

  parsedScout = validateOrFallback(
    VisionScoutSchema,
    parsedScout,
    typeof scoutOutput === "string" ? scoutOutput : JSON.stringify(scoutOutput),
    "Vision Scout",
    { items: [] },
    addDebugLog
  );

  let visionScoutItems: any[] = [];
  let scoutConfidenceRating = "High (>90%)";
  let scoutConfidenceComment = "";
  let scoutCookingMethod = "";
  let visionScoutContentType = "visual";
  let scoutRecommendedMode: string | null = null;
  let queriesToSearch: string[] = [];
  let visionScoutRanAndReturnedItems = false;

  if (parsedScout) {
    let lowestConfidence = "High (>90%)";
    let globalComment = "";
    if (Array.isArray(parsedScout.items)) {
      for (const it of parsedScout.items) {
        if (it.itemConfidence && it.itemConfidence.toLowerCase().includes("low")) {
          lowestConfidence = "Low (<50%)";
        } else if (it.itemConfidence && it.itemConfidence.toLowerCase().includes("medium") && lowestConfidence !== "Low (<50%)") {
          lowestConfidence = "Medium (50-90%)";
        }
        if (Array.isArray(it.anomalyFlags) && it.anomalyFlags.length > 0) {
          globalComment += `[${it.keyword}]: ${it.anomalyFlags.join(', ')}. `;
        }
      }
    }
    scoutConfidenceRating = lowestConfidence;
    scoutConfidenceComment = globalComment.trim();
    scoutCookingMethod = parsedScout.cookingMethod || "";
    const rawType = (parsedScout.contentType || "").toLowerCase();
    visionScoutContentType = (rawType === "text" || rawType === "menu_or_poster" || rawType === "visual_or_posted") ? rawType : "visual";
    scoutRecommendedMode = parsedScout.recommendedMode || null;

    // Parse compactSpreadsheet if present
    if (Array.isArray(parsedScout.compactSpreadsheet) && parsedScout.compactSpreadsheet.length > 0) {
      const spreadsheetItems: any[] = [];
      parsedScout.compactSpreadsheet.forEach((row: string) => {
        if (!row || typeof row !== 'string') return;
        const parts = row.split('|');
        
        if (parts.length >= 5) {
          const category = parts[0]?.trim();
          const keyword = parts[1]?.trim();
          const originalName = parts[2]?.trim();
          const weightOrPrice = parts[3]?.trim();
          const bboxStr = parts[4]?.trim();
          
          let weightGrams = 150;
          if (weightOrPrice) {
            const cleanWeight = parseFloat(weightOrPrice.replace(/[^0-9.]/g, ''));
            if (!isNaN(cleanWeight)) {
              weightGrams = cleanWeight > 50 ? cleanWeight : 300;
            }
          }
          
          let boundingBox2D = [0, 0, 1000, 1000];
          if (bboxStr) {
            const coords = bboxStr.split(',').map(c => parseFloat(c.trim()));
            if (coords.length === 4 && coords.every(num => !isNaN(num))) {
              boundingBox2D = coords;
            }
          }
          
          spreadsheetItems.push({
            keyword,
            originalName: category ? `[${category}] ${originalName}` : originalName,
            estimatedWeightGrams: weightGrams,
            source: "visual",
            boundingBox2D,
            sourceImageIndex: 0
          });
        } else if (parts.length >= 4) {
          const keyword = parts[0]?.trim();
          const originalName = parts[1]?.trim();
          const weightGrams = parseFloat(parts[2]?.trim()) || 100;
          const bboxStr = parts[3]?.trim();
          let boundingBox2D = [0, 0, 1000, 1000];
          if (bboxStr) {
            const coords = bboxStr.split(',').map(c => parseFloat(c.trim()));
            if (coords.length === 4 && coords.every(num => !isNaN(num))) {
              boundingBox2D = coords;
            }
          }
          spreadsheetItems.push({
            keyword,
            originalName,
            estimatedWeightGrams: weightGrams,
            source: "visual",
            boundingBox2D,
            sourceImageIndex: 0
          });
        }
      });
      if (spreadsheetItems.length > 0) {
        if (!Array.isArray(parsedScout.items)) {
          parsedScout.items = [];
        }
        parsedScout.items = [...parsedScout.items, ...spreadsheetItems];
      }
    }

    if (Array.isArray(parsedScout.items)) {
      let explodedItems: any[] = [];
      parsedScout.items.forEach((item: any) => {
        const rawOriginal = item.originalName || item.keyword || "";
        const hasPrintedMacros = item.rawNutritionLabel && 
                   (item.rawNutritionLabel.calories || item.rawNutritionLabel.protein || item.rawNutritionLabel.totalFat);
        const hasMultipleCommas = (rawOriginal.match(/,/g) || []).length >= 2;

        if (!hasPrintedMacros && hasMultipleCommas) {
          const dishNames = rawOriginal.split(",").map((n: string) => n.trim()).filter((n: string) => n.length > 0);
          dishNames.forEach((dishName: string) => {
            explodedItems.push({
              ...item,
              originalName: dishName,
              keyword: item.keyword,
              name: dishName
            });
          });
        } else {
          explodedItems.push(item);
        }
      });

      visionScoutItems = explodedItems.map((item: any, idx: number) => {
        let newItem = { ...item, scoutIndex: idx };
        if (!newItem.boundingBox2D || !Array.isArray(newItem.boundingBox2D) || newItem.boundingBox2D.length !== 4) {
          newItem.boundingBox2D = [100, 100, 900, 900];
        }
        if (newItem.sourceImageIndex === undefined || newItem.sourceImageIndex === null) {
          newItem.sourceImageIndex = 0;
        }
        const rawLabelHasRealData = newItem.rawNutritionLabel && typeof newItem.rawNutritionLabel === 'object'
          ? Object.keys(newItem.rawNutritionLabel).some((k: string) => {
              if (k === 'servingSize' || k === 'weight' || k === 'servingsPerContainer') return false;
              const v = newItem.rawNutritionLabel[k];
              return v !== undefined && v !== null && v !== '' && v !== '-' && v !== '--';
            })
          : false;
        if (newItem.rawNutritionLabel && typeof newItem.rawNutritionLabel === 'object' && rawLabelHasRealData) {
          const getVal = (key: string) => {
            const val = newItem.rawNutritionLabel[key];
            if (val === undefined || val === null) return 0;
            const match = String(val).match(/[\d.]+/);
            return match ? parseFloat(match[0]) : 0;
          };
          
          const fat = getVal('totalFat') || getVal('fat') || 0;
          const carbs = getVal('totalCarbohydrate') || getVal('carbohydrate') || getVal('carbohydrates') || 0;
          const protein = getVal('protein') || 0;
          
          // 1. Fat Overflow (Saturated Fat > Total Fat)
          const satFat = getVal('saturatedFat') || 0;
          let correctedFat = fat;
          if (satFat > fat) {
            correctedFat = satFat;
            if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
            newItem.anomalyFlags.push(`fat overflow corrected: totalFat increased from ${fat} to ${satFat}`);
            if (newItem.rawNutritionLabel.totalFat !== undefined) newItem.rawNutritionLabel.totalFat = satFat;
            else newItem.rawNutritionLabel.fat = satFat;
          }
          
          // 2. Serving Mismatch / Macros Overflow
          let servingSizeGrams = 100; // default for per 100g
          if (newItem.rawNutritionLabel.servingSize) {
            const ssMatch = String(newItem.rawNutritionLabel.servingSize).match(/[\d.]+/);
            if (ssMatch) servingSizeGrams = parseFloat(ssMatch[0]);
          }
          const totalMacros = correctedFat + carbs + protein;
          if (totalMacros > servingSizeGrams + 2) {
            if (!newItem.anomalyFlags) newItem.anomalyFlags = [];
            newItem.anomalyFlags.push(`macros overflow: sum of fat, carbs, protein (${totalMacros}g) exceeds serving size (${servingSizeGrams}g)`);
          }

          // 3. The Algebraic Healer
          const safeMath = (value: number) => Math.max(0, Math.round(value * 10) / 10);
          const expectedCalories = (correctedFat * 9) + (carbs * 4) + (protein * 4);
          const c = getVal('calories');

          const healAnomaly = (itm: any, macroName: string) => {
              if (itm.anomalyFlags && Array.isArray(itm.anomalyFlags)) {
                  itm.anomalyFlags = itm.anomalyFlags.filter((f: string) => !f.toLowerCase().includes(macroName) && !f.toLowerCase().includes('legible'));
                  if (itm.anomalyFlags.length === 0) {
                     itm.itemConfidence = "High";
                  }
              }
          };

          if (c === 0 || (expectedCalories > 0 && Math.abs(expectedCalories - c) / expectedCalories > 0.20)) {
              newItem.originalCalories = c;
              newItem.autoCorrectedCalories = true;
              newItem.rawNutritionLabel.calories = Math.round(expectedCalories);
              healAnomaly(newItem, "calories");
          } else if (correctedFat === 0 && c > 0) {
              newItem.rawNutritionLabel.totalFat = safeMath((c - (carbs * 4) - (protein * 4)) / 9);
              if (newItem.rawNutritionLabel.fat === 0) { newItem.rawNutritionLabel.fat = newItem.rawNutritionLabel.totalFat; }
              healAnomaly(newItem, "fat");
          } else if (carbs === 0 && c > 0) {
              newItem.rawNutritionLabel.totalCarbohydrate = safeMath((c - (correctedFat * 9) - (protein * 4)) / 4);
              if (newItem.rawNutritionLabel.carbohydrates === 0) { newItem.rawNutritionLabel.carbohydrates = newItem.rawNutritionLabel.totalCarbohydrate; }
              healAnomaly(newItem, "carbohydrates");
              healAnomaly(newItem, "carbs");
          } else if (protein === 0 && c > 0) {
              newItem.rawNutritionLabel.protein = safeMath((c - (correctedFat * 9) - (carbs * 4)) / 4);
              healAnomaly(newItem, "protein");
          }

          if (newItem.anomalyFlags && Array.isArray(newItem.anomalyFlags)) {
              newItem.anomalyFlags = newItem.anomalyFlags.filter((f: string) => !f.toLowerCase().includes('ingredient'));
              if (newItem.anomalyFlags.length === 0) {
                  newItem.itemConfidence = "High";
              }
          }
        }
        return newItem;
      });

      for (const item of visionScoutItems) {
        if (item.components && Array.isArray(item.components) && item.components.length > 0) {
          item.components.forEach((c: any) => {
            if (c.searchQuery) {
              queriesToSearch.push(c.searchQuery);
            }
          });
          visionScoutRanAndReturnedItems = true;
        } else if (item.keyword) {
          queriesToSearch.push(item.keyword);
          visionScoutRanAndReturnedItems = true;
        }
      }
    }
  }

  return {
    scratchpad: parsedScout?.scratchpad || extractedScratchpad,
    items: visionScoutItems,
    scoutConfidenceRating,
    scoutConfidenceComment,
    scoutCookingMethod,
    visionScoutContentType,
    scoutRecommendedMode,
    queriesToSearch,
    visionScoutRanAndReturnedItems
  };
}
