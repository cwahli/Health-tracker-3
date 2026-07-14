# Health Cockpit App — AI Handover Document
*Last updated: 2026-07-12 | Always check GitHub commits before starting any session*

## 1. Source of Truth
- **Live codebase:** https://github.com/cwahli/Health-tracker-2
- **Always read the latest commits** before working. The AI Studio agent is self-directed and may have progressed since this doc was last written.
- **This document lives in the repo root** as `AI_HANDOVER.md` and must be updated after each significant session.

---

## 2. Architecture
| Layer | Tech | Notes |
|---|---|---|
| Frontend | React (TypeScript) | src/ |
| Backend | Express (TypeScript) | server.ts (~4500 lines) |
| Database | Firebase Firestore | Free tier — minimize reads/writes |
| Auth | Firebase Auth | Google sign-in |
| AI | Gemini via @google/genai SDK | See quota table below |
| Hosting | Firebase App Hosting | Cloud Run |

## 3. AI Models & Quotas
| Model ID (in code) | Friendly Name | Daily Quota | When to Use |
|---|---|---|---|
| gemini-3.5-flash-lite | Flash Lite | 500 calls/day | ALL routine tasks (default) |
| gemini-3.5-flash | Flash | 20 calls/day | Moderate complexity |
| gemini-3.1-pro | Pro | 20 calls/day | Complex, architectural |

There is NO gemini-2.5-flash. Always default to Flash Lite.

## 4. Operating Rules
- Read this document at the start of every session.
- Execute the next unchecked item in Section 7 (Task Queue).
- Commit changes to GitHub with a meaningful commit message.
- Update this document with what you did and tick off completed tasks.
- Never undo existing fixes — all prior patches are intentional.
- Never delete user data (biomarkers, food logs, targets).
- Never add extra Firebase reads/writes — free tier has limits.
- Never change agent model IDs without explicit instruction.

## 5. Key Components
### Server (server.ts)
- `callUnifiedLLM()` — central LLM dispatcher. Params: modelId, systemInstruction, promptText, imagePayloads, responseMimeType, maxOutputTokens.
- `sanitizeForFirestore()` — deep-cleans undefined fields before any Firestore write. Applied to all writes.
- Food log endpoint pipeline:
  - Stage 1: Vision Scout (image-only, identifies food keywords via lightweight LLM)
  - Stage 2: DB Search (USDA + OpenFoodFacts using Vision Scout keywords)
  - Stage 3: RouteAgent (full clinical dietitian JSON response, 4 modes: new_log / discuss / modify / evaluation)
  - JSON parse with truncation repair fallback.
- maxOutputTokens: 3072 is set on the RouteAgent call to prevent truncation (raised from 2048 on Jul 12 for headroom now that itemsBreakdown is emitted earlier in the schema).

### Frontend
- `src/components/LogChat.tsx` — chat component used by food log agent.
- `src/components/FoodHistoryTab.tsx` — food log history.
- `src/App.tsx` — main app, auth, data loading, local snapshot/undo system.

### Chat Session Storage
- Conversation history is stored in sessionStorage (per-session) as primary.
- Firestore is the durable backup for history.
- Local snapshots (up to 5) in localStorage for undo:
  - Base64 images are stripped to stay within 5–10 MB localStorage limit
  - **Known limitation**: Undoing a food log revision loses the attached image
  - Recommendation: Reimport the image if needed, or use Firestore cloud backup to recover with images

## 6. What Has Been Fixed (Do Not Undo)
| Date | Fix |
|---|---|
| Jul 11 | useRef missing import in App.tsx causing blank screen |
| Jul 11 | firebase-admin ESM import fixed |
| Jul 12 | maxOutputTokens: 2048 added to RouteAgent LLM call |
| Jul 12 | Truncation repair fallback for malformed JSON |
| Jul 12 | sanitizeForFirestore() applied to all Firestore writes |
| Jul 12 | MODE C (modify) routing strengthened in system prompt |
| Jul 12 | weightGrams schema updated — integer strings only, no decimals |
| Jul 12 | Biomarker deletion safeguards added |
| Jul 12 | LLM output switched from YAML to JSON for reliability |
| Jul 12 | Firestore security rules restricted to user-specific paths |
| Jul 12 | Biomarker review endpoint implemented |
| Jul 12 | Stopped truncation of System Instruction and User Prompt in diagnostic logs |
| Jul 12 | Implemented sanitizeMealWeight() to defensively validate/guard meal weight entries |
| Jul 12 | Reordered foodData schema and textual descriptions to prioritize nutrient-carrying itemsBreakdown |
| Jul 12 | Raised RouteAgent output-token limit from 2048 to 3072 for headroom |
| Jul 12 | Stripped customBiomarkers from lightProfile payload for food routes |
| Jul 12 | Enforced strict required fields across all nested levels of foodAnalyzeSchema |

