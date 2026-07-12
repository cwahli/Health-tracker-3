/**
 * Sanitizes an object for Firestore by removing undefined fields and nested undefined values.
 * This is the ONLY function used for all Firestore writes to ensure consistency.
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        cleaned[k] = sanitizeForFirestore(v);
      }
    }
    return cleaned;
  }
  return obj;
}

export const checkQuotaFlag = (): boolean => {
  const flagSet = localStorage.getItem('firestore_quota_exceeded') === 'true';
  if (!flagSet) return false;

  const setTime = parseInt(localStorage.getItem('firestore_quota_exceeded_time') || '0', 10);
  const nowTime = new Date().getTime();
  const ONE_HOUR = 3600000;

  if (nowTime - setTime > ONE_HOUR) {
    localStorage.removeItem('firestore_quota_exceeded');
    localStorage.removeItem('firestore_quota_exceeded_time');
    console.log('[Quota Recovery] Quota exceeded flag expired; retrying connection.');
    return false;
  }
  return true;
};

export const handleRetryQuota = () => {
  localStorage.removeItem('firestore_quota_exceeded');
  localStorage.removeItem('firestore_quota_exceeded_time');
  window.location.reload();
};
