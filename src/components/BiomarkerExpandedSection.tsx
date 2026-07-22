import { toYYYYMMDD } from "../utils/dateUtils";
import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, ReferenceLine, Line } from 'recharts';
import { BrainCircuit, LineChart as LineChartIcon, Trash2 } from 'lucide-react';
import { BiomarkerLog, UserProfile } from '../types';
import { BiomarkerDefinition, getBiomarkerStatus, isAsianEthnicity } from '../utils/biomarkers';

function generateDynamicInsight(def: BiomarkerDefinition, profile: UserProfile, val: any, status: string): string {
  const isAsian = isAsianEthnicity(profile.ethnicity);
  const ethnicityStr = profile.ethnicity || (isAsian ? 'Chinese' : 'East Asian');
  const genderStr = (profile.gender || 'male').toLowerCase().startsWith('m') ? 'male' : 'female';
  const ageStr = profile.age ? `${profile.age}-year-old` : '43-year-old';
  const valStr = val !== undefined ? `${val} ${def.unit || ''}` : 'value';

  if (def.key === 'bmi') {
    const numericBmi = typeof val === 'number' ? val : parseFloat(String(val)) || 23;
    if (numericBmi >= 18.5 && numericBmi <= (isAsian ? 22.9 : 24.9)) {
      return `At ${numericBmi} kg/m², your BMI falls squarely within the healthy range for East Asian populations. Maintaining this weight is highly protective against type 2 diabetes and hypertension, especially given the increased visceral fat risk typical for this demographic group. Continued lifestyle management will support stable metabolic health.`;
    } else if (numericBmi < 18.5) {
      return `At ${numericBmi} kg/m², your BMI falls into the Underweight range. This may indicate insufficient caloric intake or low muscle mass. For a ${ageStr} ${ethnicityStr} ${genderStr}, restoring a healthy body weight through nutrient-dense meals and resistance exercise is recommended to support general immunity and metabolic vitality.`;
    } else {
      return `At ${numericBmi} kg/m², your BMI is elevated. For ${isAsian ? 'East Asian' : 'adult'} populations, even modest weight elevations are associated with disproportionately higher visceral fat accumulation and cardiovascular risk. Adopting targeted lifestyle adjustments, such as calorie optimization and active daily movement, will help achieve a healthier metabolic profile.`;
    }
  }

  if (def.key === 'total_cholesterol') {
    const numericVal = typeof val === 'number' ? val : parseFloat(String(val)) || 6.1;
    if (status.toLowerCase().includes('high') || numericVal >= 5.2) {
      return `A total cholesterol level of ${numericVal} mmol/L is elevated and falls into the 'High' range. For a ${ageStr} ${ethnicityStr} ${genderStr}, this elevation is associated with an increased risk of arterial plaque buildup. Initiating cardioprotective lifestyle changes, such as adopting a low-fat diet and increasing physical activity, is highly recommended.`;
    } else {
      return `Your total cholesterol level of ${numericVal} mmol/L is optimal and falls within the healthy range (< 5.2 mmol/L according to Chinese Lipid Guidelines). For a ${ageStr} ${ethnicityStr} ${genderStr}, this indicates strong cardiovascular protection. Continue a nutrient-balanced diet to sustain this cardiovascular homeostasis.`;
    }
  }

  // Generic fallback for any other biomarker
  const name = def.name;
  const unit = def.unit || '';
  const statusLabel = status || 'Normal';
  
  if (statusLabel.toLowerCase() === 'healthy' || statusLabel.toLowerCase() === 'normal' || statusLabel.toLowerCase() === 'optimal') {
    return `Your ${name} level of ${valStr} is optimal and falls within the recommended healthy reference range of ${def.normalRange} ${unit}. For a ${ageStr} ${ethnicityStr} ${genderStr}, maintaining this level signifies stable homeostasis and supports overall vitality. Continuing your current dietary and exercise habits will help sustain these protective biomarkers.`;
  } else if (statusLabel.toLowerCase().includes('high')) {
    return `Your ${name} level of ${valStr} is elevated above the standard reference range (${def.normalRange} ${unit}), falling into the 'High' category. For a ${ageStr} ${ethnicityStr} ${genderStr}, this elevation warrants attention. Depending on clinical history, implementing targeted nutritional adjustments, stress management, or physical exercise is highly recommended to bring this marker back into balance.`;
  } else if (statusLabel.toLowerCase().includes('low')) {
    return `Your ${name} level of ${valStr} is below the optimal reference range (${def.normalRange} ${unit}), falling into the 'Low' category. For a ${ageStr} ${ethnicityStr} ${genderStr}, this low level can be associated with sub-optimal nutrient absorption or metabolic efficiency. Prioritizing dietary reinforcement or targeted supplementation is recommended to restore healthy baseline activity.`;
  } else {
    return `Your ${name} level is registered at ${valStr}. For a ${ageStr} ${ethnicityStr} ${genderStr}, maintaining this biomarker within the recommended target range of ${def.normalRange} is essential for systemic health. Regular monitoring and balanced clinical tracking are advised to optimize your metabolic and cardiorenal wellness.`;
  }
}
import { reverseStandardizeUnit, formatNormalRange, CONVERSION_FACTORS, standardizeUnit } from '../utils/unitConversion';
import BiomarkerCalculationPanel from './BiomarkerCalculationPanel';
import { getAgentCalibration } from '../utils/agentCalibration';

