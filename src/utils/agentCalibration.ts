export function getAgentCalibration(biomarkerKey: string) {
  try {
    const saved = localStorage.getItem('batch_analysis_results');
    if (saved) {
      const parsed = JSON.parse(saved);
      const batchKeys = Object.keys(parsed).sort((a, b) => Number(b) - Number(a));
      for (const bk of batchKeys) {
        const batch = parsed[bk];
        if (batch && Array.isArray(batch.reviewedBiomarkers)) {
          const found = batch.reviewedBiomarkers.find((bm: any) => bm.key === biomarkerKey);
          if (found) return found;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function getAllAgentCalibrations(): Record<string, { specificRiskContext?: string; description?: string }> {
  const out: Record<string, { specificRiskContext?: string; description?: string }> = {};
  try {
    const saved = localStorage.getItem('batch_analysis_results');
    if (saved) {
      const parsed = JSON.parse(saved);
      const batchKeys = Object.keys(parsed).sort((a, b) => Number(a) - Number(b));
      for (const bk of batchKeys) {
        const batch = parsed[bk];
        if (batch && Array.isArray(batch.reviewedBiomarkers)) {
          batch.reviewedBiomarkers.forEach((bm: any) => {
            if (bm && bm.key && (bm.specificRiskContext || bm.description)) {
              out[bm.key] = { specificRiskContext: bm.specificRiskContext, description: bm.description };
            }
          });
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return out;
}
