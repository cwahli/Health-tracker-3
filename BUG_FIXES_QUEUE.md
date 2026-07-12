# Bug Fix Queue for AI Studio Agent
**Date**: 2026-07-12  
**Agent**: Prepared by cwahli  
**Status**: Ready for execution

---

## Overview
Seven (7) bugs have been identified in the codebase. Execute them in priority order. Each bug specifies the recommended LLM model for the task.

**Model Selection**:
- **`gemini-3.5-flash-lite`**: Straightforward, well-scoped fixes (simple wrapper additions, flag resets, consolidation)
- **`gemini-3.5-flash`**: Complex logic, race conditions, refactoring across multiple files

---

## Bug Fixes

### **BUG #1: Missing Sanitization in Google Backup Restore** ⚠️ HIGH
**Model**: `gemini-3.5-flash-lite`  
**Severity**: HIGH  
**File**: `src/utils/googleBackup.ts`  
**Lines**: 599–619 (approx.)

**Problem**:
The `restoreAccountToFirestore()` function writes imported food logs and biomarker history without sanitizing them. If the imported backup contains `undefined` fields or malformed nested objects, they corrupt Firestore and waste quota.

**Current Code**:
```typescript
data.foodLogs.forEach((food: any) => {
  const foodRef = doc(db, 'users', uid, 'foodLogs', food.id);
  batch.set(foodRef, food, { merge: true });  // ← No sanitization
});
```

**Fix Instructions**:
1. Import `sanitizeForFirestore` utility at the top of `googleBackup.ts` (it should already exist in utils).
2. Wrap each food log object before writing:
   ```typescript
   batch.set(foodRef, sanitizeForFirestore(food), { merge: true });
   ```
3. Repeat for biomarker history, custom biomarkers, and any other nested writes in the same function.
4. Test by importing a backup that contains intentionally malformed/undefined fields and verify Firestore does not store them.

**Acceptance Criteria**:
- [ ] All `batch.set()` calls in `restoreAccountToFirestore()` use `sanitizeForFirestore()`
- [ ] Firestore rules are not violated after restore
- [ ] No quota waste from storing undefined fields
- [ ] Lint/TS checks pass

---

### **BUG #2: Inconsistent Error Handling in Migration Task** ⚠️ MEDIUM
**Model**: `gemini-3.5-flash-lite`  
**Severity**: MEDIUM  
**File**: `src/utils/migrationTask.ts`

**Problem**:
The migration checks for completion using localStorage only, without verifying Firestore state. On a second device or after localStorage is cleared, the migration could execute again, potentially deleting biomarkers a second time.

**Current Logic**:
```typescript
const migrationKey = 'migration_biomarkers_v1_completed';
if (localStorage.getItem(migrationKey) === 'true') {
  return;  // Returns without checking Firestore
}
```

**Fix Instructions**:
1. After the localStorage check, add a secondary Firestore check:
   ```typescript
   const uid = user.uid;
   if (db) {
     const migrationRef = doc(db, 'users', uid, 'metadata', 'migration');
     const migrationSnap = await migrationRef.get();
     if (migrationSnap.exists() && migrationSnap.data().biomarkersV1Completed === true) {
       console.log('[Migration] Already completed (verified in Firestore)');
       localStorage.setItem(migrationKey, 'true');  // Sync flag
       return;
     }
   }
   ```
2. After the migration completes successfully, write a completion flag to Firestore as well:
   ```typescript
   await setDoc(doc(db, 'users', uid, 'metadata', 'migration'), {
     biomarkersV1Completed: true,
     completedAt: new Date().toISOString()
   }, { merge: true });
   ```
3. Add logging to detect if the flags disagree (localStorage ≠ Firestore).

**Acceptance Criteria**:
- [ ] Migration reads both localStorage AND Firestore before executing
- [ ] Firestore flag is written after migration completes
- [ ] Second login on different device does not re-run migration
- [ ] Logs show "Already completed (verified in Firestore)" on retry

---

### **BUG #3: Undefined Handling in Food Log Display** ⚠️ MEDIUM
**Model**: `gemini-3.5-flash-lite`  
**Severity**: MEDIUM  
**File**: `src/App.tsx` (lines ~2427)  
**Also affects**: `src/components/LogChat.tsx` (nutrient display)

**Problem**:
The `isValidValue()` function filters out `undefined`, `null`, `'N/A'`, and `'null'`, but nutrient displays have no fallback placeholder when a value is missing. This creates blank cells in food log cards.