## 7. Task Queue
Pick the first unchecked item. Complete it. Tick it off. Update Section 9 (Session Log).
### P0 — Critical
- [x] **Fix: Food weight schema integers + USDA extraction + Map priority**
  Enforce Type.INTEGER on all weight schema fields to stop runaway float decimals. Update USDA search insertion to use extractUSDANutrientsPer100g to fix zero-value fields (protein, sat fat, sodium). Prioritize dbMatchMap lookup over the matches array in server.ts.
  Model: gemini-3.5-flash
- [x] **Fix B: Skip Vision Scout + DB search on weight-only modifications**
  When activeMeal is set AND no new image is attached AND user message matches /\d+\s*g(ram)?s?/i, skip Vision Scout and DB Search entirely and jump straight to RouteAgent. DB search must NEVER use the raw user message text as a search query — only Vision Scout keywords.
  Model: gemini-3.5-flash
- [x] **Fix: Server-Side Nutrition Calculation (Accurate Calories/Nutrients)**
  Simplified LLM's `new_log` schema for `itemsBreakdown` by removing direct nutrient requirements from prompt text unless `dbSource === 'label'`. The backend computes and aggregates nutrients dynamically from standard DB matches or high-precision local database.
  Model: gemini-3.5-flash
### P1 — Important
- [x] **Fix: Food log card weight not updating after modify response**
  When RouteAgent returns mode "modify" with modificationCommand, the frontend (LogChat.tsx) must apply the weight change to the active meal card display and recalculate nutrient display. Currently the card shows the original weight even after correction.
  Model: gemini-3.5-flash
- [x] **Fix: Verify chat session scratchpad uses sessionStorage**
  Verified that conversation history is saved to sessionStorage for unauthenticated users. Refactoring required for authenticated users to use sessionStorage as primary store, currently writes to Firestore on every message.
  Model: gemini-3.5-flash-lite
- [x] **Fix: Display Scout Log History**
- [x] **Fix 1-A: Add foodType field to the JSON schema**
- [x] **Fix 1-B: Update LLM prompt — DATA EXTRACTION DEPTH RULES**
- [x] **Fix 1-C: Replace server_food_db.ts with food-type classification table**
- [x] **Fix 1-D: Update server.ts — Replace all getNutrientsForFood call sites**
- [x] **Fix 1-E: Update modify → add_item handler**
- [x] **Fix 2-A: Replace scout system instruction**
- [x] **Fix 2-B: Add keyword cleaning before USDA/OFF search**
- [x] **Fix 2-C: Return visionScoutItems in the API response**
- [x] **Fix 2-D: Display scout log in frontend**
- [x] **Fix 2-E: Inject scout context into clinical LLM prompt context**
- [x] **Fix 3: Food Comparison: Scale to 10 Items**
- [x] **Fix 5: Food Agent: Alias vs. Identity Change**
- [x] **Fix 6: Biomarker Batch Processing Fix**
### P2 — Future
- [ ] **Verify food log card layout has no tab switcher regression**
  The correct layout is: card (meal name, date, nutrients) + collapsible nutrition table. There must be NO Prose/Table/Bento tab switcher on the food log chat. Check the current state first. Only fix if the regression is present.
  Model: gemini-3.5-flash-lite
- [ ] **Expand chat component to all 13 agents**
  LogChat.tsx will serve all agents. Add an agentConfig object keyed by agentType to declare per-agent layouts. Do not implement until food log is fully stable.
  Model: gemini-3.5-flash

