import { get as idbGet, set as idbSet } from 'idb-keyval';
import { UserProfile, FoodLog, BiomarkerLog, HealthAction, DailyBenefit, RecommendationReport, FoodIdea } from '../types';

export const pruneLocalStorageToFreeSpace = () => {
  console.warn("Pruning localStorage to free up space...");
  try {
    localStorage.removeItem('agent1_batch_results');
    localStorage.removeItem('batch_analysis_results');
    localStorage.removeItem('agent_request_logs');
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
      new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout")), 8000))
    ]);
    if (result !== undefined) {
      return result;
    }
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : undefined;
  } catch (e) {
    console.warn("get timeout/error (falling back to localStorage):", e);
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
  const isSaturated = typeof window !== 'undefined' && (window as any)._localStorageSaturated === true;

  if (!isSaturated || !isHeavyKey) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (localStorageError: any) {
      if (isHeavyKey) {
        if (typeof window !== 'undefined') {
          (window as any)._localStorageSaturated = true;
        }
        console.warn(`[Storage] localStorage quota reached. Transitioning to high-capacity IndexedDB for key: ${key}. No data will be lost.`);
        
        try {
          pruneLocalStorageToFreeSpace();
          // Try writing the full, uncorrupted val first after pruning
          try {
            localStorage.setItem(key, JSON.stringify(val));
            console.log(`[Storage] Successfully saved full uncorrupted data to localStorage after pruning!`);
            if (typeof window !== 'undefined') {
              (window as any)._localStorageSaturated = false; // Reset saturation as we succeeded
            }
          } catch (secondError) {
            // If it still fails, only then do we fall back to lightweight version with images stripped
            if (val && typeof val === 'object') {
              const lightVal = { ...val, _isLightweightFallback: true };
              if (Array.isArray(lightVal.foodLogs)) {
                lightVal.foodLogs = lightVal.foodLogs.slice(-50).map((f: any) => {
                  const { imageUrl, imageUrls, ...rest } = f;
                  return rest;
                });
              }
              if (lightVal.report) lightVal.report = null;
              if (lightVal.biomarkerHistory && lightVal.biomarkerHistory.length > 50) {
                lightVal.biomarkerHistory = lightVal.biomarkerHistory.slice(0, 10);
              }
              localStorage.setItem(key, JSON.stringify(lightVal));
              console.warn("[Storage] Saved lightweight fallback with stripped images after prune retry failed.");
            }
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
      new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout")), 8000))
    ]);
    if (typeof window !== 'undefined') (window as any)._idbFailed = false;
  } catch (idbError) {
    console.warn("IndexedDB set failed once, retrying:", idbError);
    try {
      await Promise.race([
        idbSet(key, val),
        new Promise((_, reject) => setTimeout(() => reject(new Error("IndexedDB timeout (retry)")), 8000))
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
