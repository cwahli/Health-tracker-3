import { get as idbGet, set as idbSet } from 'idb-keyval';
import { UserProfile, FoodLog, BiomarkerLog, HealthAction, DailyBenefit, RecommendationReport, FoodIdea } from '../types';

export const pruneLocalStorageToFreeSpace = () => {
  console.log("Pruning localStorage to free up space...");
  try {
    localStorage.removeItem('agent1_batch_results');
    localStorage.removeItem('batch_analysis_results');
    // DO NOT remove 'agent_request_logs' here; it is safely managed by agentLogsTracker and needed for the log viewer filter
    localStorage.removeItem('local_api_events');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('health_cockpit_snapshots_')) {
          try {
            const snaps = JSON.parse(localStorage.getItem(key) || '[]');
            if (snaps.length > 1) {
              localStorage.setItem(key, JSON.stringify(snaps.slice(0, 1)));
            }
          } catch {}
        } else if (key.startsWith('health_cockpit_app_data_')) {
          // DO NOT delete imageUrl or imageUrls from app data!
          // If localStorage is full, remove key from localStorage so get() seamlessly uses high-capacity IndexedDB.
          try {
            localStorage.removeItem(key);
            console.log(`[Storage] Removed saturated key from localStorage to allow IndexedDB source of truth: ${key}`);
          } catch {}
        } else if (key.startsWith('chat_messages_') || key.startsWith('chat_payload_')) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.log(`Successfully pruned ${keysToRemove.length} chat keys from localStorage to reclaim space.`);
  } catch (e) {
    console.error("Failed to prune localStorage:", e);
  }
};

export const get = async (key: string): Promise<any> => {
  try {
    const result = await Promise.race([
      idbGet(key),
      new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout")), 30000))
    ]);
    if (result !== undefined) {
      return result;
    }
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : undefined;
  } catch (e) {
    console.log("get timeout/error (falling back to localStorage):", e);
    if (typeof window !== 'undefined') (window as any)._idbFailed = true;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : undefined;
    } catch {
      return undefined;
    }
  }
};

export const set = async (key: string, val: any): Promise<void> => {
  const isHeavyKey = key.startsWith('health_cockpit_app_data_') || key.startsWith('health_cockpit_snapshots_');
  const isSaturated = typeof window !== 'undefined' && 
    ((window as any)._localStorageSaturated === true || localStorage.getItem('_ls_saturated') === 'true');

  if (!isSaturated || !isHeavyKey) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (localStorageError: any) {
      if (isHeavyKey) {
        if (typeof window !== 'undefined') {
          (window as any)._localStorageSaturated = true;
          try { localStorage.setItem('_ls_saturated', 'true'); } catch {}
        }
        console.log(`[Storage] localStorage quota reached. Transitioning to high-capacity IndexedDB for key: ${key}. No data will be lost.`);
        
        try {
          pruneLocalStorageToFreeSpace();
          // Try writing the full, uncorrupted val first after pruning
          try {
            localStorage.setItem(key, JSON.stringify(val));
            console.log(`[Storage] Successfully saved full uncorrupted data to localStorage after pruning!`);
            if (typeof window !== 'undefined') {
              (window as any)._localStorageSaturated = false; // Reset saturation as we succeeded
              localStorage.removeItem('_ls_saturated');
            }
          } catch (secondError) {
            // DO NOT save an image-stripped fallback to localStorage!
            // Remove the key from localStorage so get() reads intact data from high-capacity IndexedDB.
            try {
              localStorage.removeItem(key);
              console.log("[Storage] Removed key from localStorage on quota limit. Relying strictly on IndexedDB.");
            } catch {}
          }
        } catch (fallbackError) {
          // Quietly rely on IndexedDB
        }
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch {}
      }
    }
  }

  try {
    await Promise.race([
      idbSet(key, val),
      new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout")), 30000))
    ]);
    if (typeof window !== 'undefined') (window as any)._idbFailed = false;
  } catch (idbError) {
    console.warn("IndexedDB set failed once, retrying:", idbError);
    try {
      await Promise.race([
        idbSet(key, val),
        new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout (retry)")), 30000))
      ]);
      if (typeof window !== 'undefined') (window as any)._idbFailed = false;
    } catch (retryError) {
      console.error("IndexedDB set failed twice, giving up on this write:", retryError);
      if (typeof window !== 'undefined') (window as any)._idbFailed = true;
    }
  }
};

export const getStorageKey = (email?: string | null, fallbackEmail?: string | null) => {
  const norm = (email || fallbackEmail || 'guest').toLowerCase().trim();
  return `health_cockpit_app_data_${norm}`;
};

export const getSnapshotKey = (email?: string | null, fallbackEmail?: string | null) => {
  const norm = (email || fallbackEmail || 'guest').toLowerCase().trim();
  return `health_cockpit_snapshots_${norm}`;
};

