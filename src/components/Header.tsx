import { trackApiCall } from '../utils/apiTracker';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, DbInteraction, QuotaData, FoodLog } from '../types';
import { translations } from '../utils/translations';
import { getAvailableCredits } from '../utils/creditManager';
import { NutrientPieChart } from './NutrientPieChart';
import {
  Eye, EyeOff, CloudLightning, CloudCheck, RefreshCw, LogOut, Check, ShieldCheck,
  Archive, FileSpreadsheet, KeyRound, Lock, Unlock, FileDown, FileUp, AlertTriangle,
  CloudUpload, CloudDownload, HelpCircle, Terminal, User, Cloud, Coins, Users
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import GoogleHealthIntegration from './GoogleHealthIntegration';
import FullScreenLogViewer from './FullScreenLogViewer';
import ApiCallTrackerModal from './ApiCallTrackerModal';
import UserManagementTab from './UserManagementTab';
import BackupRestoreTab from './BackupRestoreTab';
import { Activity, Stethoscope } from 'lucide-react';
import {
  getGoogleAccessToken,
  hasGoogleToken,
  runBackupWorkflow,
  listBackupsFromDrive,
  downloadFileFromDrive,
  previewBackupZip,
  restoreAccountToFirestore,
  clearGoogleToken
} from '../utils/googleBackup';
import { compressImage } from '../utils/imageCompressor';
import { checkQuotaFlag } from '../utils/firestoreUtils';
import { auditColors, auditFonts, auditDesignTokens, auditComponents, auditElements } from '../utils/themeRegistry';

const ColorPickerField = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl gap-2">
    <div className="min-w-0 text-left">
      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-slate-700 dark:text-slate-300"
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer overflow-hidden bg-transparent shrink-0"
        style={{ padding: 0, border: 'none' }}
      />
    </div>
  </div>
);

const TIMEZONES = [
  "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", 
  "America/Denver", "America/Chicago", "America/New_York", "America/Caracas", 
  "America/Buenos_Aires", "Atlantic/Azores", "Europe/London", "Europe/Paris", 
  "Africa/Cairo", "Europe/Moscow", "Asia/Dubai", "Asia/Karachi", "Asia/Dhaka", 
  "Asia/Bangkok", "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney", "Pacific/Noumea", "Pacific/Auckland"
];

const formatTimezone = (tz: string) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(new Date());
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value;
    const city = tz.split('/')[1]?.replace(/_/g, ' ') || tz;
    return `${city} (${tzName?.replace('GMT', 'UTC') || 'UTC'})`;
  } catch (e) {
    return tz;
  }
};

interface HeaderProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onSaveProfile?: (p: UserProfile) => Promise<void>;
  hideSensitive: boolean;
  setHideSensitive: (h: boolean) => void;
  syncState: 'synced' | 'syncing' | 'local' | 'conflict';
  onSignOut: () => void;
  onCloudSync?: () => Promise<void>;
  onForcePush?: () => Promise<void>;
  onForcePull?: () => Promise<void>;
  dbInteractions?: DbInteraction[];
  quota?: QuotaData;
  foodLogs?: FoodLog[];
  setFoodLogs?: (f: FoodLog[]) => void;
  biomarkerHistory?: any[];
  setBiomarkerHistory?: (b: any[]) => void;
  activeTab?: string;
  autoSyncDisabled?: boolean;
  onChangeAutoSyncDisabled?: (disabled: boolean) => void;
  biomarkers?: any;
  actions?: any[];
  dailyBenefits?: any[];
  report?: any;
  onSaveAndSync?: (profile: any, foodLogs: any[], biomarkers: any, biomarkerHistory: any[], actions: any[], dailyBenefits: any[], report: any, specificUpdate?: any) => Promise<void>;
  onOpenFrontDesk?: () => void;
}

const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'global';
  let id = sessionStorage.getItem('app_session_id');
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('app_session_id', id);
  }
  return id;
};


const sizeMap: Record<string, string> = {
  tiny: '12px',
  small: '14px',
  normal: '16px',
  large: '18px',
  xl: '20px',
  xxl: '24px',
  '3xl': '30px',
  '4xl': '36px'
};