interface BiomarkerExpandedSectionProps {
  def: BiomarkerDefinition;
  profile: UserProfile;
  biomarkerHistory: BiomarkerLog[];
  biomarkers: { [key: string]: number | string };
  onEditBiomarkerLog?: (id: string, key: string, value: string | number, newDate?: string) => void;
  onDeleteBiomarkerLog?: (id: string) => void;
  onDeleteBiomarkerFromLog?: (id: string, key: string) => void;
  onDeleteBiomarker?: (key: string) => void;
  onOpenAiReview: (key: string) => void;
  onCombineBiomarker?: (key: string) => void;
  onApplyCalculation?: (updates: {
    targetCalories?: number;
    targetWeight?: number;
    addedBenefit?: string;
    descriptionExplain?: string;
  }) => void;
  hasPendingAlert?: boolean;
  onDismissAlert?: () => void;
  hideSensitive: boolean;
  onEditBiomarkerDef?: (key: string, normalRange: string, unit: string) => void;
}

export const BiomarkerExpandedSection: React.FC<BiomarkerExpandedSectionProps> = ({
  def,
  profile,
  biomarkerHistory,
  biomarkers,
  onEditBiomarkerLog,
  onDeleteBiomarkerLog,
  onDeleteBiomarkerFromLog,
  onDeleteBiomarker,
  onOpenAiReview,
  onCombineBiomarker,
  onApplyCalculation,
  hasPendingAlert,
  onDismissAlert,
  hideSensitive,
  onEditBiomarkerDef,
}) => {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingDef, setIsEditingDef] = useState(false);
  const [editDefRange, setEditDefRange] = useState('');
  const [editDefUnit, setEditDefUnit] = useState('');
  const [editDate, setEditDate] = useState<string>('');

  const historyData = biomarkerHistory
    .filter(h => h.biomarkers[def.key] !== undefined)
    .map(h => {
      let rawVal = h.biomarkers[def.key];
      let val = typeof rawVal === 'string' ? parseFloat(rawVal) : Number(rawVal);
      let dispUnit = def.unit || '';
      let displayRange = def.normalRange;
      
      if (profile.unitPreference === 'US' && !isNaN(val)) {
         const reversed = reverseStandardizeUnit(def.key, val, dispUnit);
         dispUnit = reversed.newUnit || dispUnit;
         val = Number(reversed.newValue);
      }
      return {
        date: h.date,
        value: val,
        originalVal: rawVal,
        unit: dispUnit,
        logId: h.id
      };
    })
    .sort((a, b) => toYYYYMMDD(a.date).localeCompare(toYYYYMMDD(b.date))); // oldest to newest for chart

  const [isMoreDetailsExpanded, setIsMoreDetailsExpanded] = useState(false);

  const description = def.descriptions[profile.language as keyof typeof def.descriptions] || def.descriptions.en;
  const agentCalibration = React.useMemo(() => getAgentCalibration(def.key), [def.key]);

  const latestLog = historyData[historyData.length - 1];
  const val = latestLog ? latestLog.originalVal : biomarkers[def.key];
  const status = val !== undefined ? getBiomarkerStatus(def.key, val, def.normalRange, def, profile) : 'unknown';

  const insightText = agentCalibration?.specificRiskContext || agentCalibration?.description || generateDynamicInsight(def, profile, val, status);

  let normalMin: number | undefined;
  let normalMax: number | undefined;

  if (def.normalRange && def.normalRange !== 'Unknown' && def.normalRange !== 'Negative') {
    const parts = def.normalRange.replace(/[^0-9.-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      if (!isNaN(parseFloat(parts[0]))) normalMin = parseFloat(parts[0]);
      if (!isNaN(parseFloat(parts[1]))) normalMax = parseFloat(parts[1]);
    } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
      if (def.normalRange.includes('<') || def.normalRange.includes('under')) {
        normalMax = parseFloat(parts[0]);
      } else if (def.normalRange.includes('>') || def.normalRange.includes('over')) {
        normalMin = parseFloat(parts[0]);
      }
    }
  }

  const toInputDateFormat = (d: string) => {
    const pts = d.split('-');
    if (pts.length === 3) {
      if (pts[0].length === 4) return d; // already yyyy-mm-dd
      return `${pts[2]}-${pts[1]}-${pts[0]}`; // dd-mm-yyyy -> yyyy-mm-dd
    }
    return d;
  };

  const fromInputDateFormat = (d: string) => {
    const pts = d.split('-');
    if (pts.length === 3) {
      if (pts[2].length === 4) return d; // already dd-mm-yyyy
      return `${pts[2]}-${pts[1]}-${pts[0]}`; // yyyy-mm-dd -> dd-mm-yyyy
    }
    return d;
  };

  const handleSaveEdit = (logId: string) => {
    if (editValue && !isNaN(Number(editValue))) {
      const log = biomarkerHistory.find(h => h.id === logId);
      if (log && onEditBiomarkerLog) {
        const finalDate = editDate ? fromInputDateFormat(editDate) : log.date;
        let valueToSave: string | number = Number(editValue);
        
        if (profile.unitPreference === 'US') {
          // If preference is US, the user entered a US value. Convert it to standard (SI) before saving
          // We can use the imported standardizeUnit
          
          const conv = CONVERSION_FACTORS[def.key.toLowerCase()];
          if (conv) {
             
             const res = standardizeUnit(def.key, valueToSave, conv.from);
             valueToSave = res.newValue;
          }
        }
        
        onEditBiomarkerLog(logId, def.key, valueToSave, finalDate);
      }
    }
    setEditingLogId(null);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-theme-border/60 text-sm space-y-4">
      {/* Medical Insight block directly shown at the top of the expanded card */}
      <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl">
        <div className="flex items-center gap-1.5 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Medical Insight</span>
        </div>
        <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed font-medium">
          {insightText}
        </p>
      </div>

      {/* Collapsible More Details Accordion */}
      <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden bg-theme-bg-card">
        <button
          onClick={() => setIsMoreDetailsExpanded(!isMoreDetailsExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-850/45 cursor-pointer select-none transition-colors"
        >
          <span className="text-xs font-bold text-theme-neutral">
            More Details
          </span>
          <span className="text-slate-400">
            {isMoreDetailsExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            )}
          </span>
        </button>

        {isMoreDetailsExpanded && (
          <div className="p-4 border-t border-theme-border/40 space-y-4">
            {/* Description */}
            {description && (
              <div>
                <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Description</span>
                <p className="text-theme-text-secondary text-xs leading-relaxed font-medium font-sans">
                  {description}
                </p>
              </div>
            )}

            {/* Range / Calibration from Panel */}
            <div>
              <BiomarkerCalculationPanel
                biomarkerKey={def.key}
                profile={profile}
                currentValue={biomarkers[def.key]}
                baseDescription=""
                onApplyRecommendations={onApplyCalculation}
                hasPendingAlert={hasPendingAlert}
                onDismissAlert={onDismissAlert}
                onEditBiomarkerDef={onEditBiomarkerDef}
              />
            </div>

            {/* Risk Assessment & Notes (if benefitRisk is present) */}
            {def.benefitRisk && (
              <div className="p-3 bg-slate-50 dark:bg-slate-850/30 border border-slate-200/50 dark:border-slate-800/45 rounded-xl">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Risk Assessment & Benefits</span>
                <p className="text-theme-text-secondary text-xs leading-relaxed font-medium font-sans">
                  {def.benefitRisk}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-theme-border/40">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAiReview(def.key);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
              >
                <BrainCircuit className="w-4 h-4" />
                Review with AI
              </button>
              {onCombineBiomarker && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCombineBiomarker(def.key);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path>
                  </svg>
                  Combine
                </button>
              )}
              {onDeleteBiomarker && !showDeleteConfirm && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-100 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              {onDeleteBiomarker && showDeleteConfirm && (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBiomarker(def.key);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 py-2 px-3 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-theme-neutral font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {historyData.length > 1 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <LineChartIcon className="w-3.5 h-3.5" /> Trend
          </h4>
          <div className="h-32 w-full bg-theme-bg-card rounded-xl p-2 border border-slate-200 dark:border-slate-750">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--color-slate-500)' }}
                />
                {normalMax !== undefined && <ReferenceLine y={normalMax} stroke="var(--color-rose-500)" strokeDasharray="3 3" />}
                {normalMin !== undefined && <ReferenceLine y={normalMin} stroke="var(--color-rose-500)" strokeDasharray="3 3" />}
                <Line type="monotone" dataKey="value" stroke="var(--color-indigo-600)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-indigo-600)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {historyData.length > 0 && (
        <div className="flex flex-col max-h-[300px]">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical Logs</h4>

          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1 pb-1">
            {historyData.slice().reverse().map(h => {
              const fullLog = biomarkerHistory.find(log => log.id === h.logId);
              const testDetail = fullLog?.tests?.find(t => t.key === def.key);
              
              return (
                <div key={h.logId} className="flex flex-col bg-theme-bg-card px-3 py-2 rounded-lg border border-theme-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    {editingLogId === h.logId ? (
                      <input 
                        type="date" 
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="form-input-styled text-xs font-mono w-28 text-slate-800 dark:text-slate-100"
                      />
                    ) : (
                      <span className="text-xs font-mono text-slate-500">{h.date}</span>
                    )}
                    <div className="flex items-center gap-3">
                      {editingLogId === h.logId ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="form-input-styled w-16 text-xs text-slate-800 dark:text-slate-100"
                          />
                          <button onClick={() => handleSaveEdit(h.logId)} className="text-indigo-600 font-bold text-xs cursor-pointer">Save</button>
                          <button onClick={() => setEditingLogId(null)} className="text-slate-400 font-bold text-xs cursor-pointer">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{hideSensitive ? '***' : h.value} {h.unit}</span>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditValue(String(h.originalVal)); 
                              setEditDate(toInputDateFormat(h.date));
                              setEditingLogId(h.logId); 
                            }}
                            className="text-indigo-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                          </button>
                          {(onDeleteBiomarkerFromLog || onDeleteBiomarkerLog) && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (onDeleteBiomarkerFromLog) {
                                  onDeleteBiomarkerFromLog(h.logId, def.key);
                                } else if (onDeleteBiomarkerLog) {
                                  onDeleteBiomarkerLog(h.logId);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional extracted test fields if present */}
                  {testDetail && (
                    <div className="text-[10px] space-y-1 text-theme-text-secondary pt-1 border-t border-theme-border/40">
                      {testDetail.originalTestName && testDetail.originalTestName !== def.name && (
                        <div>
                          <span className="font-medium">Original Name:</span> <span className="italic">{testDetail.originalTestName}</span>
                        </div>
                      )}
                      {testDetail.normalRange && (
                        <div>
                          <span className="font-medium">Extracted Range:</span> <span className="font-mono">{testDetail.normalRange}</span>
                        </div>
                      )}
                      {testDetail.doctorComment && (
                        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 p-1.5 rounded border border-indigo-100/30 mt-1 leading-relaxed">
                          <span className="font-bold uppercase text-[8px] tracking-wider block mb-0.5">Doctor/Lab Comment</span>
                          {testDetail.doctorComment}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