## 8. Open Decisions
- Scratchpad: sessionStorage as primary, Firestore as backup. Keep it. Confirmed 2026-07-12.
- Food log layout: card + collapsible table. No tab switcher. Confirmed 2026-07-12.
- DB search on modify: skip entirely. Only run on new image or fresh food description. Confirmed 2026-07-12.

## 9. Session Log
| Date | What was done | By |
|---|---|---|
| 2026-07-11 | Fixed blank screen (useRef, firebase-admin). App loads again. | Antigravity + AI Studio |
| 2026-07-12 | Fixed JSON truncation, Firestore undefined error, MODE C routing, weightGrams schema, biomarker review endpoint. 13 commits. | AI Studio (self-directed) |
| 2026-07-12 | Created this handover document. Identified remaining P0/P1 tasks. | Antigravity |
| 2026-07-12 | Verified session storage behavior for chat. | AI Studio (self-directed) |
| 2026-07-12 | Implemented Fix B (skipping scout/DB search on modification). | AI Studio (self-directed) |
| 2026-07-12 | Implemented fallback itemsBreakdown compilation. | AI Studio (self-directed) |
| 2026-07-12 | Completed Step 2 (exact server-side nutrient lookup & kJ conversion), Step 3 (system prompt log reduction), and Step 4 (Vision Scout itemsBreakdown truncation fallback). | AI Studio (self-directed) |
| 2026-07-12 | Fixed food log card display not updating on weight modification (implemented mode: modify on server & setMessages reactivity on frontend). | AI Studio (self-directed) |
| 2026-07-12 | Fixed Food Weight Schema types to Type.INTEGER / Type.NUMBER, unified USDA/OFF extraction using robust helpers, and prioritized dbMatchMap lookup. | AI Studio (self-directed) |
| 2026-07-12 | Fixed whole-meal weight modify scaling bug, rounded raw USDA/OFF search numbers to block repetition loops, and scoped dropdown filters exclusively to Diagnostic Logs. | AI Studio (self-directed) |
| 2026-07-12 | Stopped truncation of System Instruction and User Prompt in diagnostic logs. | AI Studio (self-directed) |
| 2026-07-12 | Implemented sanitizeMealWeight() defensive guard to prevent runaway LLM numbers from corrupting data. | AI Studio (self-directed) |
| 2026-07-12 | Reordered foodData JSON schema and textual prompt description to prioritize itemsBreakdown, preventing data loss on truncation. | AI Studio (self-directed) |
| 2026-07-12 | Raised RouteAgent output-token limit from 2048 to 3072 for headroom. | AI Studio (self-directed) |
| 2026-07-12 | Conditionally delete customBiomarkers from lightProfile for food types to reduce payload size and protect privacy. | AI Studio (self-directed) |
| 2026-07-12 | Enforced strictly-validated required properties at all nested levels of foodAnalyzeSchema to ensure Gemini outputs itemsBreakdown, risks, and healthImpact. | AI Studio (self-directed) |
| 2026-07-12 | Removed sessions dropdown in LogChat, changed Diagnostic Modal to use Discussion Thread selection, added search text highlighting in Diagnostic Modal. | AI Studio (self-directed) |
| 2026-07-12 | Updated Vision Scout prompt to check for cooking method and freshness. | AI Studio (self-directed) |
| 2026-07-12 | Replaced `{` with `[` as autocomplete trigger for variable insertion in FullScreenInstructionViewer. | AI Studio (self-directed) |
| 2026-07-12 | Updated LogChat comparison table styling to match the Clinical Calibration table style, and updated prompt schema to include Pros and Cons inside the table. | AI Studio (self-directed) |
| 2026-07-12 | Began Chat Component Consolidation Strategy: created `agentConfig.ts` with AGENT_REGISTRY containing all 13 agents, refactored `LogChat.tsx` to accept AgentType and generate welcome messages dynamically from the registry. | AI Studio (self-directed) |