export const MAX_SNAPSHOTS = 5;

export const saveLocalSnapshot = async (
  label: string,
  email: string | null | undefined,
  bundle: {
    profile: any;
    foodLogs: any[];
    biomarkers: Record<string, any>;
    biomarkerHistory: any[];
    actions?: any[];
    dailyBenefits?: any[];
    report?: any;
  },
  fallbackEmail?: string | null
) => {
  try {
    const key = getSnapshotKey(email, fallbackEmail);
    let existing: any[] = [];
    try {
      existing = (await get(key)) || [];
    } catch {}

    const lightFoodLogs = (bundle.foodLogs || []).map((f: any) => {
      if (!f.imageUrl || !f.imageUrl.startsWith('data:image/')) return f;
      return { ...f, imageUrl: '[image_removed_for_snapshot]' };
    });

    const snapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toISOString(),
      label,
      data: {
        profile: bundle.profile,
        foodLogs: lightFoodLogs,
        biomarkers: bundle.biomarkers,
        biomarkerHistory: bundle.biomarkerHistory,
        actions: bundle.actions || [],
        dailyBenefits: bundle.dailyBenefits || [],
        report: bundle.report || null
      }
    };

    const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    await set(key, updated);
    return true;
  } catch (e) {
    console.warn('[Snapshot] Could not save snapshot:', e);
    return false;
  }
};

export const loadLocalSnapshots = async (email?: string | null, fallbackEmail?: string | null): Promise<any[]> => {
  try {
    return (await get(getSnapshotKey(email, fallbackEmail))) || [];
  } catch { return []; }
};

export const deleteLocalSnapshot = async (email: string | null | undefined, id: string, fallbackEmail?: string | null) => {
  try {
    const key = getSnapshotKey(email, fallbackEmail);
    const existing = await loadLocalSnapshots(email, fallbackEmail);
    await set(key, existing.filter((s: any) => s.id !== id));
  } catch (e) {}
};

export const safeSaveToLocalStorage = async (key: string, bundle: any) => {
  try {
    const existing = await get(key) || {};
    const mergedBundle = {
      ...bundle,
      lastSyncedAt: bundle.lastSyncedAt !== undefined ? bundle.lastSyncedAt : existing.lastSyncedAt
    };
    await set(key, mergedBundle);
  } catch (e) {
    console.error("Failed to save to IndexedDB:", e);
  }
};

/**
 * Retrieves app data for the current user.
 * If the primary key has food logs, returns it directly — no legacy merging.
 * Only performs a one-time migration from legacy keys if the primary key has 0 food logs.
 * This prevents deleted/old items from legacy keys from being continuously resurrected.
 */
export const getAggregatedAppData = async (email?: string | null): Promise<any> => {
  const primaryKey = getStorageKey(email);
  const primaryData = (await get(primaryKey)) || {};

  // If primary key has food logs, trust it completely — do NOT merge legacy keys.
  if (Array.isArray(primaryData.foodLogs) && primaryData.foodLogs.length > 0) {
    return primaryData;
  }

  // One-time migration: primary key is empty, check legacy keys and migrate their data in.
  const legacyKey = 'health_cockpit_app_data';
  const guestKey = 'health_cockpit_app_data_guest';

  const legacyData = (await get(legacyKey)) || {};
  const guestData = (await get(guestKey)) || {};

  const legacyFoods: any[] = legacyData.foodLogs || [];
  const guestFoods: any[] = guestData.foodLogs || [];

  if (legacyFoods.length === 0 && guestFoods.length === 0) {
    return primaryData;
  }

  // Merge legacy and guest foods, preserving base64 images
  const allLogsMap = new Map<string, any>();
  const addLogs = (logs: any[]) => {
    logs.forEach(log => {
      if (!log || !log.id) return;
      const existing = allLogsMap.get(log.id);
      if (!existing) {
        allLogsMap.set(log.id, log);
      } else {
        const existingHasImg = existing.imageUrl && existing.imageUrl !== '[image_removed_for_snapshot]';
        const logHasImg = log.imageUrl && log.imageUrl !== '[image_removed_for_snapshot]';
        allLogsMap.set(log.id, {
          ...existing,
          ...log,
          imageUrl: logHasImg ? log.imageUrl : (existingHasImg ? existing.imageUrl : log.imageUrl),
          imageUrls: (log.imageUrls && log.imageUrls.length > 0) ? log.imageUrls : existing.imageUrls
        });
      }
    });
  };

  addLogs(legacyFoods);
  addLogs(guestFoods);

  const migratedFoods = Array.from(allLogsMap.values()).filter((f: any) => f.sync_state !== 'delete');
  console.log(`[Storage] One-time migration: merging ${migratedFoods.length} food logs from legacy keys into primary key.`);

  return {
    ...legacyData,
    ...guestData,
    ...primaryData,
    foodLogs: migratedFoods
  };
};