function CustomFontSelect({ 
  value, 
  options, 
  onChange, 
  isFamily = false 
}: { 
  value: string; 
  options: {value: string, label: string}[]; 
  onChange: (val: string) => void;
  isFamily?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  
  return (
    <>
      <button 
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer text-center relative flex justify-between items-center"
      >
        <span className="flex-1 text-center" style={{ fontFamily: isFamily ? value : undefined, fontSize: !isFamily ? sizeMap[value] : undefined }}>
           {isFamily ? value : (options.find(o => o.value === value)?.label.replace(' (', ' - ').replace(')', '') || value)}
        </span>
        <span className="text-[8px] opacity-50 ml-2">▼</span>
      </button>
      
      {isOpen && buttonRef.current && createPortal(
        <>
          <div id="font-select-overlay" className="fixed inset-0 z-[150]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div id="font-select-portal" 
            className="fixed z-[160] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-y-auto"
            style={{
              top: (buttonRef.current.getBoundingClientRect().bottom + 200 > window.innerHeight) ? undefined : buttonRef.current.getBoundingClientRect().bottom + 4,
              bottom: (buttonRef.current.getBoundingClientRect().bottom + 200 > window.innerHeight) ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 4 : undefined,
              left: buttonRef.current.getBoundingClientRect().left,
              width: buttonRef.current.getBoundingClientRect().width,
              maxHeight: '200px'
            }}
          >
            {options.map(opt => (
              <div 
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  fontFamily: isFamily ? opt.value : undefined,
                  fontSize: !isFamily ? sizeMap[opt.value] : undefined,
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                {isFamily ? opt.label : opt.label.replace(' (', ' - ').replace(')', '')}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
export default function Header({
  profile,
  setProfile,
  onSaveProfile,
  hideSensitive,
  setHideSensitive,
  syncState,
  onSignOut,
  onCloudSync,
  onForcePush,
  onForcePull,
  dbInteractions = [],
  quota,
  foodLogs = [],
  setFoodLogs,
  biomarkerHistory = [],
  setBiomarkerHistory,
  activeTab = 'home',
  autoSyncDisabled = false,
  onChangeAutoSyncDisabled,
  biomarkers,
  actions,
  dailyBenefits,
  report,
  onSaveAndSync,
  onOpenFrontDesk
}: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showThemeScreen, setShowThemeScreen] = useState(false);
  const [themePreviewMode, setThemePreviewMode] = useState(false);
  const [themeCompactMode, setThemeCompactMode] = useState(false);
  
  const [themeActiveSection, setThemeActiveSection] = useState<'colors' | 'fonts' | 'tokens' | 'components' | 'elements' | 'presets'>('colors');
  const [expandedColorKey, setExpandedColorKey] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState<{ key: string; label: string; value: string } | null>(null);
  const [textPreviewOverride, setTextPreviewOverride] = useState<Record<string, 'light' | 'dark'>>({});
  const [justSavedKey, setJustSavedKey] = useState<string | null>(null);
  const [inspectedElement, setInspectedElement] = useState<any>(null);
  const [inspectorPaused, setInspectorPaused] = useState(false);
  const [inspectorProperty, setInspectorProperty] = useState('color');
  const [inspectorVariable, setInspectorVariable] = useState('');
  const [showDbInteractionsOverlay, setShowDbInteractionsOverlay] = useState(false);
  const [dbOverlayViewMode, setDbOverlayViewMode] = useState<'admin' | 'user'>(() => {
    if (profile?.email?.toLowerCase().trim() !== 'cwah.liu@gmail.com') return 'user';
    const saved = localStorage.getItem('health_cockpit_admin_mode');
    if (saved) return saved as 'admin' | 'user';
    return 'admin';
  });
  const [activeAdminTab, setActiveAdminTab] = useState<'sync' | 'users' | 'backup'>('sync');
  const [showAgentLogs, setShowAgentLogs] = useState(false);
  const [showApiTracker, setShowApiTracker] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [agentLogs, setAgentLogs] = useState<{ timestamp: string, message: string }[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [age, setAge] = useState<number | string>(profile.age);
  const [ethnicity, setEthnicity] = useState(profile.ethnicity);
  const [weight, setWeight] = useState<number | string>(profile.weight);
  const [height, setHeight] = useState<number | string>(profile.height);
  const [bloodType, setBloodType] = useState<string>(profile.bloodType || '');
  const [gender, setGender] = useState<string>(profile.gender || 'Unknown');
  const [unitPreference, setUnitPreference] = useState<string>(profile.unitPreference || 'SI');
  const [timezone, setTimezone] = useState<string>(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [now, setNow] = useState(Date.now());
  const t = translations[profile.language] || translations.en;

  const handleToggleAutoSync = (disabled: boolean) => {
    if (onChangeAutoSyncDisabled) {
      onChangeAutoSyncDisabled(disabled);
    }
  };

  
  useEffect(() => {
    if (!themePreviewMode) {
      revertPreview();
      setInspectedElement(null);
      return;
    }
    const handler = (e: MouseEvent) => {
      if ((e.target as Element).closest('#theme-customizer-screen') || (e.target as Element).closest('#font-select-portal') || (e.target as Element).closest('#font-select-overlay')) {
        revertPreview();
        setInspectedElement(null);
        return;
      }
      if ((e.target as Element).closest('#inspector-popup')) return;
      if (inspectorPaused) return; // let the click through untouched
      e.preventDefault();
      e.stopPropagation();
      
      const el = e.target as HTMLElement;
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = '#' + el.id;
      } else if (el.className && typeof el.className === 'string') {
        const cls = el.className.split(' ').map(c => c.trim()).filter(c => c && !c.includes(':') && !c.includes('/') && !c.includes('[') && !c.includes('!')).join('.');
        if (cls) selector += '.' + cls;
      }
      
      setInspectedElement({
        el,
        selector,
        rect: el.getBoundingClientRect(),
        text: el.innerText ? el.innerText.substring(0, 20) : 'Element'
      });
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [themePreviewMode, inspectorPaused]);

  // Handle saving overrides
  const saveOverride = () => {
    if (!inspectedElement || !inspectorVariable) return;
    const existingOverrides = profile.themeOverrides || [];
    const filteredOverrides = existingOverrides.filter(
      (o: any) => !(o.selector === inspectedElement.selector && o.property === inspectorProperty)
    );
    const newOverrides = [...filteredOverrides, {
      selector: inspectedElement.selector,
      property: inspectorProperty,
      variable: inspectorVariable
    }];
    setProfile({ ...profile, themeOverrides: newOverrides });
    inspectorOriginalValue.current = null;
    setInspectedElement(null);
  };

  // Dynamic color/font registry helpers
  const handleRenameColor = (key: string, newLabel: string) => {
    const currentList = [...(profile.customColors || auditColors)];
    const updatedList = currentList.map((c: any) => c.key === key ? { ...c, label: newLabel } : c);
    setProfile({ ...profile, customColors: updatedList });
  };

  const handleDeleteColor = (key: string) => {
    const currentList = [...(profile.customColors || auditColors)];
    const updatedList = currentList.filter((c: any) => c.key !== key);
    // Also remove from themePalette if present
    const nextPalette = { ...(profile.themePalette || {}) };
    delete (nextPalette as any)[key];
    setProfile({ ...profile, customColors: updatedList, themePalette: nextPalette });
  };

  const handleAddColor = (category: 'general' | 'text' | 'status' | 'nutrients') => {
    const currentList = [...(profile.customColors || auditColors)];
    const newKey = `custom_${Date.now()}`;
    const newColor = {
      key: newKey,
      label: 'New ' + (category === 'general' ? 'General' : category === 'text' ? 'Text' : category === 'status' ? 'Status' : 'Nutrients') + ' Color',
      description: 'Custom added color variable',
      defaultHex: '#3b82f6',
      tailwindVar: '',
      category: category
    };
    const updatedList = [...currentList, newColor];
    const nextPalette = { ...(profile.themePalette || {}) };
    (nextPalette as any)[newKey] = '#3b82f6'; // set default color value
    setProfile({ ...profile, customColors: updatedList, themePalette: nextPalette });
  };

  const handleRenameFont = (key: string, newLabel: string) => {
    const currentList = [...(profile.customFonts || auditFonts)];
    const updatedList = currentList.map((f: any) => f.key === key ? { ...f, label: newLabel } : f);
    setProfile({ ...profile, customFonts: updatedList });
  };

  const THEME_CATEGORY_SECTION_LABELS: Record<string, string> = {
    general: 'General colours',
    text: 'Text colour',
    status: 'Status',
    nutrients: 'Nutrients & Targets'
  };

  const buildExportPayload = (presetConfig: any, presetName: string) => {
    const colorsSource = profile.customColors || auditColors;
    const fontsSource = profile.customFonts || auditFonts;
    const palette = presetConfig?.themePalette || {};

    const colours: Record<string, Record<string, string>> = {};
    colorsSource.forEach((c: any) => {
      const sectionLabel = THEME_CATEGORY_SECTION_LABELS[c.category] || 'Other colours';
      if (!colours[sectionLabel]) colours[sectionLabel] = {};
      const value = palette[c.key] !== undefined ? palette[c.key] : c.defaultHex;
      const displayName = c.key.startsWith('custom_') ? `${c.label} (custom)` : c.label;
      colours[sectionLabel][displayName] = value;
    });

    const fonts: Record<string, any> = {};
    fontsSource.forEach((f: any) => {
      const currentVal = presetConfig?.[f.fontSizeKey] || 'normal';
      const currentOption = (f.options || []).find((o: any) => o.value === currentVal);
      const scale: Record<string, string> = {};
      (f.options || []).forEach((o: any) => { scale[o.value] = o.label; });
      const displayName = f.key.startsWith('custom_') ? `${f.label} (custom)` : f.label;
      fonts[displayName] = {
        current: currentOption ? currentOption.label : currentVal,
        scale
      };
    });
    fonts['Sans Font'] = { current: presetConfig?.fontFamily || 'Inter', scale: null };
    fonts['Mono Font'] = { current: presetConfig?.fontMono || 'JetBrains Mono', scale: null };

    const tokens: Record<string, any> = {};
    auditDesignTokens.forEach((t) => {
      const currentVal = presetConfig?.[t.tokenKey] || t.defaultValue;
      const currentOption = (t.options || []).find((o) => o.value === currentVal);
      const scale: Record<string, string> = {};
      (t.options || []).forEach((o) => { scale[o.value] = o.label; });
      tokens[t.label] = {
        current: currentOption ? currentOption.label : currentVal,
        scale
      };
    });

    return {
      _meta: {
        format: 'health-tracker-3-theme-preset',
        version: 2,
        note: "Every colour, font, and layout token below is listed by its current display name (including custom renames) and computed value, grouped into the same sections shown in this app's theme editor. To import, match each name to the corresponding variable in the theme editor and apply its value."
      },
      preset: {
        name: presetName,
        colours,
        fonts,
        tokens,
        themeOverrides: presetConfig?.themeOverrides
      }
    };
  };

  const PRESET_COMPARE_KEYS = ['themePalette', 'fontFamily', 'fontMono', 'fontSize', 'marginScale', 'paddingScale', 'cornerRadius', 'shadowScale', 'themeOverrides', 'customColors', 'fontSizeTitle', 'fontSizeSubtitle', 'fontSizeDescription', 'fontSizeBodySmall', 'fontSizeSubtitleSmall', 'fontSizeKeyMetric', 'fontSizeXS', 'fontSizeBody', 'customFonts'];

  const normalizePresetValue = (v: any) => {
    if (v === undefined || v === null) return null;
    if (Array.isArray(v) && v.length === 0) return null;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return null;
    return v;
  };

  const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return a.every((v, i) => deepEqual(v, b[i]));
    }
    if (typeof a === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every(k => deepEqual(a[k], b[k]));
    }
    return false;
  };

  const isPresetActive = (presetConfig: any) => {
    if (!presetConfig) return false;
    return PRESET_COMPARE_KEYS.every(k =>
      deepEqual(normalizePresetValue((profile as any)[k]), normalizePresetValue((presetConfig as any)[k]))
    );
  };

  const getThemeVariableChangesCount = () => {
    let count = profile.themeOverrides?.length || 0;
    
    // Track customized values in themePalette compared to defaults
    if (profile.themePalette) {
      Object.entries(profile.themePalette).forEach(([key, val]) => {
        const defaultColor = auditColors.find((c: any) => c.key === key);
        if (defaultColor && val && defaultColor.defaultHex !== val) {
          count++;
        }
      });
    }

    const currentColors = profile.customColors || auditColors;
    currentColors.forEach((color: any) => {
      const defaultColor = auditColors.find((c: any) => c.key === color.key);
      if (defaultColor) {
        if (defaultColor.label !== color.label) {
          count++;
        }
      } else {
        count++; // New color added
      }
    });

    // Also count any deleted default colors
    auditColors.forEach((dc: any) => {
      const stillExists = currentColors.some((c: any) => c.key === dc.key);
      if (!stillExists) {
        count++;
      }
    });

    const currentFonts = profile.customFonts || auditFonts;
    currentFonts.forEach((font: any) => {
      const defaultFont = auditFonts.find((f: any) => f.key === font.key);
      if (defaultFont) {
        if (defaultFont.label !== font.label) {
          count++;
        }
      } else {
        count++; // New font added
      }
    });

    return count;
  };

  const colorsList = profile.customColors || auditColors;
  const fontsList = profile.customFonts || auditFonts;

  const getColorVariable = (key: string) => {
    const map: Record<string, string> = {
      button: '--color-indigo-500',
      background: '--app-bg',
      bgCard: '--app-bg-card',
      border: '--app-border',
      text: '--app-text',
      textSecondary: '--app-text-secondary',
      textAccent: '--color-text-accent',
      textMuted: '--color-text-muted',
      warning: '--color-rose-500',
      caution: '--color-amber-500',
      success: '--color-emerald-500',
      info: '--color-blue-500',
      neutralSetting: '--app-neutral',
      nutrientCalories: '--color-nutrient-calories',
      nutrientProtein: '--color-nutrient-protein',
      nutrientCarbs: '--color-nutrient-carbohydrates',
      nutrientFat: '--color-nutrient-totalFat',
      nutrientSatFat: '--color-nutrient-saturatedFat',
      nutrientSodium: '--color-nutrient-sodium'
    };
    return map[key] || `--color-${key}`;
  };

  const detectCurrentVariable = (el: HTMLElement, property: string) => {
    const cssProp = property === 'color' ? 'color' : property === 'background-color' ? 'backgroundColor' : property === 'border-color' ? 'borderColor' : null;
    if (!cssProp) return '';
    const currentValue = getComputedStyle(el)[cssProp as any];
    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    let matched = '';
    for (const color of colorsList) {
      (probe.style as any)[cssProp] = `var(${getColorVariable(color.key)})`;
      if (getComputedStyle(probe)[cssProp as any] === currentValue) {
        matched = `var(${getColorVariable(color.key)})`;
        break;
      }
    }
    document.body.removeChild(probe);
    return matched;
  };

  useEffect(() => {
    if (inspectedElement?.el) {
      setInspectorVariable(detectCurrentVariable(inspectedElement.el, inspectorProperty));
    }
  }, [inspectedElement, inspectorProperty]);

  const inspectorOriginalValue = useRef<string | null>(null);

  const applyPreview = (variable: string, property: string, el: HTMLElement) => {
    const cssProp = property === 'color' ? 'color' : property === 'background-color' ? 'backgroundColor' : property === 'border-color' ? 'borderColor' : null;
    if (!cssProp) return;
    if (inspectorOriginalValue.current === null) {
      inspectorOriginalValue.current = el.style[cssProp as any] || '';
    }
    (el.style as any)[cssProp] = variable ? variable : '';
  };

  const revertPreview = () => {
    if (inspectedElement?.el && inspectorOriginalValue.current !== null) {
      const cssProp = inspectorProperty === 'color' ? 'color' : inspectorProperty === 'background-color' ? 'backgroundColor' : inspectorProperty === 'border-color' ? 'borderColor' : null;
      if (cssProp) (inspectedElement.el.style as any)[cssProp] = inspectorOriginalValue.current;
    }
    inspectorOriginalValue.current = null;
  };

  const getFontVariable = (key: string) => {
    const map: Record<string, string> = {
      fontSize: '--font-size',
      fontSizeTitle: '--font-size-title',
      fontSizeSubtitle: '--font-size-subtitle',
      fontSizeSubtitleSmall: '--font-size-subtitle-small',
      fontSizeBody: '--font-size-body',
      fontSizeBodySmall: '--font-size-body-small',
      fontSizeKeyMetric: '--font-size-key-metric',
      fontSizeXS: '--font-size-xs'
    };
    return map[key] || `--font-size-${key.toLowerCase()}`;
  };

  useEffect(() => {
    let interval: any;
    if (showAgentLogs) {
      const fetchLogs = async () => {
        try {
          const res = await fetch('/api/gemini/debug-logs', {
            headers: { 'X-Session-ID': 'global' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.logs)) {
              setAgentLogs(data.logs);
            }
          }
        } catch (e) {}
      };
      fetchLogs();
      interval = setInterval(fetchLogs, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showAgentLogs]);

  const handleClearAgentLogs = async () => {
    try {
      await fetch('/api/gemini/clear-debug-logs', { method: 'POST', headers: { 'X-Session-ID': 'global' } });
      setAgentLogs([]);
    } catch (e) {}
  };


  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('agent_debug_mode') === 'true');
  const [serverStartTime, setServerStartTime] = useState<number | null>(null);

  // Keep track of last sync time in local state
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    const email = profile?.email?.toLowerCase().trim() || 'guest';
    return localStorage.getItem(`ghealth_${email}_last_sync`);
  });

  // Whenever syncState changes to 'synced', update last sync time to now
  useEffect(() => {
    if (syncState === 'synced') {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const email = profile?.email?.toLowerCase().trim() || 'guest';
      localStorage.setItem(`ghealth_${email}_last_sync`, nowStr);
      setLastSyncTime(nowStr);
    }
  }, [syncState, profile?.email]);

  useEffect(() => {
    const email = profile?.email?.toLowerCase().trim() || 'guest';
    setLastSyncTime(localStorage.getItem(`ghealth_${email}_last_sync`));
  }, [profile?.email]);

  // Google Drive & Sheets Backup / Restore States
  const [googleAuthorized, setGoogleAuthorized] = useState(() => hasGoogleToken());
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [backupVersion, setBackupVersion] = useState('V1');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupComment, setBackupComment] = useState('');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [backupError, setBackupError] = useState('');
  const [backupResult, setBackupResult] = useState<any>(null);

  const [restoreFiles, setRestoreFiles] = useState<any[]>([]);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<any>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'listing' | 'downloading' | 'preview' | 'restoring' | 'success' | 'error'>('idle');
  const [restoreError, setRestoreError] = useState('');
  const [restorePreviewData, setRestorePreviewData] = useState<any[]>([]);
  const [restoreTargetAccount, setRestoreTargetAccount] = useState<string>('all'); // 'all' or specific account email
  const [restoreTargetFileBlob, setRestoreTargetFileBlob] = useState<Blob | null>(null);

  const handleOpenBackup = async () => {
    try {
      const token = await getGoogleAccessToken();
      setGoogleAuthorized(true);
      setBackupStatus('idle');
      setBackupError('');
      setBackupResult(null);
      setBackupPassword('');
      setBackupComment('');
      setShowBackupModal(true);
    } catch (err: any) {
      console.error("Google Auth failed:", err);
    }
  };

  const handleExecuteBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupPassword) {
      setBackupError("An encryption password is required to secure your backup ZIP file.");
      return;
    }
    setBackupStatus('processing');
    setBackupError('');
    try {
      const token = await getGoogleAccessToken();
      const result = await runBackupWorkflow(token, backupVersion, backupComment, backupPassword);
      setBackupResult(result);
      setBackupStatus('success');
    } catch (err: any) {
      console.error("Backup failed:", err);
      setBackupError(err.message || String(err));
      setBackupStatus('error');
    }
  };

  const handleOpenRestore = async () => {
    setRestoreStatus('listing');
    setRestoreError('');
    setRestoreFiles([]);
    setSelectedRestoreFile(null);
    setRestorePassword('');
    setRestorePreviewData([]);
    setRestoreTargetAccount('all');
    setRestoreTargetFileBlob(null);
    setShowRestoreModal(true);

    try {
      const token = await getGoogleAccessToken();
      setGoogleAuthorized(true);
      const files = await listBackupsFromDrive(token);
      setRestoreFiles(files);
      setRestoreStatus('idle');
    } catch (err: any) {
      console.error("Failed to list backups:", err);
      setRestoreError(err.message || "Failed to list backups from Google Drive.");
      setRestoreStatus('error');
    }
  };

  const handleSelectRestoreFile = (file: any) => {
    setSelectedRestoreFile(file);
    setRestorePassword('');
    setRestoreError('');
    setRestorePreviewData([]);
    setRestoreTargetFileBlob(null);
    setRestoreStatus('idle');
  };

  const handleLoadAndDecryptBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestoreFile) return;
    setRestoreStatus('downloading');
    setRestoreError('');

    try {
      const token = await getGoogleAccessToken();
      const blob = await downloadFileFromDrive(token, selectedRestoreFile.id);
      setRestoreTargetFileBlob(blob);

      const preview = await previewBackupZip(blob, restorePassword);
      setRestorePreviewData(preview);
      setRestoreStatus('preview');
    } catch (err: any) {
      console.error("Unzip/Decrypt failed:", err);
      setRestoreError(err.message || "Decryption failed. Please verify your backup password.");
      setRestoreStatus('idle');
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreTargetFileBlob) return;
    if (!window.confirm("This will restore the selected records back to Firestore. Are you sure you want to proceed?")) {
      return;
    }

    setRestoreStatus('restoring');
    setRestoreError('');
    try {
      if (restoreTargetAccount === 'all') {
        for (const account of restorePreviewData) {
          if (account.jsonData) {
            await restoreAccountToFirestore(account.jsonData.uid, account.jsonData);
          }
        }
      } else {
        const account = restorePreviewData.find(acc => acc.email === restoreTargetAccount);
        if (account && account.jsonData) {
          await restoreAccountToFirestore(account.jsonData.uid, account.jsonData);
        } else {
          throw new Error("Selected account data not found in archive.");
        }
      }
      setRestoreStatus('success');
    } catch (err: any) {
      console.error("Restore failed:", err);
      setRestoreError(err.message || String(err));
      setRestoreStatus('error');
    }
  };

  const handleToggleDebugMode = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem('agent_debug_mode', enabled ? 'true' : 'false');
  };


  // Fetch real server start time
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d.startTime === 'number') {
          setServerStartTime(d.startTime);
        }
      })
      .catch(e => console.error("Error fetching status:", e));
  }, []);

  useEffect(() => {
    let interval: any;
    if (showDbInteractionsOverlay) {
      interval = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showDbInteractionsOverlay]);


  useEffect(() => {
    setNickname(profile.nickname);
    setAge(profile.age);
    setEthnicity(profile.ethnicity);
    setWeight(profile.weight);
    setHeight(profile.height);
    setBloodType(profile.bloodType || '');
    setGender(profile.gender || 'Unknown');
    setUnitPreference(profile.unitPreference || 'SI');
    setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [profile]);

  const handleSave = () => {
    const finalProfile = {
      ...profile,
      nickname,
      age: Number(age) || 0,
      ethnicity,
      weight: Number(weight) || 0,
      height: Number(height) || 0,
      bloodType,
      gender,
      unitPreference: unitPreference as 'SI' | 'US',
      timezone
    };
    if (onSaveProfile) {
      onSaveProfile(finalProfile);
    } else {
      setProfile(finalProfile);
    }
    setIsEditing(false);
  };

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 sticky top-0 z-40 shadow-sm transition-colors duration-200">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Profile Info Row */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button 
            id="avatar-edit-btn"
            onClick={() => setIsEditing(!isEditing)} 
            className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500/20 flex-shrink-0 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <img 
              src={profile.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"} 
              alt="User profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
          
          <div className="min-w-0 flex-1">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span id="user-nickname-text" className="font-semibold text-slate-950 dark:text-slate-100 truncate text-base leading-tight">
                  {profile.nickname || 'Healthy User'}
                </span>
                {(() => {
                  const info = getAvailableCredits(profile);
                  return (
                    <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" title={`${info.total} agent credits left`}>
                      <Coins className="w-2.5 h-2.5" />
                      {info.total}
                    </span>
                  );
                })()}
              </div>
              <span className="text-[10px] text-slate-400 capitalize font-medium mt-0.5 block tracking-wide">
                {activeTab === 'home' ? 'Home' : activeTab === 'insights' ? 'Health insights' : activeTab === 'food' ? 'Food & Nutrition Logs' : activeTab === 'medical' ? 'Medical History' : activeTab === 'trends' ? 'Health Trends' : activeTab}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {lastSyncTime && (
            <span
              onClick={() => setShowDbInteractionsOverlay(true)}
              className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 cursor-pointer hover:underline hover:text-indigo-600 transition-colors"
              title="Click to view detailed database sync log"
            >
              Sync: {lastSyncTime}
            </span>
          )}
          {onOpenFrontDesk && (
            <button
              onClick={onOpenFrontDesk}
              className="p-2.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-400 rounded-2xl transition-all flex items-center justify-center cursor-pointer hover:scale-[1.03]"
              title="Health Preparation Agent"
            >
              <Stethoscope className="w-5 h-5" />
            </button>
          )}
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-2xl transition-all flex items-center justify-center cursor-pointer hover:scale-[1.03]"
              title="API Call Tracker"
            >
              <Activity className="w-5 h-5" />
            </button>

          {/* Sync Status Icon Indicator */}
          {(() => {
            const isAttentionNeeded = syncState === 'syncing' || dbInteractions.some(o => o.status === 'pending') || checkQuotaFlag();
            return (
              <button
                id="cloud-sync-btn"
                onClick={async () => {
                  if (onCloudSync) {
                    await onCloudSync();
                  }
                }}
                className={`flex items-center p-2 rounded-xl transition-colors cursor-pointer relative ${
                  isAttentionNeeded 
                    ? 'text-amber-500 hover:bg-amber-500/10' 
                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Click to manually synchronize data with cloud database"
              >
                {syncState === 'syncing' && (
                  <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                )}
                {syncState === 'synced' && (
                  <CloudCheck className="w-5.5 h-5.5 text-slate-400 dark:text-slate-500" />
                )}
                {syncState === 'local' && (
                  checkQuotaFlag() ? (
                    <span title="Firestore Quota Exceeded - Offline Mode Only">
                      <CloudLightning className="w-5 h-5 text-amber-500 animate-pulse" />
                    </span>
                  ) : (
                    <CloudLightning className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )
                )}
                {dbInteractions.some(o => o.status === 'pending') && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                )}
              </button>
            );
          })()}
        </div>
      </div>
    
      {/* AI Agent Full Screen Logs */}
      <FullScreenLogViewer
        isOpen={showAgentLogs}
        onClose={() => setShowAgentLogs(false)}
        title="AI Agent Diagnostic Log History"
        logsText={agentLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\n')}
        logsArray={agentLogs.map(l => `[${l.timestamp}]\n${l.message}`)}
        onClearLogs={handleClearAgentLogs}
        eventsCount={agentLogs.length}
      />
    </header>


      {/* Editing Dialog Slide-down for Profile Parameters */}
      {isEditing && createPortal((
        <div id="profile-edit-modal" className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 sm:bg-slate-900/60 sm:backdrop-blur-sm flex items-center justify-center sm:p-4 overflow-hidden">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-800 sm:rounded-3xl sm:shadow-xl max-w-lg animation-fade-in text-slate-800 dark:text-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Profile</h2>
                <p className="text-xs text-slate-450 dark:text-slate-400">Update your health indicators and settings</p>
              </div>
              <div className="flex gap-2">
                <button
                  id="profile-save-btn"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

              {/* Content scroll area */}
            <div className="p-6 overflow-y-auto space-y-4 text-left flex-1 pb-16">
              
              {/* Real Profile Photo Uploader */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-3.5">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500/25 flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <img 
                src={profile.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"} 
                alt="User profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upload photo</span>
                <button
                  type="button"
                  id="edit-theme-link"
                  onClick={() => {
                    setIsEditing(false);
                    setShowThemeScreen(true);
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  edit theme
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    compressImage(file, 200, 200, 0.5)
                      .then((compressedBase64) => {
                        const updated = { ...profile, photoUrl: compressedBase64 };
                        if (onSaveProfile) {
                          onSaveProfile(updated);
                        } else {
                          setProfile(updated);
                        }
                      })
                      .catch((err) => {
                        console.error("Failed to compress profile photo, falling back to raw reader:", err);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          const updated = { ...profile, photoUrl: base64String };
                          if (onSaveProfile) {
                            onSaveProfile(updated);
                          } else {
                            setProfile(updated);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                  }
                }}
                className="text-xs text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950/40 dark:file:text-indigo-400 hover:file:bg-indigo-100/50 cursor-pointer w-full"
              />
            </div>
          </div>

          {/* Agent Credit Status Panel */}
          {(() => {
            const creditInfo = getAvailableCredits(profile);
            return (
              <div className="bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Agent Credits</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100/80 dark:bg-indigo-950/65 text-indigo-700 dark:text-indigo-450 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {creditInfo.userType} Account
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 rounded-xl p-2">
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Available</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{creditInfo.total}</span>
                    <span className="block text-[8px] text-slate-500">Credits left</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 rounded-xl p-2">
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Daily Quota</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{creditInfo.daily}</span>
                    <span className="block text-[8px] text-slate-500">resets in {creditInfo.nextResetStr}</span>
                  </div>
                </div>

                {/* Granted Credits / Duration info */}
                {creditInfo.grantedDetails.length > 0 && (
                  <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-100/50 dark:border-slate-800/45 rounded-xl p-2.5 space-y-1.5 text-left">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Granted Credits (active)</span>
                    {creditInfo.grantedDetails.map((gc, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] text-slate-650 dark:text-slate-350">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">+{gc.amount} credits</span>
                        <span className="text-[9px] font-mono text-slate-400">Expires: {new Date(gc.expiresAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.nicknameLabel}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.ethnicity}</label>
              <select
                value={ethnicity}
                onChange={(e) => setEthnicity(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Unknown">Unknown</option>
                <option value="Chinese">Chinese / East Asian</option>
                <option value="Caucasian">Caucasian</option>
                <option value="South Asian">South Asian</option>
                <option value="African American">African American / Black</option>
                <option value="Hispanic">Hispanic / Latino</option>
                <option value="Southeast Asian">Southeast Asian</option>
                <option value="Other">Mixed / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.age}</label>
              <input
                type="number"
                value={age === 0 ? '' : age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.weight} (kg)</label>
              <input
                type="number"
                value={weight === 0 ? '' : weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t.height} (cm)</label>
              <input
                type="number"
                value={height === 0 ? '' : height}
                onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Blood Type</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Unknown">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Unit Preference</label>
              <select
                value={unitPreference}
                onChange={(e) => setUnitPreference(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="SI">SI Units (International)</option>
                <option value="US">US Units</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{formatTimezone(tz)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl px-3 py-2 mt-1 text-left">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Email</span>
              <span className="text-xs font-mono text-slate-650 dark:text-slate-300 break-all">{profile.email}</span>
            </div>

            {/* Preferences & Session */}
            <div className="col-span-2 border-t border-slate-100 dark:border-slate-800/85 mt-2 pt-3 text-left">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Preferences & Session</span>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Language Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Language</label>
                  <select
                    id="lang-selector"
                    value={profile.language}
                    onChange={(e) => setProfile({ ...profile, language: e.target.value as any })}
                    className="w-full text-sm font-sans bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="en">English (EN)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="zh">中文 (ZH)</option>
                    <option value="id">Bahasa Indonesia (ID)</option>
                  </select>
                </div>

                {/* Privacy mode toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Privacy Mode</label>
                  <button
                    type="button"
                    id="toggle-sensitive-btn"
                    onClick={() => setHideSensitive(!hideSensitive)}
                    className="w-full flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3 py-2 text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                  >
                    <span className="truncate">{hideSensitive ? t.sensitiveHidden : t.sensitiveShown}</span>
                    {hideSensitive ? <EyeOff className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" /> : <Eye className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />}
                  </button>
                </div>
              </div>



              {/* Logout button */}
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/85 pt-3">
                <button
                  type="button"
                  id="signout-btn"
                  onClick={() => {
                    clearGoogleToken();
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl px-3 py-2 text-rose-600 dark:text-rose-400 font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ), document.body)}

      {/* Dedicated full-screen or elegant modal Theme Customizer Screen */}
      
      {/* Inspector Popup */}
      {themePreviewMode && inspectedElement && createPortal((
        <div id="inspector-popup" className="fixed z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 w-64" style={{ top: Math.min(window.innerHeight - 250, inspectedElement.rect.bottom + 10), left: Math.min(window.innerWidth - 270, Math.max(10, inspectedElement.rect.left)) }}>
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex-1">{inspectedElement.selector}</h4>
            <button onClick={() => { revertPreview(); setInspectedElement(null); }} className="text-slate-400 hover:text-slate-600 ml-2">✕</button>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Property</label>
            <select value={inspectorProperty} onChange={e => setInspectorProperty(e.target.value)} className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-slate-100">
              <option value="color">Text Color (color)</option>
              <option value="background-color">Background Color</option>
              <option value="border-color">Border Color</option>
              <option value="font-family">Font Family</option>
              <option value="font-size">Font Size</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Variable</label>
            <select value={inspectorVariable} onChange={e => {
              setInspectorVariable(e.target.value);
              if (inspectedElement?.el) applyPreview(e.target.value, inspectorProperty, inspectedElement.el);
            }} className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-slate-100">
              <option value="">Select variable...</option>
              {inspectorProperty.includes('color') ? (
                <>
                  {colorsList.map((color: any) => (
                    <option key={color.key} value={`var(${getColorVariable(color.key)})`}>
                      {color.label}
                    </option>
                  ))}
                </>
              ) : inspectorProperty === 'font-size' ? (
                <>
                  {fontsList.map((font: any) => (
                    <option key={font.key} value={`var(${getFontVariable(font.key)})`}>
                      {font.label}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="var(--font-sans)">Sans Font</option>
                  <option value="var(--font-mono)">Mono Font</option>
                  <option value="var(--font-display)">Display Font</option>
                </>
              )}
            </select>
          </div>
          <button onClick={saveOverride} className="w-full py-1.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">Assign Variable</button>
        </div>
      ), document.body)}

{showThemeScreen && createPortal((
        <>
        {themePreviewMode && (
          <style>{`
            #root {
              transform: translateX(0); /* containing block */
              transition: all 0.3s ease;
            }
            @media (min-width: 800px) {
              #root {
                width: 50vw !important;
                margin-left: 50vw !important;
              }
            }
            @media (max-width: 799px) {
              #root {
                margin-top: ${themeCompactMode ? '200px' : '50vh'} !important;
              }
            }
          `}</style>
        )}
        <div id="theme-customizer-screen" className={`fixed inset-0 z-[60] pointer-events-none ${themePreviewMode ? '' : 'p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center'}`}>
          <div className={`bg-white dark:bg-slate-900 shadow-2xl flex flex-col animation-fade-in text-slate-800 dark:text-slate-100 pointer-events-auto transition-all duration-300 ${themePreviewMode ? "border-r border-slate-200 dark:border-slate-800" : "border border-slate-200 dark:border-slate-800"}
            ${themePreviewMode 
              ? (themeCompactMode 
                 ? 'fixed top-0 left-0 w-full h-[200px] rounded-b-2xl shadow-xl z-[70] overflow-hidden' 
                 : 'fixed top-0 left-0 w-full min-[800px]:w-1/2 h-[50vh] min-[800px]:h-[100vh] rounded-b-3xl min-[800px]:rounded-none shadow-2xl z-[70] overflow-hidden')
              : 'relative w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl m-auto overflow-hidden'}
          `}>
            {themeCompactMode && (
              <button
                onClick={() => setThemeCompactMode(false)}
                className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 z-[80]"
                title="Expand"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
              </button>
            )}
            
            {/* Header */}
            {!themeCompactMode && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!themePreviewMode && (
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 hidden sm:block">Theme & Accent Settings</h2>
                )}
                {themePreviewMode && (
                  <select
                    value={themeActiveSection}
                    onChange={(e) => setThemeActiveSection(e.target.value as any)}
                    className="text-sm font-semibold bg-white border border-slate-250 dark:border-slate-700 rounded-full px-3 py-1.5 text-slate-900 focus:outline-none cursor-pointer shadow-sm w-full sm:w-auto"
                  >
                    <option value="colors">🎨 Colours</option>
                    <option value="fonts">🔤 Font</option>
                    <option value="tokens">📐 Token</option>
                    <option value="components">📦 Components</option>
                    <option value="elements">🔗 Elements</option>
                    <option value="presets">🔖 Presets</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {themePreviewMode && (
                  <button
                    onClick={() => setThemeCompactMode(!themeCompactMode)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mr-1"
                    title={themeCompactMode ? "Expand" : "Compact Mode"}
                  >
                    {themeCompactMode ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    )}
                  </button>
                )}
                {themePreviewMode && (
                  <button
                    onClick={() => {
                      setInspectorPaused(!inspectorPaused);
                      if (!inspectorPaused) {
                        revertPreview();
                        setInspectedElement(null);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer mr-1 ${
                      inspectorPaused
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={inspectorPaused ? 'Resume click-to-assign' : 'Pause click-to-assign (interact with the page)'}
                  >
                    {inspectorPaused ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    setThemePreviewMode(!themePreviewMode);
                    if (themeCompactMode) setThemeCompactMode(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer border ${themePreviewMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {themePreviewMode ? 'Exit Edit Mode' : 'Edit Mode'}
                </button>
                <button
                  onClick={() => {
                    if (onSaveProfile) {
                      onSaveProfile(profile);
                    }
                    setThemePreviewMode(false);
                    revertPreview();
                    setInspectedElement(null);
                    setShowThemeScreen(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => {
                    setThemePreviewMode(false);
                    revertPreview();
                    setInspectedElement(null);
                    setShowThemeScreen(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            )}

            {/* Dynamic Section Dropdown Selector */}
            {!themePreviewMode && !themeCompactMode && (
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 text-left">
                <select
                  value={themeActiveSection}
                  onChange={(e) => setThemeActiveSection(e.target.value as any)}
                  className="text-sm font-semibold bg-white border border-slate-250 dark:border-slate-700 rounded-full px-4 py-2 text-slate-900 focus:outline-none cursor-pointer shadow-sm w-full sm:w-auto"
                >
                  <option value="colors">🎨 Colours ({colorsList.length} Items)</option>
                  <option value="fonts">🔤 Font ({fontsList.length} Sizes)</option>
                  <option value="tokens">📐 Design Token ({auditDesignTokens.length} Factors)</option>
                  <option value="components">📦 Components (4 Audited)</option>
                  <option value="elements">🔗 Elements (9 Audited)</option>
                  <option value="presets">🔖 Presets</option>
                </select>
              </div>
            )}

            {/* Content scroll area */}
            <div className={`p-6 overflow-y-auto space-y-6 text-left flex-1 ${themeCompactMode ? 'pt-14' : ''}`}>
              
              {/* COLORS SECTION */}
              {themeActiveSection === 'colors' && (
                <div className="space-y-4">
                  {(() => {
                    const generalColors = colorsList.filter((c: any) => c.category === 'general' || ['button', 'background', 'bgCard', 'border', 'neutralSetting'].includes(c.key));
                    const textColors = colorsList.filter((c: any) => c.category === 'text' || ['text', 'textSecondary', 'textAccent', 'textMuted'].includes(c.key));
                    const statusColors = colorsList.filter((c: any) => c.category === 'status' || ['warning', 'caution', 'success', 'info'].includes(c.key));
                    const nutrientColors = colorsList.filter((c: any) => c.category === 'nutrients' || ['nutrientCalories', 'nutrientProtein', 'nutrientCarbs', 'nutrientFat', 'nutrientSatFat', 'nutrientSodium'].includes(c.key));

                    const renderColorItem = (color: any) => {
                      const activeVal = (profile.themePalette as any)?.[color.key] || color.defaultHex;
                      const isExpanded = expandedColorKey === color.key;
                      const draftLabel = colorDraft && colorDraft.key === color.key ? colorDraft.label : color.label;
                      const draftVal = colorDraft && colorDraft.key === color.key ? colorDraft.value : activeVal;

                      return (
                        <div key={color.key} className="transition-all duration-200">
                          {/* Main Row */}
                          <div 
                            className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-all group"
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              {/* Swatch */}
                              <div 
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedColorKey(null);
                                    setColorDraft(null);
                                  } else {
                                    setExpandedColorKey(color.key);
                                    setColorDraft({ key: color.key, label: color.label, value: activeVal });
                                  }
                                }}
                                className="w-5 h-5 rounded-full shadow-inner shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                                style={{ backgroundColor: activeVal }}
                                title={isExpanded ? 'Close editor' : 'Click to edit'}
                              />
                              <div className="ml-3 min-w-0">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                                  {color.label}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                                  {color.description || 'Color variable'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Editor State */}
                          {isExpanded && (
                            <div className="mt-1 ml-8 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3 shadow-inner text-left">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Variable Name</label>
                                <input
                                  type="text"
                                  value={draftLabel}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setColorDraft(d => d && d.key === color.key ? { ...d, label: e.target.value } : d)}
                                  className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none transition-all w-full"
                                  placeholder="E.g. Primary Accent"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hex Colour</label>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-1.5 shadow-sm">
                                  <input
                                    type="color"
                                    value={draftVal.startsWith('#') && (draftVal.length === 7 || draftVal.length === 4) ? draftVal : color.defaultHex}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setColorDraft(d => d && d.key === color.key ? { ...d, value: e.target.value } : d)}
                                    className="w-6 h-6 rounded cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-transparent"
                                    style={{ padding: 0, border: 'none' }}
                                  />
                                  <input
                                    type="text"
                                    value={draftVal}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setColorDraft(d => d && d.key === color.key ? { ...d, value: e.target.value } : d)}
                                    className="w-full text-xs font-mono bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none px-1"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!colorDraft) return;
                                    const currentList = [...(profile.customColors || auditColors)];
                                    const updatedList = currentList.map((c: any) => c.key === color.key ? { ...c, label: colorDraft.label } : c);
                                    const nextPalette = { ...(profile.themePalette || {}) };
                                    (nextPalette as any)[color.key] = colorDraft.value;
                                    if (color.key === 'background') {
                                      nextPalette.bgApp = colorDraft.value;
                                    }
                                    setProfile({ ...profile, customColors: updatedList, themePalette: nextPalette });
                                    setExpandedColorKey(null);
                                    setColorDraft(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedColorKey(null);
                                    setColorDraft(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                                >
                                  Cancel
                                </button>
                                {color.key.startsWith('custom_') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteColor(color.key);
                                      setExpandedColorKey(null);
                                      setColorDraft(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    const getTextPreviewContext = (hex: string): 'dark' | 'light' => {
                      try {
                        let h = (hex || '').replace('#', '');
                        if (h.length === 3) h = h.split('').map(c => c + c).join('');
                        if (h.length !== 6) return 'light';
                        const r = parseInt(h.substring(0, 2), 16) / 255;
                        const g = parseInt(h.substring(2, 4), 16) / 255;
                        const b = parseInt(h.substring(4, 6), 16) / 255;
                        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        // Light colors (high luminance) read best on a dark background.
                        // Dark colors (low luminance) read best on a light background.
                        return lum > 0.5 ? 'dark' : 'light';
                      } catch (e) {
                        return 'light';
                      }
                    };

                    const renderTextColorItem = (color: any) => {
                      const activeVal = (profile.themePalette as any)?.[color.key] || color.defaultHex;
                      const isExpanded = expandedColorKey === color.key;
                      const draftLabel = colorDraft && colorDraft.key === color.key ? colorDraft.label : color.label;
                      const draftVal = colorDraft && colorDraft.key === color.key ? colorDraft.value : activeVal;
                      const previewBg = textPreviewOverride[color.key] || getTextPreviewContext(activeVal);

                      return (
                        <div key={color.key} className="transition-all duration-200">
                          {/* Main Row */}
                          <div 
                            className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/35 rounded-xl transition-all group gap-2"
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              {/* Swatch */}
                              <div 
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedColorKey(null);
                                    setColorDraft(null);
                                  } else {
                                    setExpandedColorKey(color.key);
                                    setColorDraft({ key: color.key, label: color.label, value: activeVal });
                                  }
                                }}
                                className="w-5 h-5 rounded-full shadow-inner shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                                style={{ backgroundColor: activeVal }}
                                title={isExpanded ? 'Close editor' : 'Click to edit'}
                              />
                              <div className="ml-3 min-w-0">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                                  {color.label}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                                  {color.description || 'Text color variable'}
                                </span>
                              </div>
                            </div>

                            {/* Contrast preview with manual light/dark toggle */}
                            <div className="flex items-center gap-1.5 ml-0 sm:ml-2 shrink-0">
                              <div className={previewBg === 'light' ? "bg-white border border-slate-150 rounded-lg py-1 px-3 flex items-center justify-center shrink-0 shadow-sm" : "bg-slate-900 rounded-lg py-1 px-3 flex items-center justify-center shrink-0 shadow-sm"} style={{ minWidth: '48px' }}>
                                <span style={{ color: activeVal }} className="text-xs font-bold tracking-tight">
                                  Aa
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTextPreviewOverride(prev => ({ ...prev, [color.key]: previewBg === 'light' ? 'dark' : 'light' }));
                                }}
                                className="text-slate-400 hover:text-indigo-500 transition-all p-1 rounded-lg cursor-pointer"
                                title={previewBg === 'light' ? 'Preview on dark background' : 'Preview on light background'}
                              >
                                {previewBg === 'light' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Editor State */}
                          {isExpanded && (
                            <div className="mt-1 ml-8 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3 shadow-inner text-left">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Variable Name</label>
                                <input
                                  type="text"
                                  value={draftLabel}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setColorDraft(d => d && d.key === color.key ? { ...d, label: e.target.value } : d)}
                                  className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 focus:outline-none transition-all w-full"
                                  placeholder="E.g. Brand Heading"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hex Colour</label>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg p-1.5 shadow-sm">
                                  <input
                                    type="color"
                                    value={draftVal.startsWith('#') && (draftVal.length === 7 || draftVal.length === 4) ? draftVal : color.defaultHex}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setColorDraft(d => d && d.key === color.key ? { ...d, value: e.target.value } : d)}
                                    className="w-6 h-6 rounded cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-850 shrink-0 bg-transparent"
                                    style={{ padding: 0, border: 'none' }}
                                  />
                                  <input
                                    type="text"
                                    value={draftVal}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setColorDraft(d => d && d.key === color.key ? { ...d, value: e.target.value } : d)}
                                    className="w-full text-xs font-mono bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none px-1"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!colorDraft) return;
                                    const currentList = [...(profile.customColors || auditColors)];
                                    const updatedList = currentList.map((c: any) => c.key === color.key ? { ...c, label: colorDraft.label } : c);
                                    const nextPalette = { ...(profile.themePalette || {}) };
                                    (nextPalette as any)[color.key] = colorDraft.value;
                                    setProfile({ ...profile, customColors: updatedList, themePalette: nextPalette });
                                    setExpandedColorKey(null);
                                    setColorDraft(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedColorKey(null);
                                    setColorDraft(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                                >
                                  Cancel
                                </button>
                                {color.key.startsWith('custom_') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteColor(color.key);
                                      setExpandedColorKey(null);
                                      setColorDraft(null);
                                    }}
                                    className="flex-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-6">
                        {/* 1. General Colours */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">General colours</span>
                            <button
                              type="button"
                              onClick={() => handleAddColor('general')}
                              className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <span>➕ Add Color</span>
                            </button>
                          </div>
                          <div className="space-y-1">
                            {generalColors.map(color => renderColorItem(color))}
                          </div>
                        </div>

                        {/* 2. Text Colours */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Text colour</span>
                            <button
                              type="button"
                              onClick={() => handleAddColor('text')}
                              className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <span>➕ Add Color</span>
                            </button>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider pl-3">Text over dark</span>
                            <div className="space-y-1">
                              {textColors.filter((color: any) => getTextPreviewContext((profile.themePalette as any)?.[color.key] || color.defaultHex) === 'dark').map(color => renderTextColorItem(color))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider pl-3">Text over light</span>
                            <div className="space-y-1">
                              {textColors.filter((color: any) => getTextPreviewContext((profile.themePalette as any)?.[color.key] || color.defaultHex) === 'light').map(color => renderTextColorItem(color))}
                            </div>
                          </div>
                        </div>

                        {/* 3. Status */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</span>
                            <button
                              type="button"
                              onClick={() => handleAddColor('status')}
                              className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <span>➕ Add Color</span>
                            </button>
                          </div>
                          <div className="space-y-1">
                            {statusColors.map(color => renderColorItem(color))}
                          </div>
                        </div>

                        {/* 4. Nutrients & Targets */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nutrients & Targets</span>
                            <button
                              type="button"
                              onClick={() => handleAddColor('nutrients')}
                              className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <span>➕ Add Color</span>
                            </button>
                          </div>
                          <div className="space-y-1">
                            {nutrientColors.map(color => renderColorItem(color))}
                          </div>
                        </div>

                        {/* Theme Action Buttons */}
                        <div className="flex justify-end items-center px-4 py-2 mt-4 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                          <button
                            type="button"
                            onClick={() => setProfile({
                              ...profile,
                              marginScale: undefined,
                              paddingScale: undefined,
                              cornerRadius: undefined,
                              shadowScale: undefined,
                              themePalette: undefined,
                              customColors: undefined,
                              customFonts: undefined,
                              fontSize: undefined,
                              fontFamily: undefined,
                              fontMono: undefined,
                              fontSizeTitle: undefined,
                              fontSizeSubtitle: undefined,
                              fontSizeDescription: undefined,
                              fontSizeBodySmall: undefined,
                              fontSizeSubtitleSmall: undefined,
                              fontSizeKeyMetric: undefined,
                              fontSizeXS: undefined,
                              fontSizeBody: undefined
                            })}
                            className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
                          >
                            Reset Theme
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* FONTS SECTION */}
              {themeActiveSection === 'fonts' && (
                <div className="grid grid-cols-2 gap-3">
                  {fontsList.map((font: any) => {
                    const activeVal = (profile as any)[font.fontSizeKey] || 'normal';
                    return (
                      <div key={font.key} className="relative group p-3 rounded-2xl flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-sm gap-2 text-center">
                        {/* Inline editable label */}
                        <input
                          type="text"
                          value={font.label}
                          onChange={(e) => handleRenameFont(font.key, e.target.value)}
                          className="text-[11px] font-bold text-slate-800 dark:text-slate-100 w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer truncate mb-1"
                          title="Click to rename"
                        />
                        <CustomFontSelect value={activeVal} options={font.options} onChange={(val) => setProfile({ ...profile, [font.fontSizeKey]: val })} />
                      </div>
                    );
                  })}

                  <div className="p-3 rounded-2xl space-y-2 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-sm">
                    <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 text-center">Sans Font</span>
                    <CustomFontSelect isFamily value={profile.fontFamily || 'Inter'} options={[
                      {value: 'Inter', label: 'Inter'},
                      {value: 'Space Grotesk', label: 'Space Grotesk'},
                      {value: 'Outfit', label: 'Outfit'},
                      {value: 'Playfair Display', label: 'Playfair Display'},
                      {value: 'Merriweather', label: 'Merriweather'},
                      {value: 'system-ui', label: 'System UI'},
                      {value: 'Roboto', label: 'Roboto'},
                      {value: 'Open Sans', label: 'Open Sans'},
                      {value: 'Lato', label: 'Lato'},
                      {value: 'Montserrat', label: 'Montserrat'},
                      {value: 'Poppins', label: 'Poppins'}
                    ]} onChange={(val) => setProfile({ ...profile, fontFamily: val })} />
                  </div>

                  <div className="p-3 rounded-2xl space-y-2 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-sm">
                    <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 text-center">Mono Font</span>
                    <CustomFontSelect isFamily value={profile.fontMono || 'JetBrains Mono'} options={[
                      {value: 'JetBrains Mono', label: 'JetBrains Mono'},
                      {value: 'Courier New', label: 'Courier New'}
                    ]} onChange={(val) => setProfile({ ...profile, fontMono: val })} />
                  </div>
                </div>
              )}

              {/* DESIGN TOKENS SECTION */}
              {themeActiveSection === 'tokens' && (
                <div className="grid grid-cols-2 gap-3">
                  {auditDesignTokens.map((token) => {
                    const activeVal = (profile as any)[token.tokenKey] || token.defaultValue;
                    return (
                      <div key={token.key} className="p-3 rounded-2xl space-y-2 flex flex-col items-center justify-center">
                        <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 text-center">{token.label}</span>
                        <select
                          value={activeVal}
                          onChange={(e) => setProfile({ ...profile, [token.tokenKey]: e.target.value })}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-2 py-1.5 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer text-center"
                        >
                          {token.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* COMPONENTS SECTION */}
              {themeActiveSection === 'components' && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-3xl flex flex-col gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Targets Progress Bar</span>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Calories</span>
                          <span className="text-slate-500 font-mono">1500kcal / 2000kcal</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Protein</span>
                          <span className="text-slate-500 font-mono">60g / 73g</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Saturated Fat</span>
                          <span className="text-slate-500 font-mono">18g / 15g</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className="bg-rose-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Sodium</span>
                          <span className="text-slate-500 font-mono">1200mg / 2000mg</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-3xl flex flex-col items-center justify-center gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-start">Nutrients Pie Chart</span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 w-full">
                       <div className="flex flex-col items-center gap-2">
                         <NutrientPieChart allowance={2000} alreadyConsumed={500} mealValue={400} nutrientKey="calories" size="lg" />
                         <span className="text-[10px] font-semibold text-slate-500 uppercase">Calories</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                         <NutrientPieChart allowance={60} alreadyConsumed={20} mealValue={15} nutrientKey="protein" size="lg" />
                         <span className="text-[10px] font-semibold text-slate-500 uppercase">Protein</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                         <NutrientPieChart allowance={300} alreadyConsumed={100} mealValue={80} nutrientKey="carbs" size="lg" />
                         <span className="text-[10px] font-semibold text-slate-500 uppercase">Carbs</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                         <NutrientPieChart allowance={65} alreadyConsumed={20} mealValue={15} nutrientKey="fat" size="lg" />
                         <span className="text-[10px] font-semibold text-slate-500 uppercase">Fat</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                         <NutrientPieChart allowance={20} alreadyConsumed={5} mealValue={2} nutrientKey="saturatedFat" size="lg" />
                         <span className="text-[10px] font-semibold text-slate-500 uppercase">Sat Fat</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                         <NutrientPieChart allowance={2300} alreadyConsumed={1000} mealValue={400} nutrientKey="sodium" size="lg" />
                         <span className="text-[10px] font-semibold text-slate-500 uppercase">Sodium</span>
                       </div>
                    </div>
                  </div>

                  
                  <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LogChat Bubble</span>
                    <div className="self-end bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-sm max-w-[85%] font-medium">
                      I had a grilled chicken salad and a glass of milk.
                    </div>
                    <div className="self-start bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm shadow-sm max-w-[85%] font-medium">
                      I've logged 1 chicken salad and 1 glass of milk. (450 kcal)
                    </div>
                  </div>

                  
                  <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FoodCard Capsule</span>
                    <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm items-center w-full">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0">
                        🥗
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Grilled Chicken Salad</span>
                        <span className="text-xs text-slate-500 font-medium mt-0.5">350 kcal • 40g Protein</span>
                      </div>
                      <button className="text-slate-400 hover:text-rose-500 p-2 shrink-0">✕</button>
                    </div>
                  </div>

                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col gap-3 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biomarker Expanded Section</span>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl w-full">
                      <div className="flex items-center gap-1.5 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                        <span>Medical Insight</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed font-medium">
                        Your LDL cholesterol is within optimal range. Maintaining this level reduces cardiovascular risks.
                      </p>
                    </div>
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm w-full">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">More Details</span>
                      <span className="text-slate-400 text-xs">▼</span>
                    </div>
                  </div>

                </div>
              )}

              {/* ELEMENTS SECTION */}
              {themeActiveSection === 'elements' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Button</span>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm">Action</button>
                  </div>
                  <div className="p-4 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Secondary Button</span>
                    <button className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all">Secondary</button>
                  </div>
                  <div className="p-4 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Form Select</span>
                    <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 w-32 focus:outline-none">
                      <option>Option 1</option>
                    </select>
                  </div>
                  <div className="p-4 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Input Text</span>
                    <input type="text" placeholder="Type here" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-800 dark:text-slate-100 w-32 focus:outline-none" />
                  </div>
                  <div className="p-4 rounded-2xl flex flex-col items-center justify-center gap-3 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Badges</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">Success</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">Warning</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50">Failure</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700">Neutral</span>
                    </div>
                  </div>
                  <div className="col-span-2 p-4 rounded-2xl flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase text-center">Paragraph Text</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed font-sans">
                      This is a block of standard paragraph text used throughout the application to convey descriptive guidelines.
                    </p>
                  </div>
                </div>
              )}

              {/* PRESETS SECTION */}
              {themeActiveSection === 'presets' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Saved Presets</h4>
                      <div className="flex gap-2">
                        <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                          Import JSON
                          <input type="file" accept=".json" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              try {
                                const parsed = JSON.parse(ev.target?.result as string);
                                 const newPresets = parsed.preset ? [parsed.preset] : (Array.isArray(parsed) ? parsed : [parsed]);
                                 if (newPresets.length > 0) {
                                   setProfile({ ...profile, themePresets: [...(profile.themePresets || []), ...newPresets] });
                                 }
                              } catch (e) {
                                console.error('Failed to parse presets');
                              }
                            };
                            reader.readAsText(file);
                          }} />
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { name: "System Default", isSystem: true, profileUpdate: { marginScale: undefined, paddingScale: undefined, cornerRadius: undefined, shadowScale: undefined, themePalette: undefined, fontSize: undefined, fontFamily: undefined, fontMono: undefined, fontSizeTitle: undefined, fontSizeSubtitle: undefined, fontSizeDescription: undefined, fontSizeBodySmall: undefined, fontSizeSubtitleSmall: undefined, fontSizeKeyMetric: undefined, fontSizeXS: undefined, fontSizeBody: undefined, themeOverrides: [] } },
                        { name: "Midnight Blue (Dark)", isSystem: true, profileUpdate: { fontFamily: 'Space Grotesk', themePalette: { background: '#000000', bgCard: '#0f172a', button: '#2563eb', text: '#f8fafc', textSecondary: '#cbd5e1', border: '#1e293b', textAccent: '#a5b4fc', textMuted: '#94a3b8', textSuccess: '#4ade80', textError: '#f87171', warning: '#fb7185', caution: '#fbbf24', success: '#34d399', info: '#60a5fa', neutralSetting: '#cbd5e1' } } },
                        { name: "Emerald Forest (Dark)", isSystem: true, profileUpdate: { fontFamily: 'Outfit', themePalette: { background: '#000000', bgCard: '#06231a', button: '#047857', text: '#ecfdf5', textSecondary: '#a7f3d0', border: '#0f3527', textAccent: '#a5b4fc', textMuted: '#a7f3d0', textSuccess: '#4ade80', textError: '#f87171', warning: '#fb7185', caution: '#fbbf24', success: '#34d399', info: '#60a5fa', neutralSetting: '#d1fae5' } } },
                        { name: "Minimalist White (Light)", isSystem: true, profileUpdate: { fontFamily: 'Playfair Display', themePalette: { background: '#ffffff', bgCard: '#fafafa', button: '#18181b', text: '#09090b', textSecondary: '#52525b', border: '#e4e4e7', textMuted: '#71717a', textSuccess: '#15803d' } } }
                      ].map((preset, idx) => {
                        const effectiveUpdate = profile.systemPresetOverrides?.[preset.name] ? { ...preset.profileUpdate, ...profile.systemPresetOverrides[preset.name] } : preset.profileUpdate;
                        const active = isPresetActive(effectiveUpdate);
                        return (
                          <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border shadow-sm transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex-1 truncate mr-2">{preset.name}</span>
                            <div className="flex gap-2 items-center shrink-0">
                              <button title="Export" onClick={() => {
                                const exportPayload = buildExportPayload(effectiveUpdate, preset.name);
                                const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${preset.name}_preset.json`;
                                a.click();
                              }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                              </button>
                              {preset.name !== 'System Default' && (
                                <>
                                  <button onClick={() => {
                                    setProfile({
                                      ...profile,
                                      systemPresetOverrides: {
                                        ...(profile.systemPresetOverrides || {}),
                                        [preset.name]: {
                                          themePalette: profile.themePalette,
                                          fontSize: profile.fontSize,
                                          fontFamily: profile.fontFamily,
                                          fontMono: profile.fontMono,
                                          marginScale: profile.marginScale,
                                          paddingScale: profile.paddingScale,
                                          cornerRadius: profile.cornerRadius,
                                          shadowScale: profile.shadowScale,
                                          themeOverrides: profile.themeOverrides,
                                          customColors: profile.customColors,
                                          fontSizeTitle: profile.fontSizeTitle,
                                          fontSizeSubtitle: profile.fontSizeSubtitle,
                                          fontSizeDescription: profile.fontSizeDescription,
                                          fontSizeBodySmall: profile.fontSizeBodySmall,
                                          fontSizeSubtitleSmall: profile.fontSizeSubtitleSmall,
                                          fontSizeKeyMetric: profile.fontSizeKeyMetric,
                                          fontSizeXS: profile.fontSizeXS,
                                          fontSizeBody: profile.fontSizeBody,
                                          customFonts: profile.customFonts
                                        }
                                      }
                                    });
                                    setJustSavedKey('system-update-' + preset.name);
                                    setTimeout(() => setJustSavedKey(null), 1800);
                                  }} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all">{justSavedKey === 'system-update-' + preset.name ? '✓ Saved' : 'Update'}</button>
                                  {profile.systemPresetOverrides?.[preset.name] && (
                                    <button
                                      type="button"
                                      title="Reset to original preset"
                                      onClick={() => {
                                        const next = { ...(profile.systemPresetOverrides || {}) };
                                        delete next[preset.name];
                                        setProfile({ ...profile, systemPresetOverrides: next });
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                    </button>
                                  )}
                                </>
                              )}
                              {active ? (
                                <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">✓ Selected</span>
                              ) : (
                                <button onClick={() => {
                                  setProfile({ ...profile, ...effectiveUpdate });
                                }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all">Apply Default</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(profile.themePresets || []).map((preset, idx) => {
                        const active = isPresetActive(preset);
                        return (
                        <div key={'user'+idx} className={`flex justify-between items-center p-3 rounded-xl border shadow-sm transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex-1 truncate mr-2">{preset.name}</span>
                          <div className="flex gap-2 shrink-0">
                            <button title="Export" onClick={() => {
                              const exportPayload = buildExportPayload(preset, preset.name);
                              const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${preset.name || 'theme'}_preset.json`;
                              a.click();
                            }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            </button>
                            <button onClick={() => {
                              const newPresets = [...(profile.themePresets || [])];
                              newPresets[idx] = {
                                ...preset,
                                themePalette: profile.themePalette,
                                fontSize: profile.fontSize,
                                fontFamily: profile.fontFamily,
                                fontMono: profile.fontMono,
                                marginScale: profile.marginScale,
                                paddingScale: profile.paddingScale,
                                cornerRadius: profile.cornerRadius,
                                shadowScale: profile.shadowScale,
                                themeOverrides: profile.themeOverrides,
                                customColors: profile.customColors,
                                fontSizeTitle: profile.fontSizeTitle,
                                fontSizeSubtitle: profile.fontSizeSubtitle,
                                fontSizeDescription: profile.fontSizeDescription,
                                fontSizeBodySmall: profile.fontSizeBodySmall,
                                fontSizeSubtitleSmall: profile.fontSizeSubtitleSmall,
                                fontSizeKeyMetric: profile.fontSizeKeyMetric,
                                fontSizeXS: profile.fontSizeXS,
                                fontSizeBody: profile.fontSizeBody,
                                customFonts: profile.customFonts
                              };
                              setProfile({ ...profile, themePresets: newPresets });
                              setJustSavedKey('user-update-' + idx);
                              setTimeout(() => setJustSavedKey(null), 1800);
                            }} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all">{justSavedKey === 'user-update-' + idx ? '✓ Saved' : 'Update'}</button>
                            <button onClick={() => {
                              setProfile({
                                ...profile,
                                themePalette: preset.themePalette,
                                fontSize: preset.fontSize,
                                fontFamily: preset.fontFamily,
                                fontMono: preset.fontMono,
                                marginScale: preset.marginScale,
                                paddingScale: preset.paddingScale,
                                cornerRadius: preset.cornerRadius,
                                shadowScale: preset.shadowScale,
                                themeOverrides: preset.themeOverrides,
                                customColors: preset.customColors,
                                fontSizeTitle: preset.fontSizeTitle,
                                fontSizeSubtitle: preset.fontSizeSubtitle,
                                fontSizeDescription: preset.fontSizeDescription,
                                fontSizeBodySmall: preset.fontSizeBodySmall,
                                fontSizeSubtitleSmall: preset.fontSizeSubtitleSmall,
                                fontSizeKeyMetric: preset.fontSizeKeyMetric,
                                fontSizeXS: preset.fontSizeXS,
                                fontSizeBody: preset.fontSizeBody,
                                customFonts: preset.customFonts
                              });
                            }} className={active ? "hidden" : "px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-all"}>Apply</button>
                            {active && (
                              <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">✓ Selected</span>
                            )}
                            <button onClick={() => {
                              const newPresets = [...(profile.themePresets || [])];
                              newPresets.splice(idx, 1);
                              setProfile({ ...profile, themePresets: newPresets });
                            }} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-all">Del</button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Current Theme Status</h4>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {getThemeVariableChangesCount()} Variable Changes
                      </span>
                    </div>
                    <button onClick={() => {
                      const name = prompt("Enter a name for this preset:");
                      if (!name) return;
                      const newPreset = {
                        name,
                        themePalette: profile.themePalette,
                        fontSize: profile.fontSize,
                        fontFamily: profile.fontFamily,
                        fontMono: profile.fontMono,
                        marginScale: profile.marginScale,
                        paddingScale: profile.paddingScale,
                        cornerRadius: profile.cornerRadius,
                        shadowScale: profile.shadowScale,
                        themeOverrides: profile.themeOverrides,
                        customColors: profile.customColors,
                        fontSizeTitle: profile.fontSizeTitle,
                        fontSizeSubtitle: profile.fontSizeSubtitle,
                        fontSizeDescription: profile.fontSizeDescription,
                        fontSizeBodySmall: profile.fontSizeBodySmall,
                        fontSizeSubtitleSmall: profile.fontSizeSubtitleSmall,
                        fontSizeKeyMetric: profile.fontSizeKeyMetric,
                        fontSizeXS: profile.fontSizeXS,
                        fontSizeBody: profile.fontSizeBody,
                        customFonts: profile.customFonts
                      };
                      setProfile({ ...profile, themePresets: [...(profile.themePresets || []), newPreset] });
                      setJustSavedKey('new-preset');
                      setTimeout(() => setJustSavedKey(null), 1800);
                    }} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all text-center cursor-pointer">
                      {justSavedKey === 'new-preset' ? '✓ Saved' : 'Save Current Configuration as Preset'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      ), document.body)}


      {/* Database Interactions Live Sync Overlay */}
      {showDbInteractionsOverlay && createPortal((
        <div id="db-interactions-overlay" className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] animation-fade-in text-slate-850 dark:text-slate-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h2>
                  <span className="text-xs font-normal text-slate-400 block mt-0.5">
                    {(() => {
                      const buildTime = serverStartTime || 1782721085000;
                      const diffMs = Math.max(0, now - buildTime);
                      const diffMins = Math.floor(diffMs / 60000);
                      return diffMins < 1 ? 'last published just now' : `last published ${diffMins} min ago`;
                    })()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {dbOverlayViewMode === 'admin' && (
                  <>
                    <button
                      onClick={() => setShowAgentLogs(true)}
                      className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="View AI Agent Logs"
                    >
                      <Terminal className="w-4 h-4" /> View AI Logs
                    </button>
                    <button
                      onClick={() => setShowApiTracker(true)}
                      className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="View API call stats"
                    >
                      <Cloud className="w-4 h-4" /> API Calls
                    </button>
                  </>
                )}
                {onCloudSync && (

                  <button
                    onClick={() => {
                      if (onCloudSync) onCloudSync();
                    }}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Manual Sync"
                  >
                    <RefreshCw className="w-4 h-4" /> Sync Now
                  </button>
                )}
                <button
                  onClick={() => setShowDbInteractionsOverlay(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="p-6 overflow-y-auto space-y-6 text-left flex-1">
              
              {dbOverlayViewMode === 'admin' && (
                <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px gap-6 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveAdminTab('sync')}
                    className={`pb-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer ${
                      activeAdminTab === 'sync'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    Sync & Telemetry
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAdminTab('backup')}
                    className={`pb-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer flex items-center gap-1.5 ${
                      activeAdminTab === 'backup'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    Backup
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAdminTab('users')}
                    className={`pb-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer flex items-center gap-1.5 ${
                      activeAdminTab === 'users'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    User Management & Quotas
                  </button>
                </div>
              )}

              {dbOverlayViewMode === 'admin' && activeAdminTab === 'users' ? (
                <UserManagementTab />
              ) : dbOverlayViewMode === 'admin' && activeAdminTab === 'backup' ? (
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pb-8">
                  <BackupRestoreTab 
                     profile={profile} 
                     foodLogs={foodLogs || []} 
                     biomarkerHistory={biomarkerHistory || []} 
                     setFoodLogs={setFoodLogs || (() => {})} 
                     setBiomarkerHistory={setBiomarkerHistory || (() => {})} 
                     onSaveAndSync={onSaveAndSync}
                     biomarkers={biomarkers}
                     actions={actions}
                     dailyBenefits={dailyBenefits}
                     report={report}
                  />
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 mx-4 mt-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                      <Cloud className="w-5 h-5 text-indigo-400" />
                      Google Workspace Integration
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Connect your Google account to enable Google Drive backup and sync capabilities for your health data.
                    </p>
                    <GoogleHealthIntegration profile={profile} />
                  </div>
                </div>
              ) : (
                <>
                  {/* Cloud Sync Mode Strategy Select Card */}
                  <div className="p-5 bg-indigo-50/30 dark:bg-slate-800/40 border border-indigo-100/40 dark:border-slate-800 rounded-2xl space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Cloud className="w-4.5 h-4.5 text-indigo-500" />
                      <span>Cloud Sync Mode</span>
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Choose how your health logs are saved to protect your database write quotas. All changes remain saved locally in your browser.
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider h-fit shrink-0 ${
                    autoSyncDisabled 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' 
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400'
                  }`}>
                    {autoSyncDisabled ? 'Manual (Local-Only)' : 'Automatic'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleAutoSync(false)}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] ${
                      !autoSyncDisabled
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-extrabold'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${!autoSyncDisabled ? 'animate-spin' : ''}`} />
                    <span>Auto Sync (Real-time)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleAutoSync(true)}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] ${
                      autoSyncDisabled
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm font-extrabold'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <CloudLightning className="w-4 h-4" />
                    <span>Manual Sync Only</span>
                  </button>
                </div>

                {autoSyncDisabled && (
                  <div className="p-3 bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/20 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
                    <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-normal font-medium">
                      Saving Firestore writes! Tap <strong>"Sync Now"</strong> or the Cloud icon in the header whenever you want to upload changes.
                    </p>
                  </div>
                )}
              </div>

              {dbOverlayViewMode === 'admin' && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/20 dark:border-amber-800/20 rounded-2xl flex items-start gap-3">
                  <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                    <CloudLightning className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      Offline First Database Mode
                    </h3>
                    <p className="text-xs text-amber-605 dark:text-amber-400/80 mt-1 leading-relaxed">
                      All operations are recorded <strong>offline first</strong> in local secure storage, allowing you to view and interact with your health data instantly even when cloud quotas are temporarily exhausted. Data changes will be automatically queued and safely synchronized with the cloud database.
                    </p>
                  </div>
                </div>
              )}

              {/* Admin / User View Toggle */}
              {profile?.email?.toLowerCase().trim() === 'cwah.liu@gmail.com' && (
                <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDbOverlayViewMode('user');
                      localStorage.setItem('health_cockpit_admin_mode', 'user');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      dbOverlayViewMode === 'user'
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-md border border-slate-200/20'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    User View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDbOverlayViewMode('admin');
                      localStorage.setItem('health_cockpit_admin_mode', 'admin');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      dbOverlayViewMode === 'admin'
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-md border border-slate-200/20'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin View
                  </button>
                </div>
              )}

              {dbOverlayViewMode === 'admin' && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30 rounded-2xl flex items-center gap-3">
                    <div className="bg-rose-100 dark:bg-rose-900/40 p-2 rounded-xl text-rose-600 dark:text-rose-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">Admin Account Confirmed</h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400/80 mt-0.5 font-medium">
                        This account is verified as the system administrator with full read/write, sync, and override privileges.
                      </p>
                    </div>
                  </div>

                  {/* Google Workspace Cloud Backup Utility */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Archive className="w-4.5 h-4.5 text-indigo-500" />
                        <span>Google Workspace Backups</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Secure, password-protected snapshots of all accounts (profiles, biomarkers, clinical actions, and meal logs) written directly to Google Drive & Sheet.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenBackup}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-[1.01]"
                      >
                        <CloudUpload className="w-4.5 h-4.5" />
                        <span>Backup Data</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenRestore}
                        className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01]"
                      >
                        <CloudDownload className="w-4.5 h-4.5" />
                        <span>Restore Data</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Interaction statistics row */}
              {dbOverlayViewMode === 'admin' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-600/5 dark:bg-indigo-400/5 w-full" style={{ width: `${Math.max(2, (dbInteractions.filter(i => i.type === 'upload' && i.status === 'completed').reduce((sum, i) => sum + i.sizeBytes, 0) / Math.max(1, dbInteractions.filter(i => i.type === 'upload').reduce((sum, i) => sum + i.sizeBytes, 0))) * 100)}%` }} />
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Upload Pipeline</span>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 relative z-10">
                        {(dbInteractions.filter(i => i.type === 'upload' && i.status === 'completed').reduce((sum, i) => sum + i.sizeBytes, 0) / 1024).toFixed(2)} KB
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded relative z-10">
                        {dbInteractions.filter(i => i.type === 'upload' && i.status === 'pending').length} pending
                      </span>
                    </div>
                    <span className="block text-[10px] text-slate-500 mt-1.5 font-medium relative z-10 truncate">
                      <strong className="text-slate-700 dark:text-slate-300">{(dbInteractions.filter(i => i.type === 'upload' && i.status === 'completed').reduce((sum, i) => sum + i.sizeBytes, 0) / 1024).toFixed(2)} KB</strong> achieved / {(dbInteractions.filter(i => i.type === 'upload').reduce((sum, i) => sum + i.sizeBytes, 0) / 1024).toFixed(2)} KB needed
                    </span>
                  </div>
                  
                  <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/30 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-600/5 dark:bg-emerald-400/5 w-full" style={{ width: `${Math.max(2, (dbInteractions.filter(i => i.type === 'download' && i.status === 'completed').reduce((sum, i) => sum + (i.sizeBytes || 1024), 0) / Math.max(1, dbInteractions.filter(i => i.type === 'download').reduce((sum, i) => sum + (i.sizeBytes || 1024), 0))) * 100)}%` }} />
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Download Pipeline</span>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 relative z-10">
                        {(dbInteractions.filter(i => i.type === 'download' && i.status === 'completed').reduce((sum, i) => sum + i.sizeBytes, 0) / 1024).toFixed(2)} KB
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded relative z-10">
                        {dbInteractions.filter(i => i.type === 'download' && i.status === 'pending').length} pending
                      </span>
                    </div>
                    <span className="block text-[10px] text-slate-500 mt-1.5 font-medium relative z-10 truncate">
                      <strong className="text-slate-700 dark:text-slate-300">{(dbInteractions.filter(i => i.type === 'download' && i.status === 'completed').length)}</strong> achieved / {dbInteractions.filter(i => i.type === 'download').length} needed
                    </span>
                  </div>
                </div>
              )}

              {/* Images Quota */}
              {dbOverlayViewMode === 'admin' && (
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Database Images (5GB Limit)</span>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-mono font-semibold text-slate-900 dark:text-slate-100 relative z-10">
                      {foodLogs.reduce((acc, log) => acc + (log.imageUrls?.length || 0) + (log.imageUrl ? 1 : 0), 0)} Images
                    </span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded relative z-10">
                      {(foodLogs.reduce((acc, log) => acc + (log.imageUrl ? log.imageUrl.length : 0) + (log.imageUrls ? log.imageUrls.reduce((sum, img) => sum + img.length, 0) : 0), 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              )}

              {/* AI Agent Live thinking / Debug Logs section */}
              {dbOverlayViewMode === 'admin' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                        🔬 AI Agent Live thinking Process
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        View real-time LLM API handshakes & timeouts
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={debugMode}
                        onChange={(e) => handleToggleDebugMode(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-750 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* List of transactions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Transaction Activity Feed</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {dbInteractions.length} Total Logs
                  </span>
                </div>

                {dbInteractions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-450 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800">
                    No active transactions logged in this session yet. Tapping sync or updating your records will populate this feed.
                  </div>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-800/80 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 dark:bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-white uppercase tracking-wider">
                          <th className="p-3">Time / Type</th>
                          <th className="p-3">Path & Payload</th>
                          <th className="p-3 text-right">Size</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dbInteractions.map((op) => (
                          <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                            <td className="p-3">
                              <span className="block font-mono text-[10px] text-slate-400">{op.timestamp}</span>
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                op.type === 'upload' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/25 dark:text-indigo-400' :
                                op.type === 'download' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-400' :
                                op.type === 'delete' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-400' :
                                'bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-400'
                              }`}>
                                {op.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] max-w-[180px] truncate" title={op.path}>
                              {op.path}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-650 dark:text-slate-350">
                              {op.sizeBytes > 0 ? `${op.sizeBytes} B` : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                op.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                op.status === 'pending' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 animate-pulse' :
                                'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                              }`}>
                                {op.status} {op.status === 'pending' && op.startTimeMs ? `(${Math.floor((now - op.startTimeMs) / 1000)}s)` : ''}
                              </span>
                              {op.status === 'pending' && op.startTimeMs && now - op.startTimeMs > 5000 && (
                                <span className="block text-[9px] text-amber-600 dark:text-amber-500 mt-1" title="Waiting for server acknowledgment or offline sync queue">
                                  Waiting for connection...
                                </span>
                              )}
                              {op.errorMessage && (
                                <span className="block text-[9px] text-rose-500 mt-1 text-left max-w-[120px] truncate" title={op.errorMessage}>
                                  {op.errorMessage}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={onForcePull || onCloudSync}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  title="Overwrite local data with cloud data"
                >
                  Force Pull
                </button>
                <button
                  onClick={onForcePush}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 text-xs font-bold rounded-2xl hover:bg-indigo-100/50 cursor-pointer"
                  title="Overwrite cloud data with local data"
                >
                  Force Push
                </button>
              </div>
              <button
                onClick={() => setShowDbInteractionsOverlay(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm cursor-pointer transition-all"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Backup Modal Overlay */}
      {showBackupModal && createPortal((
        <div id="backup-modal-overlay" className="fixed inset-0 z-[10000] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animation-fade-in text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/25">
              <div className="flex items-center gap-2.5">
                <CloudUpload className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Secured Cloud Backup</h2>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Saves all patient logs and metadata in a password-secured ZIP archive</span>
                </div>
              </div>
              <button
                onClick={() => setShowBackupModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-5 text-left flex-1">
              {backupStatus === 'idle' && (
                <form onSubmit={handleExecuteBackup} className="space-y-4">
                  {/* Version */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Backup Version Name
                    </label>
                    <input
                      type="text"
                      value={backupVersion}
                      onChange={(e) => setBackupVersion(e.target.value)}
                      placeholder="e.g., V1, V2, V1-initial"
                      className="w-full text-sm px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ZIP Encryption Password</span>
                    </label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder="Enter a secure password to encrypt files"
                      className="w-full text-sm px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">This password will be required to decrypt and restore the records.</p>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Backup Comments / Notes
                    </label>
                    <textarea
                      value={backupComment}
                      onChange={(e) => setBackupComment(e.target.value)}
                      placeholder="Add an optional comment to log in the Sheets registry..."
                      rows={3}
                      className="w-full text-sm px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 resize-none"
                    />
                  </div>

                  {backupError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/30 rounded-2xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{backupError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBackupModal(false)}
                      className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer shadow-md"
                    >
                      Execute Secured Backup
                    </button>
                  </div>
                </form>
              )}

              {backupStatus === 'processing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-600/25 border-t-indigo-600 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Creating secure cloud backup archive...</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">Fetching account records, serializing biomarker history, resolving meal photos, compiling spreadsheet, encrypting with AES, and syncing with Google Workspace...</p>
                  </div>
                </div>
              )}

              {backupStatus === 'success' && backupResult && (
                <div className="space-y-5 py-2">
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-250 dark:border-emerald-900/40 rounded-3xl flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Secure Backup Completed Successfully!</h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500/80 mt-1 font-medium">
                        The encrypted archive has been saved to your Google Drive and logged in the 'Health Cockpit Backup Registry' Sheet.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Archive Metadata & Stats</span>
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div>
                        <span className="text-slate-500 block">Backup Filename</span>
                        <span className="font-mono text-slate-850 dark:text-slate-200 font-semibold">{backupResult.filename}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Accounts Snapped</span>
                        <span className="text-slate-850 dark:text-slate-200 font-bold">{backupResult.stats.accountsCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Biomarkers</span>
                        <span className="text-slate-850 dark:text-slate-200 font-bold">{backupResult.stats.totalBiomarkers}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total meal pictures</span>
                        <span className="text-slate-850 dark:text-slate-200 font-bold">{backupResult.stats.totalImages}</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual breakdown list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Individual Accounts Details</span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-850 border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden">
                      {backupResult.stats.details?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white dark:bg-slate-900 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.nickname}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">{item.email}</span>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">{item.biomarkers} biomarkers</span>
                            <span className="block text-[10px] text-slate-500">{item.images} photos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowBackupModal(false)}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer shadow-md"
                  >
                    Close Backup Panel
                  </button>
                </div>
              )}

              {backupStatus === 'error' && (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Backup Generation Failed</h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400/80 max-w-sm mx-auto">{backupError}</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setBackupStatus('idle')}
                      className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => setShowBackupModal(false)}
                      className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Restore Modal Overlay */}
      {showRestoreModal && createPortal((
        <div id="restore-modal-overlay" className="fixed inset-0 z-[10000] bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animation-fade-in text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/25">
              <div className="flex items-center gap-2.5">
                <CloudDownload className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Restore Database Records</h2>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Restore data structures from Google Drive encrypted ZIP archives</span>
                </div>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-4 text-left flex-1">
              {restoreStatus === 'listing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-600/25 border-t-indigo-600 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Listing Google Drive snapshots...</h3>
                    <p className="text-xs text-slate-500">Querying backup files matching encryption schema from your Drive...</p>
                  </div>
                </div>
              )}

              {restoreStatus === 'downloading' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-600/25 border-t-indigo-600 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Downloading archive payload...</h3>
                    <p className="text-xs text-slate-500">Retrieving full encrypted snapshot binary from Google Drive safely...</p>
                  </div>
                </div>
              )}

              {restoreStatus === 'restoring' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-600/25 border-t-indigo-600 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Rebuilding records in Firestore...</h3>
                    <p className="text-xs text-slate-500">Overwriting subcollections, setting biomarkers, and committing batch mutations to Firebase.</p>
                  </div>
                </div>
              )}

              {/* Stage 1: Select Archive file */}
              {restoreStatus === 'idle' && selectedRestoreFile === null && (
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Backup Archives</span>
                  {restoreFiles.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50">
                      No matching backup archives found in your Google Drive. Ensure you have run a backup first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {restoreFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleSelectRestoreFile(file)}
                          className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <Archive className="w-5 h-5 text-indigo-500 group-hover:scale-105 transition-transform" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[280px]">{file.name}</span>
                              <span className="text-[10px] text-slate-400 block">{new Date(file.createdTime).toLocaleString()}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 dark:bg-indigo-950/50 px-2 py-1 rounded-lg">Select</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowRestoreModal(false)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Stage 2: Decrypt with password */}
              {selectedRestoreFile !== null && restoreStatus !== 'preview' && restoreStatus !== 'success' && restoreStatus !== 'restoring' && restoreStatus !== 'downloading' && (
                <form onSubmit={handleLoadAndDecryptBackup} className="space-y-4">
                  <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/30 rounded-2xl flex items-start gap-2.5 text-xs">
                    <Archive className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-850 dark:text-slate-200 block">Selected Snapshot Archive</span>
                      <span className="font-mono text-slate-500 block mt-0.5">{selectedRestoreFile.name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Archive Decryption Password</span>
                    </label>
                    <input
                      type="password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder="Enter the secure password used for this backup"
                      className="w-full text-sm px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>

                  {restoreError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/30 rounded-2xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelectRestoreFile(null)}
                      className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      Change File
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer shadow-md"
                    >
                      Decrypt & Load Preview
                    </button>
                  </div>
                </form>
              )}

              {/* Stage 3: Preview list & Target options */}
              {restoreStatus === 'preview' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-2xl">
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Decryption Preview Verified</span>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs mt-2.5 font-bold text-slate-800 dark:text-slate-100">
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-normal">Accounts</span>
                        {restorePreviewData.length}
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-normal">Biomarkers</span>
                        {restorePreviewData.reduce((sum, a) => sum + a.biomarkerCount, 0)}
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-normal">Images</span>
                        {restorePreviewData.reduce((sum, a) => sum + a.imageCount, 0)}
                      </div>
                    </div>
                  </div>

                  {/* Restorable Accounts Table */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Archive Accounts Contents</span>
                    <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                      {restorePreviewData.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-950/30 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-850 dark:text-slate-200 block">{item.nickname}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">{item.email}</span>
                          </div>
                          <div className="text-right text-[10px] text-slate-550 dark:text-slate-400 space-y-0.5">
                            <span className="block font-semibold">{item.biomarkerCount} biomarkers</span>
                            <span className="block">{item.imageCount} images</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Restoration Target Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Restoration Scope
                    </label>
                    <select
                      value={restoreTargetAccount}
                      onChange={(e) => setRestoreTargetAccount(e.target.value)}
                      className="w-full text-xs px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-medium"
                    >
                      <option value="all">Restore All Accounts in Backup File</option>
                      {restorePreviewData.map((item, idx) => (
                        <option key={idx} value={item.email}>
                          Only Restore Specific Account: {item.nickname} ({item.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {restoreError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/30 rounded-2xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{restoreError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreStatus('idle');
                        setSelectedRestoreFile(null);
                        setRestorePreviewData([]);
                      }}
                      className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleExecuteRestore}
                      className="w-2/3 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Execute Restore Operation</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 5: Success */}
              {restoreStatus === 'success' && (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Database Restored Successfully!</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">All medical profiles, biomarker logs, actions, and meal logs have been fully recovered in Firestore and local databases.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRestoreModal(false);
                      // Refresh dashboard state
                      window.location.reload();
                    }}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Close & Reload Application
                  </button>
                </div>
              )}

              {/* Stage 6: Error */}
              {restoreStatus === 'error' && (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Restoration Operation Failed</h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400/80 max-w-sm mx-auto">{restoreError}</p>
                  </div>
                  <button
                    onClick={() => {
                      setRestoreStatus('idle');
                      setSelectedRestoreFile(null);
                      setRestorePreviewData([]);
                    }}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Go Back to File Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      <ApiCallTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        userEmail={profile?.email || auth.currentUser?.email || 'guest'}
      />
    </>
  );
}