## 10. LLM Gotchas & Lessons Learned
### Runaway Decimal Floats & Truncations
Issue: The LLM would output weights as strings like "150.000000000000000000000000000..." eating up the response token limit (2048) and causing JSON truncation.
Cause: Placing negative instructions in prompts (e.g. "NEVER write 150.0 or 300.000...") causes the LLM's attention mechanism to lock onto the pattern and trigger it.
Solution: Enforce Type.INTEGER in the responseSchema configuration. This blocks decimals at the API engine level. Remove negative examples from the system instruction to avoid reinforcing the behavior.
### USDA Nutrient Extraction (Substrings vs Exact Match)
Issue: USDA database lookup matches would populate nutrients with 0 values on the server.
Cause: The database matches mapping was using exact string matching for nutrient names, e.g. n.nutrientName === "protein". However, USDA nutrient names are things like "Protein, total", "Sodium, Na", or "Fatty acids, total saturated".
Solution: Always use the robust extractUSDANutrientsPer100g helper which uses .includes() substring matching. Never perform exact matches for nutrient keys.

## 11. Chat Component Consolidation Strategy
**Goal**: Expand `LogChat.tsx` to handle all 13 agents, replacing isolated agent chat modals, minimizing regressions.
**Proposed Approach**:
1. **Agent Configuration Registry**: Create an `agentConfig.ts` file exporting a map of `AgentType` -> `{ layoutSchema, capabilities, displayNames, allowedModes }`.
2. **Abstract Rendering**: Refactor `LogChat.tsx` so that it doesn't hardcode `if (type === 'food')` everywhere. Instead, it should query the config for which card renderer to use (e.g., `<FoodCard />` vs `<BiomarkerCard />`).
3. **Phased Migration**:
   - Step 1: Migrate the simplest agents first (e.g. `medical_extract`) to `LogChat.tsx` without deleting their original modals.
   - Step 2: Implement a feature flag to toggle between the old modal and the new unified chat for that specific agent.
   - Step 3: Gradually port complex agents (like the Biomarker Clinical Calibration). Wrap their unique tables (like `AgentResultTable`) as modular sub-components inside `LogChat.tsx`.
4. **State Normalization**: Unify the message payload format across all agents so that `LogChat.tsx` only ever deals with a standardized `ChatMessage` interface, while parsing specific agent outputs in the backend.

## 12. Known Intentional Behaviors (Do Not "Fix")
- **Hardcoded static report for chiwah.liu@gmail.com / cwah.liu@gmail.com / john@mail.com** in `/api/gemini/insight-analyze` (server.ts) and `src/utils/fallbackReport.ts`: on first report generation (`refinement` falsy), these accounts receive a fixed, non-live report instead of a fresh Gemini call. This is INTENTIONAL (confirmed 2026-07-13). Only follow-up refinement messages call the live model. Do not remove or "fix" this without explicit new instruction.
- **Replacement of agent6 with health_baseline in Clinical Calibration**: The Action Plan Agent (`agent6`) was fully replaced by the new Health Baseline Agent (`health_baseline`). Dead code paths for `agent6` have been cleaned up from the frontend, and the sequence now transitions directly using `health_baseline`. This replacement is intentional (confirmed 2026-07-14).

## 13. Audit Log
### 2026-07-13 — Diagnostic review
- Verified `foodAnalyzeSchema.foodData.required` correctly lists composition/benefits/risks/healthImpact/recommendation. Confirmed maxOutputTokens raised to 3072.
- Verified commit `0f516a9` fixes two real causes of the Firestore quota spike: (1) image recompression in App.tsx now only writes when the result is actually smaller; (2) `runCleanupMigration` now keyed by uid instead of email (email never matched Firestore rules requiring `request.auth.uid == userId`, so the migration silently failed/retried every session).
- Verified AGENT_REGISTRY: 12/13 agents at rolloutStatus 'unified', medical_extract still 'legacy' by design.
- Found and fixed PII leak: `/api/gemini/daily-recommendation-chat` was embedding the raw, unfiltered `userProfile` (including email, lastUpdatedAt, deleted-ID arrays) into the Gemini prompt. Replaced with whitelisted `cleanProfile`.
- This document was stale — last updated after commit `02ecd52`. Ten commits since then were undocumented. Future sessions: run `git log --oneline -20` first and reconcile against this file.
