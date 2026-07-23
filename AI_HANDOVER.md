# Health Cockpit App — Master AI Handover Document
*Last updated: 2026-07-23 (Post commit 3c608aa) | Always check GitHub commits before starting any session*

---

## 1. Source of Truth
- **Live codebase:** https://github.com/cwahli/Health-tracker-3
- **Always read the latest commits** before working. The AI Studio agent is self-directed and may have progressed since this doc was last written.
- **This document lives in the repo root** as `AI_HANDOFF.md` and must be updated after each significant session.

---

## 2. Architecture
| Layer | Tech | Notes |
|---|---|---|
| Frontend | React (TypeScript) | `src/` |
| Backend | Express (TypeScript) | `server.ts` + modular helper modules |
| Database | Firebase Firestore | Free tier — minimize reads/writes |
| Auth | Firebase Auth | Google sign-in & Email authentication |
| AI Engine | Gemini API via `@google/genai` SDK | See quota table below |
| Hosting | Google Cloud Run | Production Deployment |

---

## 3. AI Models & Quotas
| Model ID (in code) | Friendly Name | Daily Quota | When to Use |
|---|---|---|---|
| `gemini-3.5-flash-lite` | Flash Lite | ~500 calls/day | ALL routine app features (default) |
| `gemini-3.5-flash` | Flash | ~20 calls/day | Moderate complexity |
| `gemini-3.1-pro` | Pro | ~20 calls/day | Complex, multi-file refactors |

*There is NO `gemini-2.5-flash`. Always default to `gemini-3.5-flash-lite` for runtime app features.*

---

## 4. Operating Rules & Pre-Commit Checklist

### Operational Rules
- Read this document at the start of every session.
- **Task Declaration Rule**: Before starting a task, state which file(s) you expect to touch. If your actual diff touches a file outside that list, STOP and flag it for review rather than committing.
- Execute tasks in small, isolated steps. One task per session.
- Commit changes to GitHub with meaningful commit messages.
- Never undo existing fixes — all prior patches are intentional.
- Never delete user data (biomarkers, food logs, targets).
- Never add extra Firebase reads/writes — free tier has strict quota limits.
- Never change agent model IDs without explicit instruction.
- **Required Verification**: Run `npx vitest run src server_*.test.ts` and `npm run lint` before marking any task complete.

### Pre-Commit Checklist (Self-Check before every commit):
- [ ] **Literal Newline Check**: Never split text on a literal `\n` string — use `/\r?\n|\\n/` or confirm actual encoding first.
- [ ] **Division by Zero Guard**: Never divide by a field that can legitimately be 0 without a defensive guard.
- [ ] **Field Shape Impact Analysis**: When changing a field's shape (renaming/removing/retyping a key), grep every usage of that field name across the whole repo before committing — not just the file you're editing.
- [ ] **No Telemetry or Margin Clutter**: Avoid adding status lines, network indicators, or mock logging lines to UI margins. Keep outer backgrounds clean.
- [ ] **Strict User Intent Ceiling**: Implement exactly what was requested. Avoid adding unsolicited features, visual tabs, or API layers.

---

## 5. Key Components & Modular Architecture
### Server Components
- `server.ts` — main Express app, route definitions, and unified LLM dispatch.
- `server_vision_scout.ts` — Vision Scout prompt generation, JSON repair, and Zod schema validation.
- `server_nutrient_aggregation.ts` — pure nutrient calculation math, item breakdown scaling, and trace nutrient taxonomy.
- `server_pure_helpers.ts` — pure utility functions (`sanitizeForFirestore`, `sanitizeMealWeight`, number coercion guards).
- `server_food_db.ts` — database matching algorithms, USDA & OpenFoodFacts product extractions, and Mode C item index lookup.

### Frontend Components
- `src/components/LogChat.tsx` — unified chat component used by food log & health agents.
- `src/components/chat-cards/` — modularized chat card views (`BiomarkerCard`, `FoodCard`, `FoodEvaluationComparisonCard`, `FoodScoutItemPreview`, `HealthBaselineCard`, `NutritionLabelTable`, `WelcomeCard`).
- `src/components/UserManagementTab.tsx` — admin dashboard for real Firebase Auth user management.
- `src/components/FoodHistoryTab.tsx` — food log history view with detailed nutrition breakdown.
- `src/components/TrendsTab.tsx` — biomarker trajectory and nutrient analytics.
- `src/components/App.tsx` — main app shell, auth bootstrap, and auto-recompression safety patch.

### Storage & Sync Safety
- Primary store: **IndexedDB (`idb-keyval`)** to prevent 5MB `localStorage` quota crashes.
- Firestore as durable cloud backup (`{ merge: true }` mandatory on all user profile writes).
- Tombstone priority deletion (`deletedFoodLogIds`, `deletedBiomarkerLogIds`) takes absolute precedence during union merges.
- Local snapshot system (up to 5) for undo capabilities.

---

## 6. What Has Been Fixed & Historical Achievements (Do Not Undo)