**Current Code**:
```typescript
const isValidValue = (v: unknown): boolean => 
  v !== null && v !== undefined && v !== '' && v !== 'N/A' && v !== 'null';
```

**Fix Instructions**:
1. In `src/components/LogChat.tsx`, find the nutrient display table/card rendering (search for where nutrient values are displayed in `FoodCard` or similar).
2. Add a helper function:
   ```typescript
   const formatNutrientValue = (value: unknown, unit: string): string => {
     if (!isValidValue(value)) return '—';  // Em-dash for missing data
     return `${value} ${unit}`;
   };
   ```
3. Replace all bare nutrient displays with this function:
   ```typescript
   // Before:
   <td>{item.calories}</td>
   
   // After:
   <td>{formatNutrientValue(item.calories, 'kcal')}</td>
   ```
4. Verify visually that blank cells now show "—" and are clearly distinguishable from "0".

**Acceptance Criteria**:
- [ ] Missing nutrient values display as "—" instead of blank
- [ ] Zero values still display as "0"
- [ ] UI is visually clear about missing vs. zero data
- [ ] No console errors from undefined value rendering

---

### **BUG #4: Race Condition in Chat Conversation Sync** ⚠️ MEDIUM
**Model**: `gemini-3.5-flash`  
**Severity**: MEDIUM  
**File**: `src/components/LogChat.tsx` (line ~610)

**Problem**:
`saveConversationToFirestore()` is called after every user message without debouncing. Rapid consecutive messages cause concurrent writes to the same conversation document, risking message loss due to race conditions.

**Current Code**:
```typescript
const saveConversationToFirestore = async (id: string, msgs: ChatMessage[], payload: any) => {
  // No locking or debouncing
  const docRef = doc(db, 'users', uid, 'conversations', id);
  await setDoc(docRef, sanitizeForFirestore({...}), { merge: true });
};

// Called here after every message:
await saveConversationToFirestore(conversationId, messages, payload);
```

**Fix Instructions**:
1. Add a debounce mechanism to `LogChat.tsx`:
   ```typescript
   import { useRef } from 'react';
   
   const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   
   const debouncedSaveConversation = (id: string, msgs: ChatMessage[], payload: any) => {
     if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
     saveTimeoutRef.current = setTimeout(() => {
       saveConversationToFirestore(id, msgs, payload);
     }, 800);  // 800ms window
   };
   ```
2. Replace the direct call with the debounced version:
   ```typescript
   // Before:
   await saveConversationToFirestore(conversationId, messages, payload);
   
   // After:
   debouncedSaveConversation(conversationId, messages, payload);
   ```
3. On component unmount, flush any pending save:
   ```typescript
   useEffect(() => {
     return () => {
       if (saveTimeoutRef.current) {
         clearTimeout(saveTimeoutRef.current);
         // Optionally call saveConversationToFirestore here to ensure final state is saved
       }
     };
   }, []);
   ```
4. Test by sending 10 rapid messages and verifying Firestore contains all messages (check in Firestore Console).

**Acceptance Criteria**:
- [ ] `saveConversationToFirestore()` is debounced with 800ms window
- [ ] Rapid message bursts do not cause data loss
- [ ] Final state is always persisted on unmount
- [ ] Firestore shows no duplicate or partial message writes

---

### **BUG #5: Firestore Quota Exceeded Flag Stuck** ⚠️ MEDIUM
**Model**: `gemini-3.5-flash-lite`  
**Severity**: MEDIUM  
**File**: `src/App.tsx` (lines 1152–1176)

**Problem**:
When the app sets `localStorage.setItem('firestore_quota_exceeded', 'true')`, this flag is never cleared. On next login, the app remains stuck in offline mode until the user manually clears localStorage. This makes the app unusable after a temporary quota spike.

**Current Code**:
```typescript
if (localStorage.getItem('firestore_quota_exceeded') === 'true') {
  // App is stuck in offline mode
  return <OfflineMessage />;
}
```

**Fix Instructions**:
1. When the quota exceeded flag is set, also record a timestamp:
   ```typescript
   localStorage.setItem('firestore_quota_exceeded', 'true');
   localStorage.setItem('firestore_quota_exceeded_time', new Date().getTime().toString());
   ```
2. Before checking the flag, verify it's not stale (older than 1 hour):
   ```typescript
   const checkQuotaFlag = () => {
     const flagSet = localStorage.getItem('firestore_quota_exceeded') === 'true';
     if (!flagSet) return false;
     
     const setTime = parseInt(localStorage.getItem('firestore_quota_exceeded_time') || '0', 10);
     const nowTime = new Date().getTime();
     const ONE_HOUR = 3600000;
     
     if (nowTime - setTime > ONE_HOUR) {
       // Flag is stale; clear it and attempt recovery
       localStorage.removeItem('firestore_quota_exceeded');
       localStorage.removeItem('firestore_quota_exceeded_time');
       console.log('[Quota Recovery] Quota exceeded flag expired; retrying connection.');
       return false;
     }
     return true;
   };
   ```
3. Replace the simple flag check with this function:
   ```typescript
   if (checkQuotaFlag()) {
     return <OfflineMessage />;
   }
   ```
4. (Optional) Add a UI button to manually retry before the 1-hour timeout:
   ```typescript
   const handleRetryQuota = () => {
     localStorage.removeItem('firestore_quota_exceeded');
     localStorage.removeItem('firestore_quota_exceeded_time');
     window.location.reload();
   };
   ```

**Acceptance Criteria**:
- [ ] Quota exceeded flag is timestamped when set
- [ ] Flag is automatically cleared after 1 hour
- [ ] App recovers and retries connection after 1 hour
- [ ] Optional retry button is available (if implemented)
- [ ] No manual localStorage clearing required by user

---

### **BUG #6: cleanData() Function Visibility Unclear** ⚠️ MEDIUM
**Model**: `gemini-3.5-flash-lite`  
**Severity**: MEDIUM  
**File**: `src/App.tsx` (multiple calls)

**Problem**:
Multiple places call `cleanData()` on objects before saving to Firestore, but it's unclear if `cleanData()` is properly exported or if it differs from `sanitizeForFirestore()`. This creates maintenance confusion and potential data corruption if the two functions behave differently.

**Current Pattern**:
```typescript
const profilePromise = setDoc(doc(db, 'users', uid), cleanData(profileForCloud));
// vs.
const foodPromise = setDoc(doc(db, 'users', uid, 'foodLogs', id), sanitizeForFirestore(food));
```

**Fix Instructions**:
1. Search for all calls to `cleanData()` in `App.tsx`:
   ```bash
   grep -n "cleanData" src/App.tsx
   ```
2. Identify the definition of `cleanData()`:
   - If it exists in `src/utils/sanitizeUtils.ts`, verify it's the same as `sanitizeForFirestore()`.
   - If it differs, consolidate: choose one function name and use it everywhere.
3. Replace all `cleanData(X)` calls with `sanitizeForFirestore(X)`:
   ```typescript
   // Before:
   const profilePromise = setDoc(doc(db, 'users', uid), cleanData(profileForCloud));
   
   // After:
   const profilePromise = setDoc(doc(db, 'users', uid), sanitizeForFirestore(profileForCloud));
   ```
4. Ensure `sanitizeForFirestore` is imported once at the top of `App.tsx`:
   ```typescript
   import { sanitizeForFirestore } from './utils/sanitizeUtils';
   ```
5. Remove `cleanData` function if it's defined locally in `App.tsx`.
6. Add a comment in `sanitizeForFirestore` explaining it's the single source of truth for Firestore writes:
   ```typescript
   /**
    * Sanitizes an object for Firestore by removing undefined fields and nested undefined values.
    * This is the ONLY function used for all Firestore writes to ensure consistency.
    */
   export function sanitizeForFirestore(obj: any): any { ... }
   ```

**Acceptance Criteria**:
- [ ] All Firestore writes use `sanitizeForFirestore()` only
- [ ] `cleanData()` is removed or aliased to `sanitizeForFirestore()`
- [ ] Codebase has zero calls to `cleanData()`
- [ ] Single import statement for sanitization function
- [ ] TS/Lint checks pass

---

### **BUG #7: Undo Snapshots Lose Images** ℹ️ LOW
**Model**: `gemini-3.5-flash-lite`  
**Severity**: LOW (Design/Documentation)  
**File**: `src/App.tsx` (Snapshot system)  
**Documentation**: `AI_HANDOVER.md` (Section 5)

**Problem**:
Local undo snapshots strip Base64 images to save localStorage space. When a user reverts a food log, the image is lost permanently. This is a design choice but should be clearly documented.

**Current Behavior**:
```typescript
// On snapshot save:
const snapshotData = { ...foodLog };
if (snapshotData.imageUrl?.startsWith('data:image/')) {
  snapshotData.imageUrl = null;  // Stripped to save space
}
```

**Fix Instructions** (Choose one approach):