| Date | Category | Fix / Milestone Description |
|---|---|---|
| Jul 11 | Stability | Fixed `useRef` missing import in `App.tsx` causing blank screen; fixed `firebase-admin` ESM imports. |
| Jul 12 | LLM Reliability | Raised `maxOutputTokens` to 3072; added truncation repair fallback for malformed JSON; reordered schema fields. |
| Jul 12 | Persistence | Implemented `sanitizeForFirestore()` across all Firestore writes; enforced strict nested `required` arrays. |
| Jul 16 | Food Card | Redesigned `FoodCard.tsx` with bracketed food categories, hero image name cleaning, and expandable preview. |
| Jul 17 | Multi-Agent | Consolidated 12 separate agent chat modals into a unified card and streaming framework. |
| Jul 18 | Theme Engine | Built dynamic CSS token registry, preset CSV export/import payload generator, and live preview cancel revert. |
| Jul 19 | Health Planning | Rebranded Projections Agent to Health Planning Agent focusing on holistic testing gaps (ApoB, HbA1c, ACR test). |
| Jul 20 | Telemetry | Overhauled `ApiCallTrackerModal.tsx` into a daily grid layout with color-coded tags and model indicators. |
| Jul 20 | Robustness | Extracted 4 modular server helper files (`server_vision_scout.ts`, `server_nutrient_aggregation.ts`, `server_pure_helpers.ts`, `server_food_db.ts`). |
| Jul 20 | Unit Testing | Integrated Vitest runner with **60 fixture-based unit tests** covering all critical food math and sync edge cases. |
| Jul 23 | Firebase Admin | Implemented read-only user listing (`/api/admin/users`), Auth/Data deletion endpoints, email reset link generators, and typed confirmation UI modals (Commit `3c608aa`). |
| Jul 23 | UI Polish | Deduplicated Health Coach global summary rendering and merged testing gap priority rationale into single UI field (Commit `3c608aa`). |
| Jul 23 | Vision Scout | Updated Scout `responseSchema` with `sourceImageIndex`, `scanCompleteness`, and nutrition label/ingredient fields; added `skipThinking` parameter to `callUnifiedLLMInternal` to bypass thinking tokens on structured vision extraction; removed `scoutScratchpad` from response payloads. |

---

## 7. Lessons Learned & Critical Gotchas

### Schema Field Ordering & Token Truncation
With LLMs, fields emitted later in a JSON schema are the first to be lost when maximum token limits are reached. **High-priority fields (e.g. `items`, `calories`, `suitability`) must be positioned early** in schemas and structured-output definitions.

### Unsafe Numeric Coercion Protection
Using `Number(x) || fallback` is **unsafe** for LLM numeric output because runaway digit strings (or `Infinity` values) are truthy and bypass fallbacks. Always use dedicated sanitization helpers (such as `sanitizeMealWeight` or `safeStr`) to coerce LLM numbers.

### Firestore Document Size Limits & Image Recompression
The auto-recompression patch in `App.tsx` (recompressing images over ~25,000 characters to 400x400 at 0.5 quality on load) **must never be removed**. High-resolution images may only pass through transient API requests (`/api/analyze-food`), never persistence.

### Structured Output `required` Arrays
A `required` array specified at the root of a JSON schema does **not** enforce presence on nested child objects. Each nested object requires its own explicit `required` property array.

---

## 8. Current Feature Status & Roadmap

| Initiative / Feature Area | Status | Progress % | Key Milestone / Current Focus |
| :--- | :---: | :---: | :--- |
| **1. Multi-Language (i18n) Framework** | ⏸️ **PAUSED** | **75%** | *Paused per user request until explicitly asked to resume.* |
| **2. Admin Panel for Real Firebase Users** | 🟢 Completed | **100%** | All 4 phases complete (List, Delete Auth/Data, Resets, UI modals) in `3c608aa`. |
| **3. Food Agent Menu Screening (MODE D1 / D2)** | 🟢 Completed | **100%** | Menu mode up to 100 items, compact ranked UI list, and schema depth rules verified. |
| **4. Health Coach & Health Planning UI Polish** | 🟢 Completed | **100%** | Global Summary de-duplication & testing gap reason merge verified in `3c608aa`. |
| **5. System Robustness & Safety Harness** | 🟢 Completed | **100%** | Vitest (60 tests), Zod validation (Scout & RouteAgent) active in `3c608aa`. |
| **6. Theme Customization & Visual Inspector Engine** | 🟢 Completed | **100%** | CSS variable engine, preset updates, draft colors, and export payload generator complete. |
| **7. Core Storage, Sync & Persistence Safety** | 🟢 Completed | **100%** | IndexedDB primary store, image auto-recompression patch, and tombstone priority active. |

---

## 9. Multi-Language (i18n) Framework — [PAUSED / PENDING USER REQUEST]
- **Note:** *All multi-language tasks (UI string fixes, prop pass-throughs, agent system prompt translations, CSV export/import) are on hold until user explicitly requests to resume them.*