**Option A: Store Images in IndexedDB (More Complex)**
1. Create a new utility file: `src/utils/imageCache.ts`:
   ```typescript
   import { openDB } from 'idb';
   
   const dbPromise = openDB('HealthTracker_Images', 1, {
     upgrade(db) {
       db.createObjectStore('images');
     }
   });
   
   export async function cacheImageData(key: string, imageData: string) {
     const db = await dbPromise;
     await db.put('images', imageData, key);
   }
   
   export async function retrieveImageData(key: string): Promise<string | undefined> {
     const db = await dbPromise;
     return db.get('images', key);
   }
   ```
2. Update snapshot save logic to store images separately:
   ```typescript
   if (snapshotData.imageUrl?.startsWith('data:image/')) {
     const imgKey = `img_${Date.now()}`;
     await cacheImageData(imgKey, snapshotData.imageUrl);
     snapshotData.imageUrl = imgKey;  // Store reference instead of data
   }
   ```
3. On undo, restore the image reference from IndexedDB.

**Option B: Document Limitation (Simpler)**
1. Update `AI_HANDOVER.md` Section 5 to clarify:
   ```markdown
   ### Chat Session Storage
   - Conversation history: sessionStorage (per-session, primary) + Firestore (durable backup)
   - **Local snapshots (up to 5) in localStorage for undo**:
     - Base64 images are stripped to stay within 5–10 MB localStorage limit
     - **Known limitation**: Undoing a food log revision loses the attached image
     - Recommendation: Reimport the image if needed, or use Firestore cloud backup to recover with images
   ```
2. In `src/components/UndoPanel.tsx` (or where undo is shown), add a UI note:
   ```typescript
   <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
     💡 Note: Image data is not included in undo snapshots to save space. 
     Images will need to be re-attached if you undo a food log.
   </p>
   ```
3. No code changes required; just documentation.

**Recommendation**: Use **Option B** (Documentation) for now. If users complain about losing images on undo, escalate to Option A (IndexedDB storage) in a future sprint.

**Acceptance Criteria** (for either option):
- [ ] Limitation is clearly documented in `AI_HANDOVER.md`
- [ ] UI shows clear warning if user is about to undo a logged image
- [ ] OR images are successfully recovered from IndexedDB on undo
- [ ] No data loss; user always has a path to recovery

---

## Execution Order

Execute bugs in this sequence:

1. **BUG #1** (HIGH) — Sanitization in Google Backup | `flash-lite` | ~15 min
2. **BUG #5** (MEDIUM) — Quota Flag Timeout | `flash-lite` | ~10 min
3. **BUG #2** (MEDIUM) — Migration Firestore Check | `flash-lite` | ~15 min
4. **BUG #6** (MEDIUM) — cleanData() Consolidation | `flash-lite` | ~20 min
5. **BUG #3** (MEDIUM) — Nutrient Display Fallback | `flash-lite` | ~15 min
6. **BUG #4** (MEDIUM) — Chat Sync Debounce | `flash` | ~30 min
7. **BUG #7** (LOW) — Image Snapshot Documentation | `flash-lite` | ~10 min

**Estimated Total**: ~2.5 hours for all bugs.

---

## Post-Fix Steps

After all fixes are complete:

1. Run `npm run lint` and `npm run type-check` to verify no TS/ESLint regressions
2. Test each fix in the dev environment:
   - BUG #1: Import a backup with undefined fields; check Firestore
   - BUG #2: Simulate migration on second login
   - BUG #3: Add a food log; verify blank nutrients show "—"
   - BUG #4: Send 10 rapid messages; check Firestore for all messages
   - BUG #5: Wait 1+ hour or manually trigger quota flag; verify it clears
   - BUG #6: Search codebase for `cleanData`; should return 0 results
   - BUG #7: Read documentation; confirm clarity
3. Commit with message: `fix: resolve 7 identified bugs (high/medium priority)`
4. Update `AI_HANDOVER.md` Section 6 with:
   ```markdown
   | 2026-07-12 | Resolved 7 bugs: sanitization, quota flag, migration, race condition, nutrient fallback, cleanData consolidation, snapshot docs | AI Studio (self-directed) |
   ```

---

## Notes for AI Studio

- **Do NOT skip lint checks** — ensure all TypeScript types are correct before committing.
- **Test in browser DevTools** — verify Firestore writes and localStorage state.
- **Ask for clarification** if any file path or function name is unclear.
- **All commits should be atomic** — one bug per commit if possible.

Good luck! 🚀
