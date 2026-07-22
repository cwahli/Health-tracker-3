import { formatMessageContent } from '../utils/formatUtils';
import {
 ErrorBoundary } from './ErrorBoundary';
import { agentCardRegistry } from './chat-cards';
import { AgentThoughtBox } from './chat-cards/FoodCard';
import { trackApiCall, setActiveQueryId, generateQueryId } from '../utils/apiTracker';
import { saveAgentRequestLog } from '../utils/agentLogsTracker';
import React, { useState, useRef, useEffect } from 'react';
import { parse, stringify } from 'yaml';
import { ChatMessage, FoodLog, UserProfile, FoodIdea } from '../types';
import { translations } from '../utils/translations';
import { X, Send, Image, Camera, MessageSquare, Sparkles, Plus, Terminal, ChevronDown, ChevronUp, Loader, MapPin, Trash2, Check, Table, RotateCcw, AlertTriangle, ShieldAlert, Edit2 } from 'lucide-react';
import { nutrientDefinitions } from '../utils/nutrition';
import { biomarkerDefinitions, getBiomarkerStatus, isAsianEthnicity, getBiomarkerStatusLabel } from '../utils/biomarkers';
import LLMSelector from './LLMSelector';
import { AVAILABLE_LLMS } from '../utils/llm';
import { compressMultipleImages, compressImage } from '../utils/imageCompressor';
import { getCurrentDateInTimezone, toYYYYMMDD } from '../utils/dateUtils';
import ImageSlider from './ImageSlider';
import FullScreenLogViewer from './FullScreenLogViewer';
import FullScreenInstructionViewer from './FullScreenInstructionViewer';
import { InteractivePlacesMap } from './InteractivePlacesMap';
import exifr from 'exifr';
import { auth, db } from '../firebase';
import { getAgentCalibration, getAllAgentCalibrations } from '../utils/agentCalibration';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { sanitizeForFirestore, checkQuotaFlag } from '../utils/firestoreUtils';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { pruneLocalStorageToFreeSpace } from '../utils/storageUtils';


import { resolveFoodImage } from '../utils/imageResolver';

import { AgentType, AGENT_REGISTRY, getAgentRolloutStatus } from '../utils/agentConfig';
import { getAvailableCredits, deductAgentCredits } from '../utils/creditManager';
const isValidValue = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== '' && v !== 'N/A' && v !== 'null';

const formatNutrientValue = (value: unknown, unit: string): string => {
  if (!isValidValue(value)) return '—';
  return `${value} ${unit}`;
};
interface BiomarkerEntry {
  biomarker: string;
  date: string;
  value: number;
  unit: string;
}

function parseYamlOffline(yamlText: string): BiomarkerEntry[] {
  const entries: BiomarkerEntry[] = [];
  if (!yamlText) return entries;
  
  try {
    const cleanedText = yamlText.replace(/```(?:yaml|yml)?/gi, '').trim();
    const parsed = parse(cleanedText);
    const rawList = Array.isArray(parsed) 
      ? parsed 
      : (parsed?.biomarkers || parsed?.entries || parsed?.data || []);
    if (Array.isArray(rawList)) {
      rawList.forEach((item: any) => {
        if (item && typeof item === 'object') {
          const bName = item.biomarker || item.name || item.key;
          const bDate = item.date || item.timestamp;
          const bVal = item.value !== undefined ? item.value : item.val;
          if (bName && bDate) {
            entries.push({
              biomarker: String(bName),
              date: String(bDate),
              value: Number(bVal) || 0,
              unit: item.unit ? String(item.unit) : ''
            });
          }
        }
      });
    }
  } catch (e) {
    console.warn("parseYamlOffline: standard parser failed, falling back to regex", e);
  }

  if (entries.length > 0) {
    return entries;
  }

  const lines = yamlText.split(/\r?\n|\\n/);
  let currentEntry: Partial<BiomarkerEntry> = {};
  
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('-') || line.startsWith('biomarker:')) {
      if (currentEntry.biomarker) {
        entries.push(currentEntry as BiomarkerEntry);
      }
      currentEntry = {};
    }
    
    const biomarkerMatch = line.match(/(?:-\s+)?biomarker:\s*(.*)/i);
    if (biomarkerMatch) {
      currentEntry.biomarker = biomarkerMatch[1].replace(/['"]/g, '').trim();
      continue;
    }
    
    const dateMatch = line.match(/date:\s*([\d-]+)/i);
    if (dateMatch) {
      currentEntry.date = dateMatch[1].trim();
      continue;
    }
    
    const valueMatch = line.match(/value:\s*([\d.]+)/i);
    if (valueMatch) {
      currentEntry.value = parseFloat(valueMatch[1]);
      continue;
    }
    
    const unitMatch = line.match(/unit:\s*(.*)/i);
    if (unitMatch) {
      currentEntry.unit = unitMatch[1].replace(/['"]/g, '').trim();
      continue;
    }
  }
  
  if (currentEntry.biomarker) {
    entries.push(currentEntry as BiomarkerEntry);
  }
  
  return entries;
}

function getOfflineCategorization(name: string) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('alt') || lowerName.includes('ast') || lowerName.includes('alp') || lowerName.includes('bilirubin') || lowerName.includes('liver') || lowerName.includes('ggt')) {
    return {
      riskCategories: ['Liver & hepatitis stress'],
      standardMedicalGrouping: 'Hepatic',
      potentialMedicalConditions: ['Fatty Liver', 'Hepatitis Stress']
    };
  }
  
  if (lowerName.includes('creatinine') || lowerName.includes('egfr') || lowerName.includes('urea') || lowerName.includes('kidney') || lowerName.includes('bun') || lowerName.includes('uric acid')) {
    return {
      riskCategories: ['Kidney & hydration'],
      standardMedicalGrouping: 'Renal',
      potentialMedicalConditions: ['Chronic Kidney Disease', 'Hydration Issues']
    };
  }
  
  if (lowerName.includes('glucose') || lowerName.includes('hba1c') || lowerName.includes('insulin') || lowerName.includes('cholesterol') || lowerName.includes('ldl') || lowerName.includes('hdl') || lowerName.includes('triglycerides') || lowerName.includes('tg') || lowerName.includes('sugar') || lowerName.includes('metabolic')) {
    return {
      riskCategories: ['Metabolic & glycemic', 'Cardiovascular'],
      standardMedicalGrouping: 'Metabolic',
      potentialMedicalConditions: ['Diabetes Risk', 'Insulin Resistance', 'Cardiovascular Risk']
    };
  }
  
  if (lowerName.includes('hemoglobin') || lowerName.includes('hgb') || lowerName.includes('wbc') || lowerName.includes('rbc') || lowerName.includes('platelet') || lowerName.includes('plt') || lowerName.includes('hematocrit') || lowerName.includes('mcv') || lowerName.includes('mch') || lowerName.includes('anemia') || lowerName.includes('iron') || lowerName.includes('ferritin')) {
    return {
      riskCategories: ['Hematology'],
      standardMedicalGrouping: 'Hematology',
      potentialMedicalConditions: ['Anemia', 'Hematology Disbalance']
    };
  }
  
  if (lowerName.includes('weight') || lowerName.includes('height') || lowerName.includes('bmi') || lowerName.includes('bp') || lowerName.includes('blood pressure') || lowerName.includes('heart rate') || lowerName.includes('pulse')) {
    return {
      riskCategories: ['Cardiovascular'],
      standardMedicalGrouping: 'Biometrics',
      potentialMedicalConditions: ['Hypertension', 'Obesity']
    };
  }
  
  return {
    riskCategories: ['General Health'],
    standardMedicalGrouping: 'Other',
    potentialMedicalConditions: ['General Imbalance']
  };
}

function performOfflineDataAssembly(yamlText: string, bucketMapping: any) {
  const entries = parseYamlOffline(yamlText);
  const bucketsMap: Record<string, any> = {
    'Metabolic': [],
    'Hepatic': [],
    'Renal': [],
    'Hematology': [],
    'Biometrics': [],
    'Other': []
  };
  
  const biomarkerHistory: Record<string, { value: number; date: string; unit: string }[]> = {};
  for (const entry of entries) {
    if (!entry.biomarker) continue;
    if (!biomarkerHistory[entry.biomarker]) {
      biomarkerHistory[entry.biomarker] = [];
    }
    biomarkerHistory[entry.biomarker].push({
      value: entry.value,
      date: entry.date,
      unit: entry.unit
    });
  }
  
  for (const [name, history] of Object.entries(biomarkerHistory)) {
    const mapping = bucketMapping[name] || getOfflineCategorization(name);
    const grouping = mapping.standardMedicalGrouping || 'Other';
    
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sortedHistory[0];
    
    const bObj = {
      name,
      riskCategories: mapping.riskCategories || [],
      standardMedicalGrouping: grouping,
      potentialMedicalConditions: mapping.potentialMedicalConditions || [],
      history: history.map(h => {
        const lower = name.toLowerCase();
        let refRange = '0 - 100 ' + h.unit;
        if (lower.includes('glucose')) refRange = '70 - 99 ' + h.unit;
        else if (lower.includes('hba1c')) refRange = '4.0 - 5.6 ' + h.unit;
        else if (lower.includes('alt')) refRange = '7 - 56 ' + h.unit;
        else if (lower.includes('ast')) refRange = '10 - 40 ' + h.unit;
        else if (lower.includes('creatinine')) refRange = '0.6 - 1.2 ' + h.unit;
        
        return {
          date: h.date,
          value: h.value,
          referenceRange: refRange,
          level: "Normal"
        };
      })
    };
    
    if (bucketsMap[grouping]) {
      bucketsMap[grouping].push(bObj);
    } else {
      bucketsMap['Other'].push(bObj);
    }
  }
  
  const buckets = Object.entries(bucketsMap)
    .filter(([_, list]) => list.length > 0)
    .map(([systemName, biomarkers]) => ({
      systemName,
      biomarkers
    }));
    
  return {
    text: "Data successfully processed and categorized offline.",
    entriesCount: entries.length,
    buckets
  };
}

function extractBiomarkerKeysFromYaml(yamlStr: string): string[] {
  if (!yamlStr) return [];
  const keys: string[] = [];

  try {
    const cleanedText = yamlStr.replace(/```(?:yaml|yml)?/gi, '').trim();
    const parsed = parse(cleanedText);
    const rawList = Array.isArray(parsed) 
      ? parsed 
      : (parsed?.biomarkers || parsed?.entries || parsed?.data || []);
    if (Array.isArray(rawList)) {
      rawList.forEach((item: any) => {
        if (item && typeof item === 'object') {
          const bName = item.biomarker || item.name || item.key;
          if (bName) {
            keys.push(String(bName));
          }
        }
      });
    }
  } catch (e) {
    console.warn("extractBiomarkerKeysFromYaml: standard parser failed, falling back to regex", e);
  }

  if (keys.length > 0) {
    return Array.from(new Set(keys)).filter(Boolean);
  }

  const lines = yamlStr.split(/\r?\n|\\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:-\s*)?biomarker\s*:\s*["']?([^"'\s:]+)["']?/i);
    if (match && match[1]) {
      keys.push(match[1]);
    } else {
      const keyValMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*/);
      if (keyValMatch && keyValMatch[1]) {
        const k = keyValMatch[1].toLowerCase();
        if (k !== 'date' && k !== 'value' && k !== 'unit' && k !== 'biomarker' && k !== 'name') {
          keys.push(keyValMatch[1]);
        }
      }
    }
  });
  return Array.from(new Set(keys)).filter(Boolean);
}

function extractBiomarkerKeysFromPrioritizedConditions(prioritizedConditions: any[]): string[] {
  if (!Array.isArray(prioritizedConditions)) return [];
  const keys: string[] = [];
  prioritizedConditions.forEach(cond => {
    if (cond) {
      if (Array.isArray(cond.biomarkers)) {
        cond.biomarkers.forEach((m: any) => {
          if (m && typeof m.key === 'string') {
            keys.push(m.key);
          }
        });
      }
      if (Array.isArray(cond.biomarkerKeys)) {
        cond.biomarkerKeys.forEach((k: any) => {
          if (typeof k === 'string') {
            keys.push(k);
          }
        });
      }
    }
  });
  return Array.from(new Set(keys)).filter(Boolean);
}

function detectBiomarkersInText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const lowerText = text.toLowerCase();
  
  biomarkerDefinitions.forEach(def => {
    const keyLower = def.key.toLowerCase().replace(/_/g, ' ');
    const nameLower = def.name.toLowerCase();
    
    // Check key (as a word boundary if short, otherwise substring)
    const cleanKey = def.key.toLowerCase();
    const isShortKey = cleanKey.length <= 4;
    
    let isKeyInText = false;
    if (isShortKey) {
      const words = lowerText.split(/[^a-zA-Z0-9]/);
      isKeyInText = words.includes(cleanKey);
    } else {
      isKeyInText = lowerText.includes(cleanKey);
    }
    
    const isNameInText = lowerText.includes(nameLower);
    
    if (isNameInText || isKeyInText) {
      found.add(def.name);
    }
  });
  
  return Array.from(found);
}

interface LogChatProps {
  key?: string;
  type: AgentType;
  profile?: UserProfile | null;
  isOpen: boolean;
  selectedModelId: string;
  onChangeModelId: (id: string) => void;
  onClose: () => void;
  onLogFood?: (food: FoodLog) => void;
  onLogFoodIdeas?: (ideas: FoodIdea[]) => void;
  onLogMedical?: (
    biomarkers: { [key: string]: number | string }, 
    profileUpdates?: Partial<UserProfile>, 
    date?: string, 
    entries?: { date: string | null; biomarkers: { [key: string]: number | string } }[],
    modificationCommand?: { action: 'update_biomarker' | 'update_profile' | 'remove_biomarker'; keyName: string; newValue?: string | number; date?: string }[],
    skipClose?: boolean
  ) => void;
  biomarkers?: { [key: string]: number | string };
  foodLogs?: FoodLog[];
  report?: any;
  actions?: any[];
  googleSteps?: number | null;
  agentType?: 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5' | 'agent7' | 'data_review' | 'health_baseline' | null;
  onOpenAgentFromFrontDesk?: (agentType: 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5' | 'agent7' | 'data_review' | 'health_baseline' | null) => void;
  biomarkerHistory?: any[];
  onAgentFinish?: (agentType: 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5' | 'agent7' | 'data_review' | 'health_baseline', agentResult:  any) => Promise<void>;
  onAgentAnalysisSaved?: (agentType: string, agentResult:  any) => Promise<void>;
  onGoToManualEdit?: (errorMsg?: string) => void;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
  onAddBiomarkerLogs?: (logs: any[]) => void;
  autoSendMessage?: string | null;
  dataReviewBatchIdx?: number | string | null;
  dataReviewBatchKeys?: string[];
  remainingText?: string;
  extractedYaml?: any[];
  currentBatch?: number;
  estimatedTotalMarkers?: number | null;
  batchSize?: number;
  isFirestoreQuotaExceeded?: boolean;
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

export default function LogChat({ 
  type, 
  profile, 
  isOpen, 
  selectedModelId, 
  onChangeModelId, 
  onClose, 
  onLogFood, 
  onLogFoodIdeas,
  onLogMedical, 
  biomarkers,
  foodLogs,
  report,
  actions = [],
  googleSteps = null,
  agentType = null,
  onOpenAgentFromFrontDesk,
  biomarkerHistory = [],
  onAgentFinish,
  onAgentAnalysisSaved,
  onGoToManualEdit,
  onSaveProfile,
  onAddBiomarkerLogs,
  autoSendMessage = null,
  dataReviewBatchIdx = null,
  dataReviewBatchKeys = [],
  remainingText = '',
  extractedYaml = [],
  currentBatch = 1,
  estimatedTotalMarkers = null,
  batchSize = 20,
  isFirestoreQuotaExceeded = false
}: LogChatProps) {
  const activeAgentKey = (type === 'medical' && agentType) ? (agentType as AgentType) : (type as AgentType);
  const activeAgentConfig = AGENT_REGISTRY[activeAgentKey] || AGENT_REGISTRY[type as AgentType];
  const isUnified = ['food', 'medical', 'food_idea', 'daily_recommendation'].includes(type) && getAgentRolloutStatus(type as AgentType) === 'unified';

  const isAgent = (targetType: AgentType) => {
    if (['medical', 'food', 'food_idea', 'daily_recommendation'].includes(targetType)) {
      return type === targetType;
    }
    if (isUnified) return activeAgentConfig?.id === targetType;
    return type === targetType;
  };


  const [showDataUsed, setShowDataUsed] = useState(false);
  const [showFullScreenConv, setShowFullScreenConv] = useState(false);
  const [isSendingLogs, setIsSendingLogs] = useState(false);
  const [logsSendStatus, setLogsSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeModalTableRows, setActiveModalTableRows] = useState<any[] | null>(null);
  const [activeModalTitle, setActiveModalTitle] = useState<string>('Consolidated Clinical Biomarker Log');
  const [activeInstructionAgentType, setActiveInstructionAgentType] = useState<string | null>(null);
  const [activeInstructionPrompt, setActiveInstructionPrompt] = useState<string | null>(null);
  const [expandedAudits, setExpandedAudits] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [fullScreenJson, setFullScreenJson] = useState<string | null>(null);
  const [localBatchSize, setLocalBatchSize] = useState(batchSize || 20);
  const [numberOfBatches, setNumberOfBatches] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem('agent_num_batches') || '50', 10);
    return (isNaN(saved) || saved < 10) ? 50 : saved;
  });

  const [showFullScreenDebugLogs, setShowFullScreenDebugLogs] = useState(false);
  const [debugLogs, setDebugLogs] = useState<{ timestamp: string, message: string }[]>([]);
  const [isDebugSendingLogs, setIsDebugSendingLogs] = useState(false);
  const [debugLogsSendStatus, setDebugLogsSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fetchDebugLogs = async () => {
    try {
      const sessionId = getSessionId();
      const res = await fetch('/api/gemini/debug-logs', {
        headers: {
          'X-Session-ID': sessionId
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setDebugLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Error fetching debug logs:", err);
    }
  };

  const handleClearDebugLogs = async () => {
    try {
      const sessionId = getSessionId();
      const res = await fetch('/api/gemini/clear-debug-logs', { 
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDebugLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error clearing debug logs:", err);
    }
  };

  const handleSendDebugLogsToAdmin = async () => {
    setIsDebugSendingLogs(true);
    setDebugLogsSendStatus('idle');
    try {
      const logsText = debugLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\\n');
      const sessionId = getSessionId();
      
      const res = await fetch('/api/gemini/send-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ logsText })
      });
      
      if (res.ok) {
        try {
          const res2 = await fetch('/api/gemini/debug-logs', {
            headers: {
              'X-Session-ID': sessionId
            }
          });
          if (res2.ok) {
            const data = await res2.json();
            if (data && Array.isArray(data.logs)) {
              setDebugLogs(data.logs);
            }
          }
        } catch (err) {
          console.error("Error fetching debug logs:", err);
        }
        setDebugLogsSendStatus('success');
        setTimeout(() => setDebugLogsSendStatus('idle'), 3000);
      } else {
        setDebugLogsSendStatus('error');
        const subject = encodeURIComponent(`Healthy App Debug Logs - Session ${sessionId}`);
        const body = encodeURIComponent(`Hello Admin,

Here is the compiled log history for session ${sessionId}:

${logsText}`);
        window.open(`mailto:cwah.liu@gmail.com?subject=${subject}&body=${body}`, '_blank');
      }
    } catch (err) {
      console.error("Error sending logs:", err);
      setDebugLogsSendStatus('error');
    } finally {
      setIsDebugSendingLogs(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (showFullScreenDebugLogs) {
      fetchDebugLogs();
      interval = setInterval(fetchDebugLogs, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showFullScreenDebugLogs]);
  useEffect(() => {
    localStorage.setItem('agent_num_batches', String(numberOfBatches));
  }, [numberOfBatches]);

  const handleSendLogToAdmin = async () => {
    setIsSendingLogs(true);
    setLogsSendStatus('idle');
    try {
      const logsText = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
      const sessionId = auth.currentUser?.uid || 'anonymous';
      
      const res = await fetch('/api/gemini/send-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({ logsText })
      });
      
      if (res.ok) {
        setLogsSendStatus('success');
        
        // Native mailto link fallback
        const subject = encodeURIComponent(`Healthy App Food Chat Logs - User ${sessionId}`);
        const body = encodeURIComponent(`Hello Admin,

Here is the compiled food log history for user ${sessionId}:

${logsText}`);
        window.open(`mailto:cwah.liu@gmail.com?subject=${subject}&body=${body}`, '_blank');
      } else {
        setLogsSendStatus('error');
      }
    } catch (err) {
      console.error("Error sending logs:", err);
      setLogsSendStatus('error');
    } finally {
      setIsSendingLogs(false);
      setTimeout(() => setLogsSendStatus('idle'), 4000);
    }
  };

  const activeFoodLogs = React.useMemo(() => (foodLogs || []).filter(f => f.sync_state !== 'delete'), [foodLogs]);
  const activeHistory = (biomarkerHistory || []).filter(h => h.sync_state !== 'delete');
  const userIdentifier = profile?.email?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'guest';

  const payloadStorageKey = agentType ? `last_sent_payload_${userIdentifier}_${type}_${agentType}_${dataReviewBatchIdx ?? 'none'}` : `last_sent_payload_${userIdentifier}_${type}`;
  const chatStorageKey = agentType ? `chat_messages_${userIdentifier}_${type}_${agentType}_${dataReviewBatchIdx ?? 'none'}` : `chat_messages_${userIdentifier}_${type}`;

  const [lastSentPayload, setLastSentPayload] = useState<any>(null);
  const [messages, setMessagesInternal] = useState<ChatMessage[]>([]);
  const hasUnsavedChangesRef = useRef<boolean>(false);

  const setMessages = (
    update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
    markAsUnsaved = true
  ) => {
    if (markAsUnsaved) {
      hasUnsavedChangesRef.current = true;
    }
    setMessagesInternal(prev => {
      let newVal = typeof update === 'function' ? update(prev) : update;
      if (isAgent('food') && newVal.length > 11) {
        newVal = [newVal[0], ...newVal.slice(-10)];
      }
      return newVal;
    });
  };
  
  // Synchronized Multi-select Search Mode States for Bottom Action Bar
  const [isSelectingMode, setIsSelectingMode] = useState<boolean>(false);
  const [selectingMsgId, setSelectingMsgId] = useState<string | null>(null);
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const foodCardActionRef = useRef<any>(null);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const key = `active_session_id_${type || 'medical'}_${agentType || 'none'}`;
    const saved = localStorage.getItem(key);
    return saved || `session_${Date.now()}`;
  });
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);

  const getWelcomeMessage = () => {
    return {
      id: `welcome_${type}_${agentType || 'default'}_${Date.now()}`,
      role: 'assistant' as const,
      content: activeAgentConfig?.welcomeMessage
        ? (typeof activeAgentConfig.welcomeMessage === 'function' ? activeAgentConfig.welcomeMessage({ dataReviewBatchIdx }) : activeAgentConfig.welcomeMessage)
        : 'Hello! How can I help you today?',
      timestamp: new Date().toISOString()
    };
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<(() => void) | null>(null);

  const debouncedSaveConversation = (id: string, msgs: ChatMessage[], payload: any) => {
    if (!hasUnsavedChangesRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingSaveRef.current = () => {
      saveConversationToFirestore(id, msgs, payload);
      hasUnsavedChangesRef.current = false;
    };
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        pendingSaveRef.current();
        pendingSaveRef.current = null;
      }
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pendingSaveRef.current) {
        pendingSaveRef.current();
        pendingSaveRef.current = null;
      }
    };
  }, []);

  const compressLargeImagesInObject = async (obj: any): Promise<any> => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      if (obj.startsWith('data:image/') && obj.length > 8000) {
        try {
          // STRICT RULE: Compress base64 to maximum 400x400 pixels at 0.5 quality to prevent Firestore exhaustion
          const compressed = await compressImage(obj, 400, 400, 0.5);
          return compressed;
        } catch (e) {
          console.warn("Failed to compress base64 image in object:", e);
          if (obj.length > 900000) {
            return obj.substring(0, 100) + "... [large base64 image stripped to prevent Firestore size limit error]";
          }
          return obj;
        }
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      const arr = [];
      for (const item of obj) {
        arr.push(await compressLargeImagesInObject(item));
      }
      return arr;
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [k, v] of Object.entries(obj)) {
        cleaned[k] = await compressLargeImagesInObject(v);
      }
      return cleaned;
    }
    return obj;
  };

  const saveConversationToFirestore = async (id: string, msgs: ChatMessage[], payload: any) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      try {
        // Strip heavy base64 images before saving to sessionStorage/localStorage to prevent quota crashes.
        // IndexedDB below still keeps the full, unstripped copy — it has a much higher capacity ceiling
        // and is already treated as the authoritative guest store elsewhere (see loadConversationsFromFirestore,
        // which reads IndexedDB first for guests specifically to retain full images).
        const strippedMsgs = msgs.map(m => {
          const copy = { ...m };
          if (copy.imageUrls) copy.imageUrls = [];
          if (copy.imageUrl) delete copy.imageUrl;
          return copy;
        });
        sessionStorage.setItem(chatStorageKey, JSON.stringify(strippedMsgs));
        if (payload) sessionStorage.setItem(payloadStorageKey, JSON.stringify(payload));
        // Fallback to localStorage and IndexedDB to survive page reloads and tab closures
        localStorage.setItem(chatStorageKey, JSON.stringify(strippedMsgs));
        if (payload) localStorage.setItem(payloadStorageKey, JSON.stringify(payload));
        await idbSet(`${chatStorageKey}_guest_${id}`, msgs);
        if (payload) await idbSet(`${payloadStorageKey}_guest_${id}`, payload);
      } catch (e) {
        console.warn("Quota exceeded in sessionStorage/localStorage/IndexedDB");
      }
      return;
    }

    // Always preserve full, complete messages with images in IndexedDB to prevent image loss on reload
    try {
      await idbSet(`${chatStorageKey}_${userId}_${id}`, msgs);
      if (payload) {
        await idbSet(`${payloadStorageKey}_${userId}_${id}`, payload);
      }
    } catch (e) {
      console.warn("Failed to save to IndexedDB:", e);
    }

    const isManualSyncOnly = localStorage.getItem('auto_sync_disabled') === 'true';
    if (isManualSyncOnly || checkQuotaFlag() || isFirestoreQuotaExceeded) {
      try {
        // Strip heavy base64 images before saving to localStorage to prevent quota crashes!
        const strippedMsgs = msgs.map(m => {
           const copy = { ...m };
           if (copy.imageUrls) copy.imageUrls = [];
           if (copy.imageUrl) delete copy.imageUrl;
           return copy;
        });
        
        try {
          localStorage.setItem(`${chatStorageKey}_${userId}_${id}`, JSON.stringify(strippedMsgs));
          if (payload) localStorage.setItem(`${payloadStorageKey}_${userId}_${id}`, JSON.stringify(payload));
        } catch (quotaErr) {
          pruneLocalStorageToFreeSpace();
          try {
            localStorage.setItem(`${chatStorageKey}_${userId}_${id}`, JSON.stringify(strippedMsgs));
            if (payload) localStorage.setItem(`${payloadStorageKey}_${userId}_${id}`, JSON.stringify(payload));
          } catch (retryErr) {
            // Silently bypass as IndexedDB holds the primary full copy
          }
        }
        
        // Also update the local list so the sidebar is completely in sync and beautiful
        const title = msgs.length > 1 
          ? (msgs[1].role === 'user' ? msgs[1].content.slice(0, 30) + '...' : `Session - ${new Date(msgs[0].timestamp).toLocaleDateString()}`)
          : `Session - ${new Date().toLocaleDateString()}`;
        
        setConversationsList(prev => {
          const existingIdx = prev.findIndex(c => c.id === id);
          const updatedItem = {
            id,
            userId,
            type: type || 'medical',
            agentType: agentType || null,
            title,
            createdAt: msgs[0]?.timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: msgs,
            lastSentPayload: payload || null
          };
          if (existingIdx >= 0) {
            const nextList = [...prev];
            nextList[existingIdx] = updatedItem;
            return nextList;
          } else {
            return [updatedItem, ...prev];
          }
        });
      } catch (e) {
        console.warn("Quota exceeded in localStorage");
      }
      return;
    }

    try {
      const compressedMsgs = await compressLargeImagesInObject(msgs);
      const compressedPayload = await compressLargeImagesInObject(payload);

      const docRef = doc(db, 'users', userId, 'conversations', id);
      trackApiCall('firebase_write', `Firestore Write - Save Chat Session (${id}) [Type: ${type || 'medical'}${agentType ? `, Agent: ${agentType}` : ''}] (saves chat messages, title, and lastSentPayload dynamically in Real-Time as messages are sent)`);
      await setDoc(docRef, sanitizeForFirestore({
        id,
        userId,
        type: type || 'medical',
        agentType: agentType || null,
        title: msgs.length > 1 
          ? (msgs[1].role === 'user' ? msgs[1].content.slice(0, 30) + '...' : `Session - ${new Date(msgs[0].timestamp).toLocaleDateString()}`)
          : `Session - ${new Date().toLocaleDateString()}`,
        createdAt: msgs[0]?.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: compressedMsgs,
        lastSentPayload: compressedPayload || null
      }), { merge: true });
    } catch (err) {
      console.error("Error saving conversation to Firestore:", err);
    }
  };

  const migrateMessages = (msgs: any[]) => msgs.map(msg => {
    const newMsg = { ...msg };
    if (!newMsg.data) {
      newMsg.data = {};
      const legacyFields = ['pendingFoodLog', 'pendingFoodIdeas', 'pendingBiomarkers', 'pendingBiomarkerEntries', 'pendingCustomBiomarkerDefs', 'proposal', 'bucketMapping', 'agentResult'];
      legacyFields.forEach(f => {
        if (newMsg[f] !== undefined) {
          newMsg.data[f] = newMsg[f];
          delete newMsg[f];
        }
      });
    }
    return newMsg;
  });

  const loadConversationsFromFirestore = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      let savedMsgs = null;
      let savedPayload = null;

      try {
        // Try IndexedDB first (retains full images and detail payload)
        const idbSaved = await idbGet(`${chatStorageKey}_guest_${activeConversationId}`);
        if (idbSaved) {
          savedMsgs = idbSaved;
          savedPayload = await idbGet(`${payloadStorageKey}_guest_${activeConversationId}`);
        }
      } catch (e) {
        console.warn("Failed to load guest chat from IndexedDB:", e);
      }

      if (!savedMsgs) {
        const saved = sessionStorage.getItem(chatStorageKey) || localStorage.getItem(chatStorageKey);
        if (saved) {
          try {
            savedMsgs = JSON.parse(saved);
            const savedP = sessionStorage.getItem(payloadStorageKey) || localStorage.getItem(payloadStorageKey);
            savedPayload = savedP ? JSON.parse(savedP) : null;
          } catch {}
        }
      }

      if (savedMsgs) {
        setMessages(migrateMessages(savedMsgs), false);
        setLastSentPayload(savedPayload);
      } else {
        const welcome = getWelcomeMessage();
        setMessages([welcome], false);
        setLastSentPayload(null);
      }
      return;
    }

    setIsLoadingConversations(true);
    try {
      const q = query(
        collection(db, 'users', userId, 'conversations'),
        where('type', '==', type || 'medical'),
        where('agentType', '==', agentType || null)
      );
      trackApiCall('firebase_read', `Firestore Read - Load Chat Sessions List [Type: ${type || 'medical'}${agentType ? `, Agent: ${agentType}` : ''}] (downloads past chat session records to display in the conversation history side panel)`);
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });

      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversationsList(list);

      if (list.length > 0) {
        const match = list.find(c => c.id === activeConversationId) || list[0];
        setActiveConversationId(match.id);
        
        // Check if there is a newer local version in IndexedDB (has full images) or fallback to localStorage (stripped)
        let localSaved = null;
        let localPayload = null;
        try {
          const idbSaved = await idbGet(`${chatStorageKey}_${userId}_${match.id}`);
          if (idbSaved) {
            localSaved = idbSaved;
            localPayload = await idbGet(`${payloadStorageKey}_${userId}_${match.id}`);
          }
        } catch (e) {
          console.warn("Failed to load from IndexedDB:", e);
        }

        if (!localSaved) {
          const lsSaved = localStorage.getItem(`${chatStorageKey}_${userId}_${match.id}`);
          if (lsSaved) {
            try {
              localSaved = JSON.parse(lsSaved);
              const lsPayload = localStorage.getItem(`${payloadStorageKey}_${userId}_${match.id}`);
              if (lsPayload) {
                localPayload = JSON.parse(lsPayload);
              }
            } catch {}
          }
        }

        if (localSaved) {
          try {
            setMessages(migrateMessages(localSaved), false);
            setLastSentPayload(localPayload || null);
          } catch {
            setMessages(migrateMessages(match.messages || []), false);
            setLastSentPayload(match.lastSentPayload || null);
          }
        } else {
          setMessages(migrateMessages(match.messages || []), false);
          setLastSentPayload(match.lastSentPayload || null);
        }
      } else {
        const newId = `session_${Date.now()}`;
        setActiveConversationId(newId);
        const welcome = getWelcomeMessage();
        setMessages([welcome], false);
        setLastSentPayload(null);
        setConversationsList([{
          id: newId,
          type: type || 'medical',
          agentType: agentType || null,
          title: 'New Session',
          updatedAt: new Date().toISOString(),
          messages: [welcome]
        }]);
      }
    } catch (err: any) {
      console.log("Error loading conversations from Firestore (falling back to local IndexedDB/localStorage):", err?.message || err);
      try {
        const listKey = `conversations_list_${type || 'medical'}_${agentType || 'none'}_${userId}`;
        const localList = await idbGet(listKey);
        if (localList && localList.length > 0) {
          console.log("Successfully loaded backup conversations list from IndexedDB after Firestore error");
          setConversationsList(localList);
          
          const match = localList.find((c: any) => c.id === activeConversationId) || localList[0];
          setActiveConversationId(match.id);
          
          let localSaved = await idbGet(`${chatStorageKey}_${userId}_${match.id}`);
          let localPayload = await idbGet(`${payloadStorageKey}_${userId}_${match.id}`);
          
          if (localSaved) {
            setMessages(migrateMessages(localSaved), false);
            setLastSentPayload(localPayload || null);
          } else {
            // Check if there is anything under guest just in case
            let guestSaved = await idbGet(`${chatStorageKey}_guest_${match.id}`);
            if (guestSaved) {
              setMessages(migrateMessages(guestSaved), false);
              setLastSentPayload(await idbGet(`${payloadStorageKey}_guest_${match.id}`) || null);
            } else {
              setMessages([getWelcomeMessage()], false);
              setLastSentPayload(null);
            }
          }
        } else {
          // No local list, initialize new session
          const newId = `session_${Date.now()}`;
          setActiveConversationId(newId);
          const welcome = getWelcomeMessage();
          setMessages([welcome], false);
          setLastSentPayload(null);
          setConversationsList([{
            id: newId,
            type: type || 'medical',
            agentType: agentType || null,
            title: 'New Session',
            updatedAt: new Date().toISOString(),
            messages: [welcome]
          }]);
        }
      } catch (fallbackErr) {
        console.error("Failed to load offline conversations fallback from IndexedDB:", fallbackErr);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleNewSession = async () => {
    const newId = `session_${Date.now()}`;
    setActiveConversationId(newId);
    const welcome = getWelcomeMessage();
    setMessages([welcome], false);
    setLastSentPayload(null);
    setConversationsList(prev => [
      {
        id: newId,
        type: type || 'medical',
        agentType: agentType || null,
        title: `Session - ${new Date().toLocaleDateString()}`,
        updatedAt: new Date().toISOString(),
        messages: [welcome]
      },
      ...prev
    ]);
  };

  const handleDeleteSession = async (sessId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      trackApiCall('firebase_delete', `Firestore Delete - Remove Chat Session (${sessId}) (permanently deletes specified chat history from Cloud Database)`);
      await deleteDoc(doc(db, 'users', userId, 'conversations', sessId));
      const updatedList = conversationsList.filter(c => c.id !== sessId);
      setConversationsList(updatedList);
      
      if (sessId === activeConversationId) {
        if (updatedList.length > 0) {
          const nextSess = updatedList[0];
          setActiveConversationId(nextSess.id);
          setMessages(migrateMessages(nextSess.messages || []), false);
          setLastSentPayload(nextSess.lastSentPayload || null);
        } else {
          handleNewSession();
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const handleSwitchSession = async (sessId: string) => {
    const found = conversationsList.find(c => c.id === sessId);
    if (found) {
      setActiveConversationId(sessId);
      
      const userId = auth.currentUser?.uid || 'guest';
      let fullMessages = null;
      let fullPayload = null;
      try {
        const idbSaved = await idbGet(`${chatStorageKey}_${userId}_${sessId}`);
        if (idbSaved) {
          fullMessages = idbSaved;
          fullPayload = await idbGet(`${payloadStorageKey}_${userId}_${sessId}`);
        } else {
          const guestSaved = await idbGet(`${chatStorageKey}_guest_${sessId}`);
          if (guestSaved) {
            fullMessages = guestSaved;
            fullPayload = await idbGet(`${payloadStorageKey}_guest_${sessId}`);
          }
        }
      } catch (e) {
        console.warn("Failed to load full session from IndexedDB:", e);
      }

      if (fullMessages) {
        setMessages(migrateMessages(fullMessages), false);
        setLastSentPayload(fullPayload || null);
      } else {
        setMessages(migrateMessages(found.messages || []), false);
        setLastSentPayload(found.lastSentPayload || null);
      }
    }
  };

  useEffect(() => {
    const userId = auth.currentUser?.uid || 'guest';
    if (conversationsList && conversationsList.length > 0) {
      const lightweightList = conversationsList.map(c => ({
        id: c.id,
        userId: c.userId || userId,
        type: c.type,
        agentType: c.agentType,
        title: c.title,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      }));
      const listKey = `conversations_list_${type || 'medical'}_${agentType || 'none'}_${userId}`;
      idbSet(listKey, lightweightList).catch(err => {
        console.warn("Failed to save lightweight conversations list to IndexedDB:", err);
      });
    }
  }, [conversationsList, type, agentType]);

  useEffect(() => {
    if (activeConversationId) {
      const key = `active_session_id_${type || 'medical'}_${agentType || 'none'}`;
      localStorage.setItem(key, activeConversationId);
    }
  }, [activeConversationId, type, agentType]);

  useEffect(() => {
    if (isOpen) {
      const qid = generateQueryId();
      setActiveQueryId(qid);
      loadConversationsFromFirestore();
    } else {
      setActiveQueryId(null);
    }
  }, [auth.currentUser?.uid, type, agentType, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([getWelcomeMessage()], false);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (activeConversationId && messages && messages.length > 1) {
      debouncedSaveConversation(activeConversationId, messages, lastSentPayload);
    }
  }, [messages, lastSentPayload, activeConversationId]);

  const [inputText, setInputText] = useState('');
  const [budget, setBudget] = useState(() => localStorage.getItem('food_budget') || '');
  const [currency, setCurrency] = useState(() => localStorage.getItem('food_currency') || 'GBP');
  const [maxDistance, setMaxDistance] = useState(() => {
    const saved = localStorage.getItem('food_max_distance');
    return saved ? parseFloat(saved) : 3;
  });

  useEffect(() => {
    localStorage.setItem('food_budget', budget);
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('food_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('food_max_distance', String(maxDistance));
  }, [maxDistance]);

  useEffect(() => {
    const savedCurrency = localStorage.getItem('food_currency');
    if (!savedCurrency) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isIndo = tz && (tz.includes('Jakarta') || tz.includes('Makassar') || tz.includes('Jayapura') || tz.includes('Asia/Jakarta') || tz.includes('Asia/Makassar') || tz.includes('Asia/Jayapura'));
      if (isIndo) {
        setCurrency('IDR');
        setBudget('100000');
      } else {
        setCurrency('GBP');
        setBudget('5');
      }
    }
  }, []);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImagesForAnalysis, setSelectedImagesForAnalysis] = useState<string[]>([]);
  const [imageDates, setImageDates] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [liveThoughts, setLiveThoughts] = useState<{scout?: string, dietitian?: string}>({});
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const [analyzingStepIndex, setAnalyzingStepIndex] = useState(0);
  const [expandedNutrients, setExpandedNutrients] = useState(false);
  const [isEngineSelectorOpen, setIsEngineSelectorOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const t = translations[profile?.language || 'en'] || translations.en;

  const ANALYZING_STEPS = isAgent('food')
    ? ["Reading your photos...", "Searching nutrition databases...", "Checking your biomarker profile...", "Consulting the clinical AI model..."]
    : ["Gathering your recent history...", "Checking your biomarker profile...", "Consulting the clinical AI model..."];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalyzingStepIndex((prev) => {
          if (prev < ANALYZING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1800);
    } else {
      setAnalyzingStepIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing, type]);

  const [loggedMessageIds, setLoggedMessageIds] = useState<string[]>([]);
  const [showPastDiscussion, setShowPastDiscussion] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveThoughtRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const initialOpenScrollDoneRef = useRef<boolean>(false);

  const lastFoodMsg = React.useMemo(() => {
    return [...messages].reverse().find(m => m.role === 'assistant' && m.agentType === 'food');
  }, [messages]);

  const scrollToLastFoodMessage = (smooth = false) => {
    const container = chatWindowRef.current;
    const target = document.getElementById("last-food-message");
    if (container && target) {
      let actualOffsetTop = 0;
      let curr: HTMLElement | null = target;
      while (curr && curr !== container) {
        actualOffsetTop += curr.offsetTop;
        curr = curr.offsetParent as HTMLElement | null;
      }
      container.scrollTo({
        top: actualOffsetTop,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      initialOpenScrollDoneRef.current = false;
    } else if (isOpen && isAgent('food') && !initialOpenScrollDoneRef.current) {
      initialOpenScrollDoneRef.current = true;
      const timer = setTimeout(() => {
        scrollToLastFoodMessage(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeAgentKey, messages]);

  useEffect(() => {
    if (!isAnalyzing && isAgent('food')) {
      const timer = setTimeout(() => {
        scrollToLastFoodMessage(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, activeAgentKey]);

  const handleDeleteMessagePair = (messageId: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === messageId);
      if (idx === -1) return prev;
      const msgToDelete = prev[idx];
      const newMsgs = [...prev];
      if (msgToDelete.role === 'user') {
        if (idx + 1 < newMsgs.length && newMsgs[idx + 1].role === 'assistant') {
          newMsgs.splice(idx, 2);
        } else {
          newMsgs.splice(idx, 1);
        }
      } else if (msgToDelete.role === 'assistant') {
        if (idx - 1 >= 0 && newMsgs[idx - 1].role === 'user') {
          newMsgs.splice(idx - 1, 2);
        } else {
          newMsgs.splice(idx, 1);
        }
      }
      return newMsgs;
    });
  };

  useEffect(() => {
    if (isOpen) {
      const saved = sessionStorage.getItem(chatStorageKey);
      let lastMsg: ChatMessage | null = null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            lastMsg = parsed[parsed.length - 1];
          }
        } catch (e) {}
      }

      // Removed session start time resetting

      // Removed forced welcome message append and hiding of past discussion
    }
  }, [isOpen, type, chatStorageKey]);

  useEffect(() => {
    // Eagerly fetch user location only when food idea chat is active
    if (type !== 'food_idea' || !isOpen) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        
        const isIndo = lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;
        const savedCurrency = localStorage.getItem('food_currency');
        if (!savedCurrency && isIndo) {
          setCurrency('IDR');
          setBudget('100000');
        }
      }, (err) => {
        console.warn("Could not get location:", err);
      });
    }
  }, [isOpen, type]);

  const outOfRangeBiomarkers = React.useMemo(() => {
    const list: { key: string; name: string; value: any; status: string; normalRange: string; unit: string }[] = [];
    
    // Aggregate all unique biomarker keys from both the local snapshot and the active history
    const allKeys = new Set<string>();
    Object.keys(biomarkers || {}).forEach(k => allKeys.add(k));
    (activeHistory || []).forEach(h => {
      Object.keys(h.biomarkers || {}).forEach(k => allKeys.add(k));
    });
    Array.from(allKeys).forEach((key) => {
      const def = biomarkerDefinitions.find(d => d.key === key);
      const customDef = profile?.customBiomarkers?.[key];
      if (!def && !customDef) return;
      
      let val = biomarkers?.[key];
      const historyLogs = activeHistory ? activeHistory.filter(h => h.biomarkers && h.biomarkers[key] !== undefined) : [];
      if (historyLogs.length > 0) {
        const sortedLogs = [...historyLogs].sort((a, b) => toYYYYMMDD(b.date).localeCompare(toYYYYMMDD(a.date)));
        val = sortedLogs[0].biomarkers[key];
      }
      
      const normalRange = customDef?.normalRange || def?.normalRange || '';
      const unit = customDef?.unit || def?.unit || '';
      const name = customDef?.name || def?.name || key;
      
      const status = getBiomarkerStatus(key, val, normalRange, customDef || def, profile);
      if (status === 'high' || status === 'low' || status === 'critical') {
        list.push({
          key,
          name,
          value: val,
          status,
          normalRange,
          unit
        });
      }
    });
    return list;
  }, [biomarkers, profile?.ethnicity, activeHistory]);

  const remainingAllowance = React.useMemo(() => {
    const todayStr = getCurrentDateInTimezone(profile?.timezone);
    const todaysFoods = activeFoodLogs ? activeFoodLogs.filter(f => f.date === todayStr) : [];

    const todaysTotals = todaysFoods.reduce((acc, curr) => {
      if (curr.nutrients) {
        Object.keys(curr.nutrients).forEach(k => {
          const key = k as keyof typeof curr.nutrients;
          acc[key] = (Number(acc[key]) || 0) + (Number(curr.nutrients[key]) || 0);
        });
      }
      return acc;
    }, {} as { [key: string]: number });

    const parseTarget = (val: any, fallback: number) => {
      if (val === null || val === undefined) return fallback;
      const cleanStr = String(val).replace(/,/g, '');
      const matches = cleanStr.match(/\d+(\.\d+)?/g);
      if (!matches || matches.length === 0) return fallback;
      const parsed = parseFloat(matches[0]);
      return isNaN(parsed) ? fallback : parsed;
    };

    const activeTargets = {
      calories: Number(todaysTotals.calories || 0),
      caloriesTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.calories, 1700) : 1800,
      satFat: Number(todaysTotals.saturatedFat || 0),
      satFatTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.saturatedFat, 15) : 15,
      sodium: Number(todaysTotals.sodium || 0),
      sodiumTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.sodium, 1200) : 1200,
      addedSugar: Number(todaysTotals.addedSugar || 0),
      addedSugarTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.addedSugar, 50) : 50,
      carbohydrates: Number(todaysTotals.carbohydrates || 0),
      carbohydratesTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.carbohydrates, 250) : 250,
      solubleFibre: Number(todaysTotals.solubleFibre || 0),
      solubleFibreTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.solubleFibre, 15) : 15,
      protein: Number(todaysTotals.protein || 0),
      proteinTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.protein, 50) : 50,
      potassium: Number(todaysTotals.potassium || 0),
      potassiumTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.potassium, 3500) : 3500,
      unsaturatedFat: Number(todaysTotals.unsaturatedFat || 0),
      unsaturatedFatTarget: report && report.dailyNutrientTargets ? parseTarget(report.dailyNutrientTargets.unsaturatedFat, 40) : 40,
    };

    return {
      calories: Math.max(0, activeTargets.caloriesTarget - activeTargets.calories),
      saturatedFat: Math.max(0, activeTargets.satFatTarget - activeTargets.satFat),
      sodium: Math.max(0, activeTargets.sodiumTarget - activeTargets.sodium),
      addedSugar: Math.max(0, activeTargets.addedSugarTarget - activeTargets.addedSugar),
      carbohydrates: Math.max(0, activeTargets.carbohydratesTarget - activeTargets.carbohydrates),
      solubleFibre: Math.max(0, activeTargets.solubleFibreTarget - activeTargets.solubleFibre),
      protein: Math.max(0, activeTargets.proteinTarget - activeTargets.protein),
      potassium: Math.max(0, activeTargets.potassiumTarget - activeTargets.potassium),
      unsaturatedFat: Math.max(0, activeTargets.unsaturatedFatTarget - activeTargets.unsaturatedFat),
      caloriesTarget: activeTargets.caloriesTarget,
      saturatedFatTarget: activeTargets.satFatTarget,
      sodiumTarget: activeTargets.sodiumTarget,
      addedSugarTarget: activeTargets.addedSugarTarget,
      carbohydratesTarget: activeTargets.carbohydratesTarget,
      solubleFibreTarget: activeTargets.solubleFibreTarget,
      proteinTarget: activeTargets.proteinTarget,
      potassiumTarget: activeTargets.potassiumTarget,
      unsaturatedFatTarget: activeTargets.unsaturatedFatTarget,
    };
  }, [foodLogs, report, profile?.timezone]);

  useEffect(() => {
    if (!isAnalyzing && messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
          // When the summary answer is shown, do not scroll down again
          return;
        }
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    } else if (isAnalyzing) {
      // Keep the live "Agent thought..." box pinned near the top of the viewport
      // while it's still growing, instead of scrolling past it to the bottom.
      (liveThoughtRef.current || messagesEndRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isAnalyzing, messages, liveThoughts]);

  const matchingPreviousLogs = React.useMemo(() => {
    if (type !== 'food' || !activeFoodLogs || inputText.trim().length < 3) return [];
    const query = inputText.toLowerCase().trim();
    const uniqueMatches: FoodLog[] = [];
    const seenNames = new Set<string>();
    
    const reversedLogs = [...activeFoodLogs].reverse();
    for (const log of reversedLogs) {
      if (log.name && log.name.toLowerCase().includes(query)) {
        if (!seenNames.has(log.name.toLowerCase())) {
          seenNames.add(log.name.toLowerCase());
          uniqueMatches.push(log);
        }
      }
    }
    return uniqueMatches;
  }, [type, activeFoodLogs, inputText]);



  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // Reset input value immediately so same files can be selected again
    
    if (fileList.length > 0) {
      const validFiles = fileList.filter((file: any) => {
        const isDng = file.name.toLowerCase().endsWith('.dng') || file.type.includes('dng') || file.type === 'image/x-adobe-dng';
        return !isDng;
      });

      const dngCount = fileList.length - validFiles.length;
      if (dngCount > 0) {
        alert("DNG (RAW) files are not supported by web browsers. Please select standard images like JPEG, PNG, or WEBP.");
      }

      if (validFiles.length === 0) return;

      setIsCompressing(true);
      setCompressionProgress({ current: 0, total: validFiles.length, percent: 0 });
      try {
        const compressed = await compressMultipleImages(validFiles, (progress) => {
          setCompressionProgress({
            current: progress.currentIndex,
            total: progress.totalCount,
            percent: progress.percentage
          });
        }, 1400, 1400, 0.8);
        const analysisCompressed = await compressMultipleImages(validFiles, () => {}, 1400, 1400, 0.85);
        const dates = await Promise.all(validFiles.map(async (f: any) => {
          try {
            const exifData = await exifr.parse(f, ['DateTimeOriginal']);
            if (exifData && exifData.DateTimeOriginal) {
              return new Date(exifData.DateTimeOriginal).toLocaleString();
            }
          } catch (e) {
            console.warn("Could not parse EXIF for", f.name);
          }
          return new Date(f.lastModified).toLocaleString();
        }));
        setSelectedImages(prev => [...prev, ...compressed]);
        setSelectedImagesForAnalysis(prev => [...prev, ...analysisCompressed]);
        setImageDates(prev => [...prev, ...dates]);
      } catch (err) {
        console.error("Error compressing selected images:", err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSend = async (overrideText?: string | any) => {
    // Check credit limits before proceeding
    if (profile) {
      const creditInfo = getAvailableCredits(profile);
      const isFlashLite = selectedModelId === 'gemini-3.1-flash-lite' || selectedModelId === 'gemini-2.5-flash-lite';
      const cost = isFlashLite ? 1 : 20;
      if (creditInfo.total < cost) {
        const errorMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Credit Quota Exceeded**\n\nYou have insufficient AI Agent credits to make this request!\n\n* **Required**: \`${cost}\` credits (for model \`${selectedModelId}\`)\n* **Available**: \`${creditInfo.total}\` credits (Daily quota: \`${creditInfo.daily}\`)\n* **Reset Time**: Resets in **${creditInfo.nextResetStr}**.\n\n*Admins can grant additional credits with duration in the User Management tab under Admin Settings.*`,
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
        setIsAnalyzing(false);
        return;
      }
    }

    const currentReqId = generateQueryId();
    setActiveQueryId(currentReqId);
    setActiveReqId(currentReqId);
    setLiveThoughts({});
    let textToSend = typeof overrideText === 'string' ? overrideText : (overrideText?.text || inputText);
    const compareOnly = typeof overrideText === 'object' && overrideText?.compareOnly;
    const compareItems = typeof overrideText === 'object' && overrideText?.compareItems;
    const sourceMsgId = typeof overrideText === 'object' && overrideText?.sourceMsgId;

    if (!textToSend && selectedImages.length === 0) return;

    // Eagerly wait for geolocation if doing food ideas and it's not resolved yet
    let loc = userLocation;
    if (isAgent('food_idea') && !loc) {
      if (navigator.geolocation) {
        try {
          console.log("[Geolocation] Awaiting geolocation resolution before food-idea request...");
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
        } catch (err) {
          console.warn("[Geolocation] Could not await location during handleSend:", err);
        }
      }
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
      imageUrl: selectedImages[0] || undefined,
      imageUrls: selectedImages.length > 0 ? selectedImages : undefined
    };

    const isFood = isAgent('food');
    const liveMsg: ChatMessage = {
      id: `msg_live_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLive: true,
      agentType: isFood ? 'food' : (isAgent('food_idea') ? 'food_idea' : (agentType || 'agent1')),
      data: {
        hasImage: selectedImages.length > 0,
        agentResult: {
          scoutScratchpad: '',
          dietitianScratchpad: ''
        }
      }
    };

    setMessages(prev => [...prev, userMsg, liveMsg]);
    if (typeof overrideText !== 'string') {
      setInputText('');
    }
    const tempImages = [...selectedImages];
    const tempAnalysisImages = [...selectedImagesForAnalysis];
    const tempDates = [...imageDates];
    setSelectedImages([]);
    setSelectedImagesForAnalysis([]);
    setImageDates([]);
    setIsAnalyzing(true);
    // Scroll immediately so the user can watch the agent's live thought process
    // as soon as the request starts, instead of waiting for the final answer.
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    try {
      let endpoint = '';
      if (isAgent('food')) endpoint = '/api/gemini/food-analyze';
      else if (isAgent('food_idea')) endpoint = '/api/gemini/food-idea';
      else if (isAgent('daily_recommendation')) endpoint = '/api/gemini/daily-recommendation-chat';
      else if (isAgent('health_baseline')) endpoint = '/api/gemini/health-baseline-analyze';
      else if (isAgent('front_desk')) endpoint = '/api/gemini/front-desk';
      else endpoint = '/api/gemini/medical-analyze';

      const lightProfile = profile ? { ...profile } as any : null;
      if (lightProfile) {
        delete lightProfile.fontSizeTitle;
        delete lightProfile.fontSizeSubtitle;
        delete lightProfile.fontSizeSubtitleSmall;
        delete lightProfile.fontSizeBodySmall;
        delete lightProfile.fontSizeXS;
        delete lightProfile.fontSizeKeyMetric;
        delete lightProfile.fontSizeDescription;
        delete lightProfile.photoUrl;
        delete lightProfile.timezone;
        delete lightProfile.language;
        delete lightProfile.deletedBiomarkerLogIds;
        delete lightProfile.deletedFoodLogIds;
        delete lightProfile.deletedCustomBiomarkerKeys;
        delete lightProfile.agentTriageSummary;
        delete lightProfile.approved_agent1_batches;
        delete lightProfile.approved_data_review_batches;
        delete lightProfile.agentAnalyses;
        delete lightProfile.agentContextualizerSummary;
        delete lightProfile.stripeSubscriptionId;
        // customBiomarkers (full lab results) is never read by the food-analyze
        // or food-idea backend endpoints — only age/gender/weight/height/ethnicity
        // are used, plus the separately-sent, pre-filtered biomarkersNeedingImprovement.
        // Stop sending it for these two request types to shrink the payload and
        // avoid exposing irrelevant lab data (e.g. unrelated screening results)
        // in agent request logs.
        if (isAgent('food') || isAgent('food_idea')) {
          delete lightProfile.customBiomarkers;
        }
      }

      const revIdx = [...messages].reverse().findIndex(m => m.id.startsWith('welcome_'));
      const lastWelcomeIndex = revIdx >= 0 ? messages.length - 1 - revIdx : -1;
      const activeSessionIdx = lastWelcomeIndex >= 0 ? lastWelcomeIndex : 0;
      
      const bodyData: any = {
        userId: auth.currentUser?.uid || undefined,
        message: userMsg.content,
        image: tempAnalysisImages[0] || tempImages[0] || undefined,
        images: tempAnalysisImages.length > 0 ? tempAnalysisImages : (tempImages.length > 0 ? tempImages : undefined),
        imageDates: tempDates.length > 0 ? tempDates : undefined,
        history: messages.slice(activeSessionIdx).filter(m => !m.id.startsWith('welcome_')).map(m => {
          let extra = "";
          if (m.role === 'assistant') {
            if (m.data?.pendingBiomarkers) extra += `
[Extracted Biomarkers: ${JSON.stringify(m.data?.pendingBiomarkers)}]`;
            if (m.data?.pendingFoodLog) {
               extra += `
[Extracted Food: ${m.data?.pendingFoodLog.name}, ${m.data?.pendingFoodLog.quantity}, ${m.data?.pendingFoodLog.nutrients?.calories || 0} kcal. (Full nutrient data omitted for brevity)]`;
            }
            if (m.pendingDate) extra += `
[Extracted Date: ${m.pendingDate}]`;
            if (m.pendingProfile) extra += `
[Extracted Profile: ${JSON.stringify(m.pendingProfile)}]`;
          }
          return { role: m.role, content: m.content + extra };
        }),
        userProfile: lightProfile,
        engine: selectedModelId
      };
      
      // Clean up undefined fields
      Object.keys(bodyData).forEach(key => {
        if (bodyData[key] === undefined) delete bodyData[key];
      });


      if (isAgent('front_desk')) {
        bodyData.profile = bodyData.userProfile;
        bodyData.biomarkers = biomarkers;
        bodyData.biomarkerHistory = activeHistory.slice(-40);
        bodyData.foodLogs = (foodLogs || []).map(f => ({ name: f.name, date: f.date, nutrients: f.nutrients }));
      }
      if (compareOnly) {
         bodyData.compareOnly = true;
         bodyData.compareItems = compareItems;
      }

      if (isAgent('food')) {
        const lastFoodLog = [...messages].reverse().find(m => m.data?.pendingFoodLog)?.pendingFoodLog;
        if (lastFoodLog) {
          bodyData.activeMeal = lastFoodLog;
        }
        
        // Pass the active scout items to the backend so the Dietitian can resolve warnings
        const lastScoutMsg = [...messages].reverse().find(m => m.data?.scoutItems && m.data.scoutItems.length > 0);
        if (lastScoutMsg) {
          bodyData.activeScoutItems = lastScoutMsg.data.scoutItems;
        }
        
        bodyData.foodLogs = (activeFoodLogs || []).map(f => ({ name: f.name, date: f.date, nutrients: f.nutrients }));
        bodyData.biomarkersNeedingImprovement = outOfRangeBiomarkers.map(b => `${b.name} is ${getBiomarkerStatusLabel(b.key, b.status, profile?.customBiomarkers?.[b.key], b.value, profile).toUpperCase()} (${b.value} ${b.unit}, normal range: ${b.normalRange})`);
        bodyData.remainingAllowance = {
          calories: remainingAllowance.calories,
          caloriesTarget: remainingAllowance.caloriesTarget,
          saturatedFat: remainingAllowance.saturatedFat,
          saturatedFatTarget: remainingAllowance.saturatedFatTarget,
          sodium: remainingAllowance.sodium,
          sodiumTarget: remainingAllowance.sodiumTarget,
          addedSugar: remainingAllowance.addedSugar,
          addedSugarTarget: remainingAllowance.addedSugarTarget,
          carbohydrates: remainingAllowance.carbohydrates,
          carbohydratesTarget: remainingAllowance.carbohydratesTarget,
          solubleFibre: remainingAllowance.solubleFibre,
          solubleFibreTarget: remainingAllowance.solubleFibreTarget,
          protein: remainingAllowance.protein,
          proteinTarget: remainingAllowance.proteinTarget,
          potassium: remainingAllowance.potassium,
          potassiumTarget: remainingAllowance.potassiumTarget,
          unsaturatedFat: remainingAllowance.unsaturatedFat,
          unsaturatedFatTarget: remainingAllowance.unsaturatedFatTarget,
        };
      } else if (isAgent('daily_recommendation')) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${currentYear}-${currentMonth}`;

        // Filter food logs for this month
        const thisMonthFoodLogs = (activeFoodLogs || []).filter(f => f.date && f.date.startsWith(monthPrefix));

        // Group by day
        const dailyNutrientIntake: { [date: string]: { [nutrient: string]: number } } = {};
        thisMonthFoodLogs.forEach(log => {
          const d = log.date;
          if (!dailyNutrientIntake[d]) {
            dailyNutrientIntake[d] = {
              calories: 0,
              protein: 0,
              saturatedFat: 0,
              sodium: 0,
              carbohydrates: 0,
              totalFat: 0
            };
          }
          const nut = (log.nutrients || {}) as any;
          dailyNutrientIntake[d].calories += Number(nut.calories || 0);
          dailyNutrientIntake[d].protein += Number(nut.protein || 0);
          dailyNutrientIntake[d].saturatedFat += Number(nut.saturatedFat || 0);
          dailyNutrientIntake[d].sodium += Number(nut.sodium || 0);
          dailyNutrientIntake[d].carbohydrates += Number(nut.carbohydrates || 0);
          dailyNutrientIntake[d].totalFat += Number(nut.totalFat || 0);
        });

        const emailSuffix = profile?.email ? `_${profile.email.toLowerCase().trim()}` : '_guest';
        const stepsHistoryStr = localStorage.getItem(`googleStepsHistory${emailSuffix}`);
        let stepsHistory: { date: string, value: number }[] = [];
        if (stepsHistoryStr) {
          try {
            stepsHistory = JSON.parse(stepsHistoryStr);
          } catch (e) {}
        }
        const thisMonthSteps = stepsHistory.filter(h => h.date && h.date.startsWith(monthPrefix));

        bodyData.foodLogs = (activeFoodLogs || []).map(f => ({ name: f.name, date: f.date, nutrients: f.nutrients }));
        bodyData.biomarkers = biomarkers;
        bodyData.report = report;
        bodyData.actions = actions;
        bodyData.steps = googleSteps;
        bodyData.location = loc;
        bodyData.thisMonthTrends = {
          dailyNutrientIntake,
          stepsHistory: thisMonthSteps
        };
      } else if (isAgent('health_baseline')) {
        bodyData.biomarkerHistory = activeHistory;
        bodyData.outOfRangeBiomarkers = outOfRangeBiomarkers;
        bodyData.calibratedInsights = getAllAgentCalibrations();
      } else if (isAgent('food_idea')) {
        bodyData.location = loc;
        bodyData.recentMeals = (activeFoodLogs || []).slice(-20).map(f => f.name);
        bodyData.budget = budget;
        bodyData.currency = currency;
        bodyData.maxDistance = maxDistance;
        bodyData.outOfRangeBiomarkers = outOfRangeBiomarkers;
        bodyData.biomarkersNeedingImprovement = outOfRangeBiomarkers.map(b => `${b.name} is ${getBiomarkerStatusLabel(b.key, b.status, profile?.customBiomarkers?.[b.key], b.value, profile).toUpperCase()} (${b.value} ${b.unit}, normal range: ${b.normalRange})`);
        
        // Fetch real places from Overpass API (client-side bypasses container blocks)
        if (loc) {
          try {
            const radius = Math.min(Number(maxDistance) * 1000, 5000);
            const overpassQuery = `[out:json];(node["amenity"~"restaurant|cafe|fast_food|food_court"](around:${radius},${loc.lat},${loc.lng}););out 30;`;
            const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: "data=" + encodeURIComponent(overpassQuery)
            });
            if (overpassRes.ok) {
              const overpassData = await overpassRes.json();
              if (overpassData && overpassData.elements && overpassData.elements.length > 0) {
                bodyData.clientNearbyPlaces = overpassData.elements
                  .filter((e: any) => e.tags && e.tags.name)
                  .map((e: any) => ({
                    name: e.tags.name,
                    lat: e.lat,
                    lng: e.lon,
                    address: e.tags['addr:street'] ? `${e.tags['addr:street']} ${e.tags['addr:housenumber'] || ''}` : '',
                    opening_hours: e.tags['opening_hours'] || '--'
                  }));
              }
            }
          } catch (e) {
            console.warn("Client side Overpass fetch failed:", e);
          }
        }
      } else if (isAgent('medical')) {
        bodyData.existingBiomarkers = Array.from(new Set([...(biomarkers ? Object.keys(biomarkers) : []), ...Object.keys(profile?.customBiomarkers || {})]));
        bodyData.numberOfBatches = numberOfBatches;
        const lastMsg = [...messages].reverse().find(m => m.lastProcessedItem !== undefined);
        if (lastMsg && lastMsg.lastProcessedItem) {
          bodyData.lastProcessedItem = lastMsg.lastProcessedItem;
        }
        if (agentType) {
          let currentStep = 'agent1_step1';
          if (agentType === 'agent1') {
            if (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined) {
              currentStep = 'agent1';
            } else {
              // New user-typed text queries must ALWAYS start fresh at Step 1
              currentStep = 'agent1_step1';
            }
            
            // Also find and attach extractedYaml and bucketMapping if available
            const yamlMsg = [...messages].reverse().find(m => m.data?.agentResult?.extractedYaml || m.extractedYaml);
            if (yamlMsg) {
              bodyData.extractedYaml = yamlMsg.agentResult?.extractedYaml || yamlMsg.extractedYaml;
            } else if (extractedYaml && extractedYaml.length > 0) {
              bodyData.extractedYaml = extractedYaml;
            }
            
            if (remainingText) {
              bodyData.remainingText = remainingText;
            }
            if (currentBatch > 1) {
              bodyData.currentBatch = currentBatch;
            }
            if (estimatedTotalMarkers !== null) {
              bodyData.estimatedTotalMarkers = estimatedTotalMarkers;
            }
            
            const allUserText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
            if (allUserText) {
              bodyData.originalReportText = allUserText;
            }
            
            const mapMsg = [...messages].reverse().find(m => m.data?.agentResult?.bucketMapping || m.data?.bucketMapping);
            if (mapMsg) {
              bodyData.bucketMapping = typeof (mapMsg.agentResult?.bucketMapping || mapMsg.bucketMapping) === 'string'
                ? (mapMsg.agentResult?.bucketMapping || mapMsg.bucketMapping)
                : JSON.stringify(mapMsg.agentResult?.bucketMapping || mapMsg.bucketMapping);
            }
          } else {
            currentStep = agentType;
          }
          bodyData.agentType = currentStep;
          const deletedIds = profile?.deletedBiomarkerLogIds || {};
          bodyData.biomarkerHistory = (biomarkerHistory || []).filter(h => h.sync_state !== 'delete' && !deletedIds[h.id]);
          bodyData.biomarkers = biomarkers || {};
          bodyData.actions = actions || [];
          bodyData.agentDiagnosticSummary = profile?.agentDiagnosticSummary || '';

          if ((currentStep === 'data_review' || currentStep === 'agent1') && dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined) {
            let batchKeys: string[] = [];
            if (dataReviewBatchIdx === 'custom') {
              try {
                const batchKeyName = `agent1_custom_batch_keys_${userIdentifier}`;
                batchKeys = JSON.parse(localStorage.getItem(batchKeyName) || '[]');
              } catch(e) {}
            } else if (dataReviewBatchKeys && dataReviewBatchKeys.length > 0) {
              batchKeys = dataReviewBatchKeys;
            } else {
              const markerKeysList = Object.keys(biomarkers || {}).filter(k => biomarkers?.[k] !== undefined && biomarkers?.[k] !== null && biomarkers?.[k] !== '');
              const bSize = localBatchSize || batchSize || 20;
              const batchRes: string[][] = [];
              for (let i = 0; i < markerKeysList.length; i += bSize) {
                batchRes.push(markerKeysList.slice(i, i + bSize));
              }
              batchKeys = batchRes[dataReviewBatchIdx as number] || [];
            }
            bodyData.batchBiomarkers = batchKeys.map(k => {
              const customDef = profile?.customBiomarkers?.[k];
              const stdDef = biomarkerDefinitions.find(d => d.key === k);
              const displayName = customDef?.name || stdDef?.name || k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              return {
                key: k,
                name: displayName,
                value: biomarkers?.[k],
                unit: customDef?.unit || stdDef?.unit || ''
              };
            });
            bodyData.batchIdx = dataReviewBatchIdx;

            // Unit Enforcement Check
            if (currentStep === 'data_review') {
              const missing = bodyData.batchBiomarkers.filter((bm: any) => !bm.unit || bm.unit.trim() === '');
              if (missing.length > 0) {
                const names = missing.map((bm: any) => bm.name).join(', ');
                throw new Error(`The following biomarkers in this batch are missing clinical units: ${names}. Please configure their units in the Reference Ranges / Calibration tab under Insights before executing calibration.`);
              }
            }
          }
        }
      }

      const storageKey = isAgent('food') ? 'food' : (isAgent('food_idea') ? 'food_idea' : (agentType || 'agent1'));
      const customSystemInstruction = localStorage.getItem(`custom_system_instruction_${storageKey}`);
      const customVariableData = localStorage.getItem(`custom_variable_data_${storageKey}`);
      if (customSystemInstruction) {
        bodyData.customSystemInstruction = customSystemInstruction;
      }
      if (customVariableData) {
        bodyData.customVariableData = customVariableData;
      }

      // Save display-friendly payload for debug mode
      const displayPayload = { ...bodyData };
      if (displayPayload.image && typeof displayPayload.image === 'string') {
        displayPayload.image = displayPayload.image.substring(0, 100) + "... [truncated base64]";
      }
      if (displayPayload.images && Array.isArray(displayPayload.images)) {
        displayPayload.images = displayPayload.images.map((img: any) => typeof img === 'string' ? img.substring(0, 100) + "... [truncated base64]" : img);
      }
      setLastSentPayload(displayPayload);

      let fetchEndpoint = endpoint;
      if (endpoint === '/api/gemini/food-analyze' || endpoint === '/api/gemini/health-baseline-analyze' || endpoint === '/api/gemini/medical-analyze') {
        fetchEndpoint += '?stream=true';
      }

      const response = await fetch(fetchEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': currentReqId
        },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const rawText = await response.text().catch(() => '');
        const looksLikeTimeout = response.status === 504 || response.status === 502 || response.status === 503 || rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.trim().toLowerCase().startsWith('<html');
        throw new Error(looksLikeTimeout
          ? "This analysis took too long and the server timed out. Please try again — if it keeps happening, it may need a longer server timeout setting."
          : `Request failed (${response.status}). Please try again.`);
      }

      const contentType = response.headers.get("content-type");
      let resData: any = {};
      if (contentType && contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No stream reader available");
        const decoder = new TextDecoder();
        const accumulatedByStage: Record<string, string> = { scout: "", dietitian: "" };
        let lineBuffer = "";
        const extractScratchpadText = (accumulated: string) => {
          const match = accumulated.match(/["'](?:scoutScratchpad|dietitianScratchpad|scratchpad)["']\s*:\s*"/i);
          if (!match || match.index === undefined) return "";
          
          const startQuoteIndex = match.index + match[0].length - 1;
          
          let text = "";
          let escaped = false;
          for (let i = startQuoteIndex + 1; i < accumulated.length; i++) {
            const char = accumulated[i];
            if (escaped) {
              if (char === 'n') text += '\n';
              else if (char === 't') text += '\t';
              else if (char === 'r') text += '\r';
              else text += char;
              escaped = false;
            } else if (char === '\\') {
              escaped = true;
            } else if (char === '"') {
              if (accumulated.length - i > 30) {
                 text += "\n\n[Building structured JSON items...]";
              }
              return text;
            } else {
              text += char;
            }
          }
          return text;
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          // Process only complete SSE events (delimited by \n\n) from the accumulated buffer
          let separatorIdx: number;
          while ((separatorIdx = lineBuffer.indexOf("\n\n")) !== -1) {
            const ev = lineBuffer.substring(0, separatorIdx);
            lineBuffer = lineBuffer.substring(separatorIdx + 2);
            if (ev.startsWith("data: ")) {
              try {
                const data = JSON.parse(ev.slice(6));
                if (data.type === 'status') {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) {
                      const updatedData = lastMsg.data ? { ...lastMsg.data } : {};
                      const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {};
                      updatedAgentResult.activeStage = data.stage;
                      updatedAgentResult.stageStatus = data.status;
                      return [
                        ...newMsgs.slice(0, newMsgs.length - 1),
                        { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } }
                      ];
                    }
                    return prev;
                  });
                } else if (data.type === 'log') {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) {
                      const updatedData = lastMsg.data ? { ...lastMsg.data } : {};
                      const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {};
                      if (data.logType === 'scout_instruction') updatedAgentResult.scoutInstruction = data.message;
                      if (data.logType === 'scout_answer') {
                        updatedAgentResult.scoutAnswer = data.message;
                        if (data.items) updatedAgentResult.scoutItemsList = data.items;
                      }
                      if (data.logType === 'db_search') updatedAgentResult.dbSearchLog = data.message;
                      if (data.logType === 'db_search_complete') updatedAgentResult.dbSearchLog = (updatedAgentResult.dbSearchLog ? updatedAgentResult.dbSearchLog + "\n" : "") + data.message;
                      if (data.logType === 'dietitian_instruction') updatedAgentResult.dietitianInstruction = data.message;
                      if (data.logType === 'dietitian_answer') updatedAgentResult.dietitianAnswer = data.message;

                      return [
                        ...newMsgs.slice(0, newMsgs.length - 1),
                        { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } }
                      ];
                    }
                    return prev;
                  });
                } else if (data.chunk || data.thought || data.type === 'stream') {
                  const stage: string = data.stage === 'scout' ? 'scout' : 'dietitian';
                  const chunkText = data.chunk || data.thought || '';
                  if (data.thought) {
                    setLiveThoughts(prev => ({ ...prev, [stage]: (prev[stage] || "") + chunkText }));
                    setMessages(prev => {
                      const newMsgs = [...prev];
                      const lastMsg = newMsgs[newMsgs.length - 1];
                      if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) {
                        const updatedData = lastMsg.data ? { ...lastMsg.data } : {};
                        const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {};
                        updatedAgentResult[`${stage}Scratchpad`] = (updatedAgentResult[`${stage}Scratchpad`] || "") + chunkText;
                        return [
                          ...newMsgs.slice(0, newMsgs.length - 1),
                          { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } }
                        ];
                      }
                      return prev;
                    });
                  } else if (data.chunk) {
                    accumulatedByStage[stage] += data.chunk;
                    const text = extractScratchpadText(accumulatedByStage[stage]);
                    if (text) {
                      setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) {
                          const updatedData = lastMsg.data ? { ...lastMsg.data } : {};
                          const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {};
                          updatedAgentResult[`${stage}Scratchpad`] = text;
                          return [
                            ...newMsgs.slice(0, newMsgs.length - 1),
                            { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } }
                          ];
                        }
                        return prev;
                      });
                      setLiveThoughts(prev => ({ ...prev, [stage]: text }));
                    }
                  }
                } else if (data.final) {
                  resData = data.result;
                }
              } catch (e) { /* ignore malformed events */ }
            }
          }
        }
        // Flush any remaining complete event left in the buffer after the stream closes
        if (lineBuffer.startsWith("data: ")) {
          try {
            const data = JSON.parse(lineBuffer.slice(6));
            if (data.final) resData = data.result;
          } catch (e) {}
        }
      } else {
        resData = await response.json();
      }

      // Capture agent debug logs for this request now that it has fully finished
      // (moved here from right after the initial fetch, which resolved too early
      // for streamed requests and captured an incomplete/empty log snapshot).
      try {
        const logsRes = await fetch(`/api/gemini/debug-logs?sessionId=${currentReqId}`);
        if (logsRes.ok) {
           const logsData = await logsRes.json();
           if (logsData && logsData.logs && logsData.logs.length > 0) {
              const summary = [
                selectedImages.length > 0 ? `[${selectedImages.length} Image(s)]` : null,
                textToSend ? (textToSend.length > 50 ? textToSend.substring(0, 50) + '...' : textToSend) : null
              ].filter(Boolean).join(' ') || 'Empty Request';
              saveAgentRequestLog({
                 id: currentReqId,
                 timestamp: new Date().toISOString(),
                 summary,
                 logs: logsData.logs
              });
           }
        }
      } catch (e) {
        console.warn("Could not save agent request logs", e);
      }

      if (resData.error) throw new Error(resData.error);

      // Deduct agent credits upon successful response
      if (profile) {
        const updatedProfile = deductAgentCredits(profile, selectedModelId);
        if (onSaveProfile) {
          await onSaveProfile(updatedProfile);
        }
      }

      if (bodyData.batchBiomarkers && !resData.batchBiomarkers) {
        resData.batchBiomarkers = bodyData.batchBiomarkers;
      }

      let messageText = resData.message || resData.text || '';
      if (!messageText || (typeof messageText === 'string' && messageText.trim().startsWith('{'))) {
        if (resData.report?.globalSummary) {
          messageText = resData.report.globalSummary;
        } else if (resData.globalSummary) {
          messageText = resData.globalSummary;
        } else if (resData.explanation) {
          messageText = resData.explanation;
        } else if (resData.report?.scratchpad) {
          messageText = resData.report.scratchpad;
        } else if (resData.scratchpad) {
          messageText = resData.scratchpad;
        }
      }

      if (resData.updatedProfile && onSaveProfile) {
        onSaveProfile(resData.updatedProfile);
      }
      if (resData.newBiomarkerLogs && resData.newBiomarkerLogs.length > 0 && onAddBiomarkerLogs) {
        onAddBiomarkerLogs(resData.newBiomarkerLogs);
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: messageText,
        timestamp: new Date().toISOString(),
        agentResult: resData,
      };
      
      if (isAgent('food')) {
        assistantMsg.agentType = 'food';
        
        // Always initialize default data structure to preserve scratchpads across all modes (including discussion)
        assistantMsg.data = {
          hasImage: selectedImages.length > 0,
          scoutItems: resData.scoutItems || [],
          scoutContentType: resData.scoutContentType,
          agentResult: {
            scoutScratchpad: resData.scoutScratchpad || '',
            dietitianScratchpad: resData.dietitianScratchpad || ''
          }
        };
        if (resData.data) {
          const lastFoodLog = [...messages].reverse().find(m => m.data?.pendingFoodLog)?.pendingFoodLog;
          const currentTranscript = [...messages, userMsg, assistantMsg].map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp
          }));
          const newFoodLog = {
            ...resData.data,
            date: resData.data.date || lastFoodLog?.date || getCurrentDateInTimezone(profile?.timezone),
            id: `food_${Date.now()}`,
            imageUrl: tempImages.length > 0 ? tempImages[0] : resData.data.imageUrl,
            imageUrls: tempImages.length > 0 ? tempImages : resData.data.imageUrls,
            chatTranscript: currentTranscript
          };
          assistantMsg.data.pendingFoodLog = newFoodLog;
          assistantMsg.pendingFoodLog = newFoodLog;
        } else if (resData.mode === 'evaluation') {
          let carryOverScoutItems = resData.scoutItems || [];
          if (compareOnly && sourceMsgId) {
             const sourceMsg = messages.find(m => m.id === sourceMsgId);
             if (sourceMsg?.data?.scoutItems) {
                carryOverScoutItems = sourceMsg.data.scoutItems;
             }
          }
          assistantMsg.data.comparison = resData.comparison;
          assistantMsg.data.scoutItems = carryOverScoutItems;
        } else if (resData.mode === 'origin') {
          assistantMsg.data.mode = 'origin';
          assistantMsg.data.origins = resData.origins || [];
        }
      } else if (isAgent('food_idea')) {
        assistantMsg.agentType = 'food_idea';
        if (resData.ideas && resData.ideas.length > 0) {
          assistantMsg.data = { pendingFoodIdeas: resData.ideas };
          assistantMsg.pendingFoodIdeas = resData.ideas;
        }
      } else {
        const activeAgentType = (agentType || resData.agentType || (resData.extractedYaml && resData.extractedYaml.trim() && resData.extractedYaml.trim() !== '[]' ? 'agent1' : null)) as string | null;
        if (activeAgentType) {
          assistantMsg.agentType = (activeAgentType === 'agent1_step1' ? 'agent1' : activeAgentType) as AgentType;
          assistantMsg.agentResult = resData;
          if (activeAgentType === 'agent1' || activeAgentType === 'agent1_step1') {
            assistantMsg.agentTypeStep = resData.agentType || 'agent1_step1';
          const originalReport = bodyData.originalReportText || bodyData.message;
          if (originalReport) {
            localStorage.setItem('agent1_original_report_text', originalReport);
          }
          }
          if (onAgentAnalysisSaved && agentType) {
            await onAgentAnalysisSaved(agentType, resData);
          }
        } else {
          assistantMsg.mode = resData.mode;
          assistantMsg.status = resData.status;
          assistantMsg.planningDetails = resData.planningDetails;
          assistantMsg.lastProcessedItem = resData.lastProcessedItem;
          assistantMsg.modificationCommand = resData.modificationCommand;
          assistantMsg.pendingBiomarkerEntries = resData.entries || [];
          // Legacy fallback
          assistantMsg.pendingBiomarkers = resData.biomarkers;
          assistantMsg.pendingDate = resData.date;
          
          // Merge custom biomarker definitions into profile if any
          let mergedProfile = { ...resData.profile };
          let defsWithApproval: { [key: string]: any } = {};

          if (resData.customBiomarkerDefs && Object.keys(resData.customBiomarkerDefs).length > 0) {
            Object.entries(resData.customBiomarkerDefs).forEach(([k, v]: [string, any]) => {
              defsWithApproval[k] = { ...v, needsApproval: true };
            });
          }

          if (resData.unmappedTests && Array.isArray(resData.unmappedTests)) {
            resData.unmappedTests.forEach((test: any) => {
              if (!test) return;
              const raw_name = test.raw_name || (typeof test === 'string' ? test : '');
              if (!raw_name) return;
              const suggested_key = test.suggested_key || raw_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
              if (!defsWithApproval[suggested_key]) {
                defsWithApproval[suggested_key] = {
                  name: raw_name,
                  unit: '',
                  normalRange: '',
                  description: '',
                  standardMedicalGrouping: 'By Medical Practice',
                  needsApproval: true
                };
              }
            });
          }

          if (Object.keys(defsWithApproval).length > 0) {
            mergedProfile.customBiomarkers = {
              ...(profile?.customBiomarkers || {}),
              ...defsWithApproval
            };
          }
          assistantMsg.pendingProfile = mergedProfile;
        }
      }

      const migratedAssistantMsg = migrateMessages([assistantMsg])[0];

      setMessages(prev => {
        const filteredPrev = prev.filter(m => !m.isLive);
        if (isAgent('food') && resData.mode === 'modify' && (resData.data || (resData.scoutItems && resData.scoutItems.length > 0))) {
          let newPrev = [...filteredPrev];

          if (resData.data) {
            // Check if this food was already saved to database history
            const targetMsg = [...filteredPrev].reverse().find(m => m.data?.pendingFoodLog);
            const wasLogged = targetMsg ? loggedMessageIds.includes(targetMsg.id) : false;
            if (wasLogged && targetMsg?.data?.pendingFoodLog) {
              // Automatically mark the modified card message as logged too
              setLoggedMessageIds(prevIds => [...prevIds, migratedAssistantMsg.id]);
              // Automatically trigger the log update handler to push modifications to database
              if (onLogFood) {
                onLogFood({
                  ...targetMsg.data.pendingFoodLog,
                  ...resData.data
                } as FoodLog);
              }
            }

            let updated = false;
            newPrev = [...newPrev].reverse().map(m => {
              if (!updated && m.data?.pendingFoodLog) {
                updated = true;
                return {
                  ...m,
                  data: {
                    ...m.data,
                    pendingFoodLog: {
                      ...m.data?.pendingFoodLog,
                      ...resData.data,
                      dietitianUpdateSentence: resData.text || resData.message || m.data?.pendingFoodLog?.dietitianUpdateSentence
                    }
                  }
                };
              }
              return m;
            }).reverse();
          }

          if (resData.scoutItems && resData.scoutItems.length > 0) {
            // A correction was resolved for a previously flagged item (text correction
            // or new photo). MODE C intentionally returns foodData=null when no full
            // recompute is needed, so this must run independently of the pendingFoodLog
            // merge above — otherwise the corrected scoutItems array is silently
            // dropped and "Items in Review" / the thumbnail keep showing the stale item.
            let scoutUpdated = false;
            newPrev = [...newPrev].reverse().map(m => {
              if (!scoutUpdated && m.data?.scoutItems && m.data.scoutItems.length > 0) {
                scoutUpdated = true;
                return { ...m, data: { ...m.data, scoutItems: resData.scoutItems } };
              }
              return m;
            }).reverse();
          }

          // Clear the pending food log from the new assistant message so it doesn't render a duplicate card
          if (migratedAssistantMsg.data) {
            migratedAssistantMsg.data.pendingFoodLog = null;
          }
          return [...newPrev, migratedAssistantMsg];
        }
        return [...filteredPrev, migratedAssistantMsg];
      });
    } catch (err: any) {
      console.error(err);
      if (isAgent('food')) {
        setMessages(prev => [
          ...prev.filter(m => !m.isLive),
          {
            id: `msg_err_${Date.now()}`,
            role: 'assistant',
            content: `The food log agent is not available. Please enter the food details manually.`,
            timestamp: new Date().toISOString(),
            agentUnavailable: true
          }
        ]);
        if (onGoToManualEdit) {
          setTimeout(() => {
            onGoToManualEdit("The AI agent is not available. Please enter the food details manually.");
          }, 800);
        }
      } else {
        const isQuota = err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("RESOURCE_EXHAUSTED");
        setMessages(prev => [
          ...prev.filter(m => !m.isLive),
          {
            id: `msg_err_${Date.now()}`,
            role: 'assistant',
            content: isQuota ? `You have exceeded your Gemini API quota limit. Please check your billing or try again later.` : `Error running analysis: ${err.message || 'Server connection timed out.'}`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setIsAnalyzing(false);
      setActiveReqId(null);
    }
  };

  const autoSendHandledRef = useRef(false);

  useEffect(() => {
    if (isOpen && autoSendMessage && !autoSendHandledRef.current && (isAgent('medical') || isAgent('daily_recommendation'))) {
      if (agentType === 'agent1' || agentType === 'agent2' || agentType === 'agent3' || agentType === 'agent4' || agentType === 'agent5' || agentType === 'agent7') {
        return;
      }
      if (agentType === 'data_review') {
        setInputText(autoSendMessage);
        autoSendHandledRef.current = true;
        return;
      }
      const alreadySent = messages.some(m => m.role === 'user');
      if (!alreadySent) {
        autoSendHandledRef.current = true;
        const timer = setTimeout(() => {
          handleSend(autoSendMessage);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoSendMessage, type, messages, agentType]);

  const handleContinueExtractionChunk = async (msg: any) => {
    setIsAnalyzing(true);
    // Scroll immediately so the user can watch the agent's live thought process
    // as soon as the request starts, instead of waiting for the final answer.
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    try {
      const msgIndex = messages.findIndex(m => m.id === msg.id);
      const allUserText = messages.slice(0, msgIndex).filter(m => m.role === 'user').map(m => m.content).join('\n\n');
      const nextBatch = (msg.data?.agentResult?.currentBatch || 1) + 1;

      const lightProfile = profile ? { ...profile } as any : null;
      if (lightProfile) {
        delete lightProfile.fontSizeTitle;
        delete lightProfile.fontSizeSubtitle;
        delete lightProfile.fontSizeSubtitleSmall;
        delete lightProfile.fontSizeBodySmall;
        delete lightProfile.fontSizeXS;
        delete lightProfile.fontSizeKeyMetric;
        delete lightProfile.fontSizeDescription;
        delete lightProfile.photoUrl;
        delete lightProfile.timezone;
        delete lightProfile.language;
        delete lightProfile.deletedBiomarkerLogIds;
        delete lightProfile.deletedFoodLogIds;
      }

      const bodyData: any = {
        agentType: 'agent1_step1',
        message: `continue. CRITICAL: Do NOT map a test to an existing key if it is not a perfect match. Do not use surrogate markers. If a test does not have a perfect match in the EXISTING DATABASE KEYS, you MUST extract it as a new biomarker with a lowercase snake_case key (e.g., 'pulse_rate'). Do not generate empty or null entries for tests that are not present in the text.`,
        originalReportText: allUserText,
        currentBatch: nextBatch,
        extractedYaml: msg.data?.agentResult?.extractedYaml || msg.extractedYaml,
        remainingText: msg.data?.agentResult?.remainingText || '',
        estimatedTotalMarkers: msg.data?.agentResult?.estimatedTotalMarkers,
        numberOfBatches: numberOfBatches,
        engine: selectedModelId,
        userProfile: lightProfile
      };

      trackApiCall('gemini', `Medical Analyze - ${agentType}`);
      const currentReqId = generateQueryId();
      setActiveQueryId(currentReqId);

      const response = await fetch('/api/gemini/medical-analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': currentReqId
        },
        body: JSON.stringify(bodyData)
      });

      try {
        const logsRes = await fetch(`/api/gemini/debug-logs?sessionId=${currentReqId}`);
        if (logsRes.ok) {
           const logsData = await logsRes.json();
           if (logsData && logsData.logs && logsData.logs.length > 0) {
              saveAgentRequestLog({
                 id: currentReqId,
                 timestamp: new Date().toISOString(),
                                   summary: `[Medical Analyze] Batch ${nextBatch} (Continue)`,
                  logs: logsData.logs
               });
            }
         }
      } catch (e) {
        console.warn("Could not save agent request logs", e);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      const contentType = response.headers.get("content-type"); let resData: any = {}; if (contentType && contentType.includes("text/event-stream")) { const reader = response.body?.getReader(); if (!reader) throw new Error("No stream reader available"); const decoder = new TextDecoder(); let accumulatedText = ""; let accumulatedByStage: { scout: string, dietitian: string } = { scout: "", dietitian: "" }; while (true) { const { done, value } = await reader.read(); if (done) break; const chunkStr = decoder.decode(value, { stream: true }); const events = chunkStr.split("\n\n"); for (const ev of events) { if (ev.startsWith("data: ")) { try { const data = JSON.parse(ev.slice(6)); if (data.chunk) { accumulatedText += data.chunk; const stage: string = data.stage === 'scout' ? 'scout' : 'dietitian'; accumulatedByStage[stage as keyof typeof accumulatedByStage] += data.chunk; const scoutMatch = accumulatedByStage.scout.match(/"scratchpad"\s*:\s*"([^]*?)("|$)/); const dietMatch = accumulatedByStage.dietitian.match(/"scratchpad"\s*:\s*"([^]*?)("|$)/); setMessages(prev => { const newMsgs = [...prev]; const lastMsg = newMsgs[newMsgs.length - 1]; if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) { const updatedData = lastMsg.data ? { ...lastMsg.data } : {}; const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {}; let hasChanges = false; if (scoutMatch) { updatedAgentResult.scoutScratchpad = scoutMatch[1].replace(/\\n/g, "\n").replace(/\\\"/g, "\""); hasChanges = true; } if (dietMatch) { updatedAgentResult.dietitianScratchpad = dietMatch[1].replace(/\\n/g, "\n").replace(/\\\"/g, "\""); hasChanges = true; } if (hasChanges) { return [ ...newMsgs.slice(0, newMsgs.length - 1), { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } } ]; } } return prev; }); } else if (data.final) { resData = data.result; } } catch (e) {} } } } } else { resData = await response.json(); }

      setMessages(prev => prev.map(m => {
        if (m.id === msg.id) {
          // Parse old YAML entries
          const oldYamlStr = m.data?.agentResult?.extractedYaml || '';
          let oldEntries: any[] = [];
          if (oldYamlStr) {
            try {
              let oldParsed = oldYamlStr;
              if (typeof oldYamlStr === 'string') {
                const cleanedOld = oldYamlStr.replace(/```(?:yaml|yml|json)?/gi, '').trim();
                try {
                  oldParsed = JSON.parse(cleanedOld);
                } catch(e) {
                  oldParsed = parse(cleanedOld);
                }
              }
              oldEntries = Array.isArray(oldParsed) 
                ? oldParsed 
                : (oldParsed?.biomarkers || oldParsed?.entries || oldParsed?.data || []);
              if (!Array.isArray(oldEntries)) oldEntries = [];
            } catch (e) {
              console.warn("Failed to parse old JSON/YAML", e);
            }
          }

          // Parse new JSON entries
          const newYamlStr = resData.extractedYaml || '';
          let newEntries: any[] = [];
          if (newYamlStr) {
            try {
              let newParsed = newYamlStr;
              if (typeof newYamlStr === 'string') {
                const cleanedNew = newYamlStr.replace(/```(?:yaml|yml|json)?/gi, '').trim();
                try {
                  newParsed = JSON.parse(cleanedNew);
                } catch(e) {
                  newParsed = parse(cleanedNew);
                }
              }
              newEntries = Array.isArray(newParsed) 
                ? newParsed 
                : (newParsed?.biomarkers || newParsed?.entries || newParsed?.data || []);
              if (!Array.isArray(newEntries)) newEntries = [];
            } catch (e) {
              console.warn("Failed to parse new YAML", e);
            }
          }

          // Merge entries and deduplicate
          let combinedEntries = [...oldEntries];
          newEntries.forEach((newE: any) => {
            if (!newE || typeof newE !== 'object') return;
            const newKey = String(newE.biomarker || newE.name || '').trim().toLowerCase();
            const newDate = String(newE.date || '').trim();
            const newVal = String(newE.numeric_value !== undefined && newE.numeric_value !== null ? newE.numeric_value : (newE.qualitative_value || newE.value || '')).trim();
            
            const isDuplicate = oldEntries.some((oldE: any) => {
              if (!oldE || typeof oldE !== 'object') return false;
              const oldKey = String(oldE.biomarker || oldE.name || '').trim().toLowerCase();
              const oldDate = String(oldE.date || '').trim();
              const oldVal = String(oldE.numeric_value !== undefined && oldE.numeric_value !== null ? oldE.numeric_value : (oldE.qualitative_value || oldE.value || '')).trim();
              return oldKey === newKey && oldDate === newDate && oldVal === newVal;
            });
            
            if (!isDuplicate) {
              combinedEntries.push(newE);
            }
          });

          // Convert combined back to JSON
          let combinedYamlStr = resData.extractedYaml || oldYamlStr;
          if (combinedEntries.length > 0) {
            try {
              combinedYamlStr = JSON.stringify(combinedEntries, null, 2);
            } catch (e) {
              console.warn("Failed to stringify combined entries", e);
            }
          }
          
          let combinedUnmappedTests = [
            ...(Array.isArray(m.data?.agentResult?.unmappedTests) ? m.data.agentResult.unmappedTests : []),
            ...(Array.isArray(resData.unmappedTests) ? resData.unmappedTests : [])
          ];
          
          // Deduplicate unmapped tests by raw_name
          const uniqueUnmapped = new Map();
          combinedUnmappedTests.forEach(test => {
            if (test && test.raw_name) {
              uniqueUnmapped.set(test.raw_name, test);
            }
          });
          combinedUnmappedTests = Array.from(uniqueUnmapped.values());

          const updatedMsg = {
            ...m,
            content: resData.text || m.content,
            data: {
              ...m.data,
              agentResult: {
                ...m.data?.agentResult,
                text: resData.text || m.data?.agentResult?.text,
                extractedYaml: combinedYamlStr,
                hasMoreMarkers: resData.hasMoreMarkers,
                remainingText: resData.remainingText || '',
                currentBatch: resData.currentBatch || nextBatch,
                unmappedTests: combinedUnmappedTests,
                estimatedTotalMarkers: resData.estimatedTotalMarkers !== undefined ? resData.estimatedTotalMarkers : m.data?.agentResult?.estimatedTotalMarkers
              }
            }
          };
          return migrateMessages([updatedMsg])[0];
        }
        return m;
      }));
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `Error during chunk extraction: ${err.message}`,
          timestamp: new Date().toISOString(),
          isError: true,
          errorStep: 'agent1_step1',
          originalMsg: msg
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAgent1Step = async (step: 'agent1_step2' | 'agent1_step3', msg: any) => {
    setIsAnalyzing(true);
    // Scroll immediately so the user can watch the agent's live thought process
    // as soon as the request starts, instead of waiting for the final answer.
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    try {
      const lightProfile = profile ? { ...profile } as any : null;
      if (lightProfile) {
        delete lightProfile.fontSizeTitle;
        delete lightProfile.fontSizeSubtitle;
        delete lightProfile.fontSizeSubtitleSmall;
        delete lightProfile.fontSizeBodySmall;
        delete lightProfile.fontSizeXS;
        delete lightProfile.fontSizeKeyMetric;
        delete lightProfile.fontSizeDescription;
        delete lightProfile.photoUrl;
        delete lightProfile.timezone;
        delete lightProfile.language;
        delete lightProfile.deletedBiomarkerLogIds;
        delete lightProfile.deletedFoodLogIds;
      }

      const bodyData: any = {
        agentType: step,
        extractedYaml: msg.data?.agentResult?.extractedYaml || msg.extractedYaml,
        bucketMapping: msg.data?.agentResult?.bucketMapping ? JSON.stringify(msg.data?.agentResult.bucketMapping) : msg.data?.bucketMapping ? JSON.stringify(msg.data?.bucketMapping) : undefined,
        message: "Continue processing",
        engine: selectedModelId,
        userProfile: lightProfile
      };

      // To grab yaml and mapping correctly from previous messages
      if (!bodyData.extractedYaml) {
         const yamlMsg = [...messages].reverse().find(m => m.data?.agentResult?.extractedYaml || m.extractedYaml);
         bodyData.extractedYaml = yamlMsg?.agentResult?.extractedYaml || yamlMsg?.extractedYaml;
      }
      if (step === 'agent1_step3' && !bodyData.bucketMapping) {
         const mapMsg = [...messages].reverse().find(m => m.data?.agentResult?.bucketMapping || m.data?.bucketMapping);
         bodyData.bucketMapping = JSON.stringify(mapMsg?.agentResult?.bucketMapping || mapMsg?.bucketMapping);
      }

      let prevTotalMarkers = msg.data?.agentResult?.estimatedTotalMarkers;
      if (prevTotalMarkers === undefined) {
         const oldMsg = [...messages].reverse().find(m => m.data?.agentResult?.estimatedTotalMarkers !== undefined);
         prevTotalMarkers = oldMsg?.agentResult?.estimatedTotalMarkers;
      }

      const displayPayload = { ...bodyData };
      setLastSentPayload(displayPayload);

      trackApiCall('gemini', `Medical Analyze - ${agentType}`);
      const currentReqId = generateQueryId();
      setActiveQueryId(currentReqId);

      const response = await fetch('/api/gemini/medical-analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': currentReqId
        },
        body: JSON.stringify(bodyData)
      });

      try {
        const logsRes = await fetch(`/api/gemini/debug-logs?sessionId=${currentReqId}`);
        if (logsRes.ok) {
           const logsData = await logsRes.json();
           if (logsData && logsData.logs && logsData.logs.length > 0) {
              saveAgentRequestLog({
                 id: currentReqId,
                 timestamp: new Date().toISOString(),
                                   summary: `[Medical Analyze] Processing Step: ${step}`,
                  logs: logsData.logs
               });
            }
         }
      } catch (e) {
        console.warn("Could not save agent request logs", e);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      const contentType = response.headers.get("content-type"); let resData: any = {}; if (contentType && contentType.includes("text/event-stream")) { const reader = response.body?.getReader(); if (!reader) throw new Error("No stream reader available"); const decoder = new TextDecoder(); let accumulatedText = ""; let accumulatedByStage: { scout: string, dietitian: string } = { scout: "", dietitian: "" }; while (true) { const { done, value } = await reader.read(); if (done) break; const chunkStr = decoder.decode(value, { stream: true }); const events = chunkStr.split("\n\n"); for (const ev of events) { if (ev.startsWith("data: ")) { try { const data = JSON.parse(ev.slice(6)); if (data.chunk) { accumulatedText += data.chunk; const stage: string = data.stage === 'scout' ? 'scout' : 'dietitian'; accumulatedByStage[stage as keyof typeof accumulatedByStage] += data.chunk; const scoutMatch = accumulatedByStage.scout.match(/"scratchpad"\s*:\s*"([^]*?)("|$)/); const dietMatch = accumulatedByStage.dietitian.match(/"scratchpad"\s*:\s*"([^]*?)("|$)/); setMessages(prev => { const newMsgs = [...prev]; const lastMsg = newMsgs[newMsgs.length - 1]; if (lastMsg && lastMsg.role === "assistant" && lastMsg.isLive) { const updatedData = lastMsg.data ? { ...lastMsg.data } : {}; const updatedAgentResult = updatedData.agentResult ? { ...updatedData.agentResult } : {}; let hasChanges = false; if (scoutMatch) { updatedAgentResult.scoutScratchpad = scoutMatch[1].replace(/\\n/g, "\n").replace(/\\\"/g, "\""); hasChanges = true; } if (dietMatch) { updatedAgentResult.dietitianScratchpad = dietMatch[1].replace(/\\n/g, "\n").replace(/\\\"/g, "\""); hasChanges = true; } if (hasChanges) { return [ ...newMsgs.slice(0, newMsgs.length - 1), { ...lastMsg, data: { ...updatedData, agentResult: updatedAgentResult } } ]; } } return prev; }); } else if (data.final) { resData = data.result; } } catch (e) {} } } } } else { resData = await response.json(); }
      
      const assistantMsg: ChatMessage & { agentTypeStep?: string } = {
        id: `msg_agent1_${step}_${Date.now()}`,
        role: 'assistant',
        content: resData.text || 'Processing...',
        timestamp: new Date().toISOString(),
        agentType: 'agent1',
        agentResult:  {
           ...resData,
           extractedYaml: bodyData.extractedYaml,
           bucketMapping: resData.bucketMapping || (bodyData.bucketMapping ? JSON.parse(bodyData.bucketMapping) : undefined),
           estimatedTotalMarkers: prevTotalMarkers !== undefined ? prevTotalMarkers : resData.estimatedTotalMarkers
        },
        agentTypeStep: step
      };

      const migratedAssistantMsg = migrateMessages([assistantMsg])[0];
      setMessages(prev => [...prev, migratedAssistantMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `Error during processing step: ${err.message}`,
          timestamp: new Date().toISOString(),
          isError: true,
          errorStep: step,
          originalMsg: msg
        }
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDuplicateFoodLog = (log: FoodLog) => {
    if (!onLogFood) return;
    const todayDate = getCurrentDateInTimezone(profile?.timezone);
    
    // Save image reference to the primary log to avoid duplicating raw Base64 data in the database
    let resolvedImageUrl = log.imageUrl;
    let resolvedImageUrls = log.imageUrls;

    if (log.imageUrl) {
      const primaryId = log.imageUrl.startsWith('ref:') ? log.imageUrl.replace('ref:', '') : log.id;
      resolvedImageUrl = `ref:${primaryId}`;
    }
    if (log.imageUrls && log.imageUrls.length > 0) {
      const primaryId = log.imageUrls[0].startsWith('ref:') ? log.imageUrls[0].replace('ref:', '') : log.id;
      resolvedImageUrls = [`ref:${primaryId}`];
    }

    const duplicatedLog: FoodLog = {
      ...log,
      id: `food_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      date: todayDate,
      imageUrl: resolvedImageUrl,
      imageUrls: resolvedImageUrls
    };
    onLogFood(duplicatedLog);
    setInputText('');
    setMessages(prev => [
      ...prev,
      {
        id: `msg_dup_${Date.now()}`,
        role: 'assistant',
        content: `Successfully duplicated your previously logged **${log.name}** to today (${todayDate})!`,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animation-fade-in font-sans">
      <div id="food-chat-container" className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl h-[90vh] sm:h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-slate-100 font-display">
                {activeAgentKey === 'data_review' ? `${dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (dataReviewBatchIdx !== null && dataReviewBatchIdx !== undefined ? (dataReviewBatchIdx as number) + 1 : 1)}` : (activeAgentConfig?.displayName || t.addMedical)}
              </h2>
              <button
                type="button"
                onClick={() => setIsEngineSelectorOpen(!isEngineSelectorOpen)}
                className="flex items-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 transition-colors focus:outline-none cursor-pointer"
              >
                <span>{AVAILABLE_LLMS.find(m => m.id === selectedModelId)?.name || selectedModelId}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isEngineSelectorOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFullScreenDebugLogs(true)}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
              title="View Historical Logs"
            >
              <Terminal className="w-5 h-5" />
            </button>
            <button 
              id="close-food-chat-btn"
              onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Model Selector Dropdown */}
        {isEngineSelectorOpen && (
          <div className="px-4 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/25 border-b border-indigo-100 dark:border-indigo-950/40 animation-slide-down">
            <LLMSelector
              selectedModelId={selectedModelId}
              variant="inline"
              onChangeModelId={(id) => {
                onChangeModelId(id);
                setIsEngineSelectorOpen(false);
              }}
            />
          </div>
        )}



        {/* Chat Message Window */}
        <div ref={chatWindowRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
          
          {/* Data used by agent inline block */}
          {(isAgent('food') || isAgent('food_idea') || isAgent('medical')) && (
            <div className="bg-slate-50 dark:bg-slate-900/55 rounded-xl px-4 py-2.5 mb-4 border border-slate-100 dark:border-slate-800/20">
              <button
                type="button"
                onClick={() => setShowDataUsed(!showDataUsed)}
                className="w-full flex items-center justify-between text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold font-sans text-slate-600 dark:text-slate-300">
                  Data used by agent
                </span>
                <div className="flex items-center text-slate-400 dark:text-slate-500">
                  {showDataUsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
              
              {showDataUsed && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3.5 text-slate-600 dark:text-slate-300 font-sans leading-normal">
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        let targetAgent = 'agent1';
                        let targetPrompt = null;
                        if (isAgent('food')) {
                          targetAgent = 'food';
                          const lastMsgWithStep = [...messages].reverse().find(m => m.data?.agentResult?.agentPrompt);
                          targetPrompt = lastMsgWithStep?.agentResult?.agentPrompt || null;
                        }
                        else if (isAgent('food_idea')) {
                          targetAgent = 'food_idea';
                          const lastMsgWithStep = [...messages].reverse().find(m => m.data?.pendingFoodIdeas && m.data?.agentResult?.agentPrompt);
                          targetPrompt = lastMsgWithStep?.agentResult?.agentPrompt || null;
                        }
                        else {
                          const lastMsgWithStep = [...messages].reverse().find(m => m.agentTypeStep || m.agentType);
                          targetAgent = lastMsgWithStep?.agentType || agentType || 'agent1';
                          targetPrompt = lastMsgWithStep?.agentResult?.agentPrompt || null;
                        }
                        
                        setActiveInstructionAgentType(targetAgent);
                        setActiveInstructionPrompt(targetPrompt);
                      }}
                      className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>ℹ️ View Instructions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFullScreenConv(true)}
                      className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                    >
                      <Terminal className="w-4 h-4 text-indigo-500" />
                      <span>📜 View Log History</span>
                    </button>
                  </div>
                  {/* Profile Stats */}
                  <div className="grid grid-cols-2 gap-2.5 font-size-xs bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Demographics</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{(profile?.age) || 'Unknown'} yo • {profile?.gender || 'Unknown'} • {profile?.ethnicity || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Body Metrics</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{profile?.weight || 'Unknown'} kg • {profile?.height || 'Unknown'} cm (BMI: {profile?.weight && profile?.height ? (Number(profile.weight) / Math.pow(Number(profile.height) / 100, 2)).toFixed(1) : 'Unknown'})</span>
                    </div>
                  </div>
                  
                  {isAgent('medical') && (
                    <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                      <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                        <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Items per batch</span>
                        <input 
                            type="number"
                            min="1"
                            max="200"
                            value={numberOfBatches}
                            onChange={(e) => setNumberOfBatches(Math.max(1, Number(e.target.value)))}
                            placeholder="Max items..."
                            className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none"
                        />
                      </div>
                      {dataReviewBatchIdx !== null && (
                        <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Agent Batch Size</span>
                          <input 
                              type="number"
                              value={localBatchSize}
                              onChange={(e) => setLocalBatchSize(Number(e.target.value))}
                              placeholder="Number of items per batch..."
                              className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {isAgent('food_idea') && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Max Budget</span>
                          <input 
                              type="number"
                              value={budget}
                              onChange={(e) => setBudget(e.target.value)}
                              placeholder="Enter budget..."
                              className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none"
                          />
                        </div>
                        <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Currency</span>
                          <select
                              value={currency}
                              onChange={(e) => setCurrency(e.target.value)}
                              className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none border-none p-0 cursor-pointer"
                          >
                            <option value="IDR" className="bg-slate-100 dark:bg-slate-900">IDR (Rp)</option>
                            <option value="GBP" className="bg-slate-100 dark:bg-slate-900">GBP (£)</option>
                            <option value="USD" className="bg-slate-100 dark:bg-slate-900">USD ($)</option>
                            <option value="EUR" className="bg-slate-100 dark:bg-slate-900">EUR (€)</option>
                            <option value="AUD" className="bg-slate-100 dark:bg-slate-900">AUD ($)</option>
                            <option value="SGD" className="bg-slate-100 dark:bg-slate-900">SGD ($)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Max Distance</span>
                          <select
                              value={maxDistance}
                              onChange={(e) => setMaxDistance(parseFloat(e.target.value) || 3)}
                              className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none border-none p-0 cursor-pointer"
                          >
                            <option value="0.5" className="bg-slate-100 dark:bg-slate-900">0.5 km</option>
                            <option value="1" className="bg-slate-100 dark:bg-slate-900">1 km</option>
                            <option value="2" className="bg-slate-100 dark:bg-slate-900">2 km</option>
                            <option value="3" className="bg-slate-100 dark:bg-slate-900">3 km</option>
                            <option value="5" className="bg-slate-100 dark:bg-slate-900">5 km</option>
                            <option value="7" className="bg-slate-100 dark:bg-slate-900">7 km</option>
                            <option value="10" className="bg-slate-100 dark:bg-slate-900">10 km</option>
                          </select>
                        </div>
                        <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                          <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Location</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 truncate block mt-0.5">
                            {userLocation ? `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : '❌ Not available'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                        <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Last 20 Meals</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 max-h-20 overflow-y-auto block whitespace-pre-wrap">
                          {(activeFoodLogs || []).slice(-20).map(f => f.name).join(', ') || 'No meals logged yet'}
                        </span>
                      </div>
                    </>
                  )}

                  {agentType && (
                    <div className="space-y-2">
                      <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                        <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-0.5">Biomarker History Logs</span>
                        <details className="group cursor-pointer">
                          <summary className="font-bold text-slate-700 dark:text-slate-200 select-none">
                            {activeHistory.length || 0} historic logs
                          </summary>
                          <div className="mt-2 text-[10px] font-mono text-slate-500 max-h-32 overflow-y-auto pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                            {activeHistory.map((h, i) => (
                              <div key={i} className="mb-1">{h.date}: {Object.keys(h.biomarkers || {}).length} markers</div>
                            ))}
                          </div>
                        </details>
                      </div>
                      <div className="bg-slate-100/50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/30 font-size-xs">
                        <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-1.5">Checked Biomarker Values ({biomarkers ? Object.keys(biomarkers).length : 0})</span>
                        {biomarkers && Object.keys(biomarkers).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1 max-h-32 overflow-y-auto">
                            {Object.entries(biomarkers || {}).map(([key, value]) => {
                              const def = (profile?.customBiomarkers && profile.customBiomarkers[key]) || biomarkerDefinitions[key] || { name: key, unit: '' };
                              return (
                                <span key={key} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300">
                                  {def.name}: <strong className="text-indigo-600 dark:text-indigo-400">{value}</strong> <span className="text-slate-400">{def.unit}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-450 dark:text-slate-500 italic font-size-xs block mt-1">No biomarker data available.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warning Biomarkers */}
                  {(isAgent('food') || isAgent('food_idea')) && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-1.5">Important Biomarkers Needing Improvement</span>
                      {outOfRangeBiomarkers.length > 0 ? (
                        <div className="space-y-1">
                          {outOfRangeBiomarkers.map(b => (
                            <div key={b.key} className="flex items-center justify-between font-size-xs font-mono bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 px-2 py-1 rounded-lg">
                              <span className="font-sans font-bold text-slate-700 dark:text-slate-300">{b.name}</span>
                              <span className="text-rose-600 dark:text-rose-450 font-black">
                                {b.value} {b.unit} ({getBiomarkerStatusLabel(b.key, b.status, profile?.customBiomarkers?.[b.key], b.value, profile).toUpperCase()})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-450 dark:text-slate-500 italic font-size-xs">All active biomarkers are within normal reference ranges.</span>
                      )}
                    </div>
                  )}

                  {/* Remaining Daily Allowances */}
                  {(isAgent('food') || isAgent('food_idea')) && (
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-bold block font-size-xs uppercase tracking-wider mb-1.5">Today's Remaining Nutrition Allowance</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-slate-100/60 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/40 p-2 rounded-lg">
                          <span className="text-slate-400 font-size-xs block uppercase font-bold tracking-wider mb-0.5">Calories</span>
                          <span className="font-mono font-size-xs font-bold text-slate-800 dark:text-slate-200">
                            {remainingAllowance.calories} <span className="font-size-xs text-slate-400">kcal</span>
                          </span>
                          <span className="font-size-xs text-slate-400 dark:text-slate-500 block mt-0.5">/ {remainingAllowance.caloriesTarget} target</span>
                        </div>
                        <div className="text-center bg-slate-100/60 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/40 p-2 rounded-lg">
                          <span className="text-slate-400 font-size-xs block uppercase font-bold tracking-wider mb-0.5">Sat. Fat</span>
                          <span className={`font-mono font-size-xs font-bold ${remainingAllowance.saturatedFat === 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {remainingAllowance.saturatedFat.toFixed(1)} <span className="font-size-xs text-slate-400">g</span>
                          </span>
                          <span className="font-size-xs text-slate-400 dark:text-slate-500 block mt-0.5">/ {remainingAllowance.saturatedFatTarget}g max</span>
                        </div>
                        <div className="text-center bg-slate-100/60 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/40 p-2 rounded-lg">
                          <span className="text-slate-400 font-size-xs block uppercase font-bold tracking-wider mb-0.5">Sodium</span>
                          <span className={`font-mono font-size-xs font-bold ${remainingAllowance.sodium === 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {remainingAllowance.sodium} <span className="font-size-xs text-slate-400">mg</span>
                          </span>
                          <span className="font-size-xs text-slate-400 dark:text-slate-500 block mt-0.5">/ {remainingAllowance.sodiumTarget}mg max</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conversation Log History */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100/50 dark:bg-slate-950/20 p-3 mt-3 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-650 dark:text-indigo-400 font-bold block text-[10px] uppercase tracking-wider">
                        📡 Real-Time Full Agent Request Payload & Log
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          let logTxt = lastSentPayload ? JSON.stringify(lastSentPayload, null, 2) : messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
                          if (isAgent('medical')) {
                            logTxt = `=== PAYLOAD ===\n` + logTxt;
                          }
                          navigator.clipboard.writeText(logTxt);
                        }}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        Copy Log
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullScreenConv(true)}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-fade-in mb-2"
                    >
                      <span>🔍 View Log</span>
                    </button>

                    <FullScreenLogViewer
                      isOpen={showFullScreenConv}
                      onClose={() => setShowFullScreenConv(false)}
                      title="Full Agent Request Payload & Log"
                      logsText={(() => {
                        const msgLog = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
                        let logTxt = lastSentPayload ? `=== PAYLOAD ===\n${JSON.stringify(lastSentPayload, null, 2)}\n\n=== CONVERSATION ===\n${msgLog}` : msgLog;
                        if (isAgent('medical')) {
                          logTxt += `\n\n[Medical Profile]\n${JSON.stringify(profile, null, 2)}`;
                        }
                        return logTxt;
                      })()}
                      logsArray={(() => {
                        const arr = messages.map(m => `[${m.role.toUpperCase()}]
${m.content}`);
                        if (lastSentPayload) {
                          arr.unshift(`=== PAYLOAD ===
${JSON.stringify(lastSentPayload, null, 2)}`);
                        }
                        if (isAgent('medical')) {
                          arr.push(`[Medical Profile]
${JSON.stringify(profile, null, 2)}`);
                        }
                        return arr;
                      })()}
                      onSendToAdmin={handleSendLogToAdmin}
                      isSendingLogs={isSendingLogs}
                      logsSendStatus={logsSendStatus}
                      onClearLogs={() => {
                        setMessages(prev => prev.length > 0 ? [prev[0]] : []);
                        setLastSentPayload(null);
                        sessionStorage.removeItem(payloadStorageKey);
                        sessionStorage.removeItem(chatStorageKey);
                        setShowFullScreenConv(false);
                      }}
                      eventsCount={messages.length}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {(() => {
            const revIdx = [...messages].reverse().findIndex(m => m.id.startsWith('welcome_'));
            const lastWelcomeIndex = revIdx >= 0 ? messages.length - 1 - revIdx : -1;
            const sessionStartIdx = lastWelcomeIndex >= 0 ? lastWelcomeIndex : 0;
            const pastCount = sessionStartIdx;
            const hasPastMessages = pastCount > 0;

            return (
              <>
                {(hasPastMessages || messages.length > 1) && (
                  <div className="flex justify-center items-center gap-2 mb-4 mt-2">
                    {hasPastMessages && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPastDiscussion(!showPastDiscussion)}
                          className="px-4 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5 cursor-pointer bg-slate-100/50 dark:bg-slate-950/20 rounded-xl border border-slate-200/50 dark:border-slate-800/40"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {showPastDiscussion ? "Hide past discussion" : `View past discussion (${pastCount})`}
                          </span>
                        </button>
                        {showPastDiscussion && (
                          <button 
                            type="button"
                            onClick={() => {
                              setMessages(messages.slice(sessionStartIdx));
                              setShowPastDiscussion(false);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 hover:text-rose-600 transition-colors"
                            title="Clear past discussion history"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isPast = idx < sessionStartIdx;
                  if (isPast && !showPastDiscussion) return null;

                  const isLastFoodMsg = lastFoodMsg && msg.id === lastFoodMsg.id;
                  const isAss = msg.role === 'assistant';
                  if (isAss) {

                  return (
                <div
                  key={msg.id}
                  id={isLastFoodMsg ? "last-food-message" : undefined}
                  className="w-full space-y-2.5 px-1 min-w-0 relative group"
                >
                  {!msg.id.startsWith('welcome_') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMessagePair(msg.id)}
                      className="absolute right-2 top-0 p-1 text-slate-300 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors z-20 cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
                      title="Delete conversation step"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* No switcher */}
                  <div className="w-full leading-relaxed font-size-body text-slate-850 dark:text-slate-100 font-medium break-words overflow-x-hidden bg-transparent border-none shadow-none">
                    <div className="animation-fade-in">
                      {msg.imageUrls && msg.imageUrls.length > 0 ? (
                        <div className="mb-2 overflow-hidden border-y sm:border border-slate-200 dark:border-slate-700/30 w-[calc(100%+2.5rem)] -mx-5 sm:mx-0 sm:w-full sm:rounded-xl">
                          <ImageSlider images={msg.imageUrls} altText="Attached meal pictures" />
                        </div>
                      ) : msg.imageUrl ? (
                        <div className="mb-2 overflow-hidden border-y sm:border border-slate-200 dark:border-slate-700/30 max-h-40 w-[calc(100%+2.5rem)] -mx-5 sm:mx-0 sm:w-full sm:rounded-xl">
                          <img src={msg.imageUrl} alt="Attached meal" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      
                      {msg.agentType !== 'food' && (
                        <p className="whitespace-pre-line break-words">{formatMessageContent(msg.content, msg)}</p>
                      )}

                    </div>
                  </div>

                    {msg.agentUnavailable && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (onGoToManualEdit) {
                              onGoToManualEdit("The AI agent is not available. Please enter the food details manually.");
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          <Edit2 className="w-4 h-4" />
                          Go to Manual Edit
                        </button>
                      </div>
                    )}
                    
                    {msg.isError && (
                      <div className="mt-3 p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                              Service Unavailable
                            </h5>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed font-sans">
                              The AI Service is currently experiencing transient spikes in demand. You can seamlessly bypass this error and proceed to the next agent.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Skip to Next Agent
                          </button>
                        </div>
                      </div>
                    )}


                  {/* Render extracted Pending Food Log info */}
                  {(() => {
                    const rendererType = msg.id.startsWith('welcome_') ? 'welcome' : msg.agentType;
                    const Renderer = rendererType ? agentCardRegistry[rendererType] : null;
                    if (!Renderer) return null;
                    return (
                      <>
                        <div ref={msg.isLive ? liveThoughtRef : undefined}>
                          <AgentThoughtBox
                            scoutScratchpad={msg.isLive ? (liveThoughts.scout || msg.data?.agentResult?.scoutScratchpad) : msg.data?.agentResult?.scoutScratchpad}
                            dietitianScratchpad={msg.isLive ? (liveThoughts.dietitian || msg.data?.agentResult?.dietitianScratchpad) : msg.data?.agentResult?.dietitianScratchpad}
                            isLive={msg.isLive}
                            placeholderStep={msg.isLive && isAgent('food') ? ANALYZING_STEPS[analyzingStepIndex] : undefined}
                            hasImage={msg.data?.hasImage}
                            scoutInstruction={msg.data?.agentResult?.scoutInstruction}
                            scoutAnswer={msg.data?.agentResult?.scoutAnswer}
                            dbSearchLog={msg.data?.agentResult?.dbSearchLog}
                            dietitianInstruction={msg.data?.agentResult?.dietitianInstruction}
                            dietitianAnswer={msg.data?.agentResult?.dietitianAnswer}
                            activeStage={msg.data?.agentResult?.activeStage}
                            stageStatus={msg.data?.agentResult?.stageStatus}
                          />
                        </div>
                        <Renderer
                          msg={msg}
                          idx={idx}
                          messages={messages}
                          report={report}
                          foodLogs={activeFoodLogs}
                          t={t}
                          formatNutrientValue={formatNutrientValue}
                          onLogFood={onLogFood}
                          onLogFoodIdeas={onLogFoodIdeas}
                          setLoggedMessageIds={setLoggedMessageIds}
                          loggedMessageIds={loggedMessageIds}
                          profile={profile}
                          biomarkerHistory={activeHistory}
                          isSelectingMode={isSelectingMode && selectingMsgId === msg.id}
                          setIsSelectingMode={setIsSelectingMode}
                          onEnterSelectingMode={() => setSelectingMsgId(msg.id)}
                          selectedItemKeys={selectedItemKeys}
                          setSelectedItemKeys={setSelectedItemKeys}
                          actionRef={foodCardActionRef}
                          handleAgent1Step={handleAgent1Step}
                          handleContinueExtractionChunk={handleContinueExtractionChunk}
                          onAgentFinish={onAgentFinish}
                          handleSend={handleSend}
                          setActiveInstructionAgentType={setActiveInstructionAgentType}
                          setActiveInstructionPrompt={setActiveInstructionPrompt}
                          setInputText={setInputText}
                          fileInputRef={fileInputRef}
                          onDeleteMessage={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
                          onLogMedical={onLogMedical}
                          isAnalyzing={isAnalyzing}
                          agentType={agentType}
                          autoSendMessage={autoSendMessage}
                          type={type}
                        />
                      </>
                    );
                  })()}
                </div>
              );
            }
            else {
              if (msg.content === 'Surprise me') return null;
              return (
                <div
                  key={msg.id}
                  className="flex gap-3 max-w-[85%] w-full min-w-0 ml-auto flex-row-reverse"
                >
                  <div className="space-y-2 flex-1 min-w-0 max-w-full">
                    <div className="relative group rounded-2xl px-3.5 py-2.5 leading-relaxed font-size-body shadow-sm font-medium break-words overflow-x-hidden bg-indigo-600 text-white">
                      <button
                        type="button"
                        onClick={() => handleDeleteMessagePair(msg.id)}
                        className="absolute right-2 top-2 p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-20 cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Delete conversation step"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {msg.imageUrls && msg.imageUrls.length > 0 ? (
                        <div className="mb-2 overflow-hidden sm:rounded-xl border-y sm:border border-slate-200 dark:border-slate-700/30 w-[calc(100%+1.75rem)] -mx-[0.875rem] sm:mx-0 sm:w-full">
                          <ImageSlider images={msg.imageUrls} altText="Attached meal pictures" />
                        </div>
                      ) : msg.imageUrl ? (
                        <div className="mb-2 overflow-hidden sm:rounded-lg border-y sm:border border-white/10 max-h-40 w-[calc(100%+1.75rem)] -mx-[0.875rem] sm:mx-0 sm:w-full">
                          <img src={msg.imageUrl} alt="Attached meal" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      {String(msg.content).includes('Here is the suggestion:\n\n') ? (
                        <div className="whitespace-pre-line break-words text-sm">
                          {String(msg.content).split('Here is the suggestion:\n\n')[0]}
                          Here is the suggestion:
                          <div className="mt-2 mb-2 p-2 bg-indigo-700/30 rounded border border-indigo-400/30 font-mono text-xs overflow-hidden h-10 relative cursor-pointer"
                               onClick={() => {
                                  const jsonStr = String(msg.content).split('Here is the suggestion:\n\n')[1].split('\n\nCould you please')[0];
                                  setFullScreenJson(jsonStr);
                               }}
                          >
                            <span className="text-indigo-200 hover:text-white underline">(previous review)</span>
                          </div>
                          {String(msg.content).split('\n\nCould you please')[1] ? 'Could you please' + String(msg.content).split('\n\nCould you please')[1] : ''}
                        </div>
                      ) : (
                        <p className="whitespace-pre-line break-words">{formatMessageContent(msg.content, msg)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </>
      );
    })()}
        {isAnalyzing && !isAgent('food') && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 animate-pulse">
              <Loader className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
            <div className="px-4 py-3 min-w-[250px]">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                {ANALYZING_STEPS[analyzingStepIndex]}
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        {/* Reserve room so the live thought box (attached to the streaming message
            above) can be scrolled to the top of the viewport instead of being
            pushed off-screen while the answer is still growing. */}
        <div aria-hidden="true" className="min-h-[45vh]" />
      </div>

        {/* Input Dock */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/80 p-3 flex flex-col gap-2 shrink-0 relative">
          {matchingPreviousLogs.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50 animate-fade-in font-sans">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Previous Matches</span>
                <span className="text-[9px] text-slate-400">Click Add to duplicate</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {matchingPreviousLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {log.imageUrl || (log.imageUrls && log.imageUrls.length > 0) ? (
                        <img 
                          src={resolveFoodImage(log.imageUrl || log.imageUrls?.[0], activeFoodLogs)} 
                          alt={log.name} 
                          className="w-8 h-8 rounded-lg object-cover border border-slate-100 dark:border-slate-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 font-bold text-xs shrink-0">
                          {log.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{log.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{log.composition || log.quantity}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDuplicateFoodLog(log)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isCompressing && (
            <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl">
              <Loader className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold">
                Compressing image {compressionProgress.current} of {compressionProgress.total} ({compressionProgress.percent}%) ...
              </span>
            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 max-w-full">
              {selectedImages.map((imgSrc, idx) => (
                <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 group">
                  <img src={imgSrc} alt="Preview thumbnail" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0 right-0 bg-slate-900/80 hover:bg-rose-600 text-white p-0.5 rounded-bl-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action Prompts */}
          {(messages.length <= 1 || selectedImages.length > 0) && (
            <div className="flex gap-2 mb-2 w-full overflow-x-auto scrollbar-none pb-1 shrink-0">
              {isAgent('food') ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setInputText("I ate this meal"); setTimeout(() => document.getElementById("food-chat-input")?.focus(), 50); }}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🔍 Review Meal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInputText("Compare food items"); setTimeout(() => document.getElementById("food-chat-input")?.focus(), 50); }}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚖️ Compare Food</span>
                  </button>
                </>
              ) : isAgent('front_desk') ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSend('What should I do?')}
                    className="whitespace-nowrap px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <span>🧭 What should I do?</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAgentFromFrontDesk?.(null)}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>➕ Add health data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAgentFromFrontDesk?.('data_review')}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🩺 Review biomarkers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAgentFromFrontDesk?.('agent1')}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📋 Clinical review</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAgentFromFrontDesk?.('health_baseline')}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🎯 Health planning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAgentFromFrontDesk?.('agent7')}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>💡 Medical insights</span>
                  </button>
                </>
              ) : (
                !isAgent('food_idea') && !isAgent('daily_recommendation') && !(isAgent('medical') && !agentType) && (
                  <button
                    type="button"
                    onClick={() => {
                      const triggerText = autoSendMessage || 'Start';
                      handleSend(triggerText);
                    }}
                    className="whitespace-nowrap px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <span>🚀 {autoSendMessage ? (autoSendMessage.toLowerCase().includes('calibrate') ? 'Start Calibration' : 'Start Review') : "Let's start"}</span>
                  </button>
                )
              )}
            </div>
          )}
          {isSelectingMode && (
            <div className="flex items-center gap-2.5 w-full bg-indigo-50/15 dark:bg-indigo-950/5 p-2 rounded-2xl border border-indigo-100/30 dark:border-indigo-950/30">
              {selectedItemKeys.length > 0 && (
                <>
                  {/* Reload / Reset Selection Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemKeys([]);
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex-shrink-0 cursor-pointer"
                    title="Reset Selection"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  {/* Action Buttons: Image Search, Origin Search, Compare Food */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItemKeys.length === 0) return;
                      if (foodCardActionRef.current?.triggerImageSearch) {
                        foodCardActionRef.current.triggerImageSearch(selectedItemKeys);
                      }
                      setIsSelectingMode(false);
                      setSelectedItemKeys([]);
                    }}
                    disabled={selectedItemKeys.length === 0}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold shadow-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedItemKeys.length === 0
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700/40'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                    }`}
                  >
                    <span>🔍 Image Search</span>
                    {selectedItemKeys.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-white/20 text-[9.5px] rounded-full">
                        {selectedItemKeys.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItemKeys.length === 0) return;
                      if (foodCardActionRef.current?.triggerFetchMenuImages) {
                        foodCardActionRef.current.triggerFetchMenuImages(selectedItemKeys);
                      }
                      setIsSelectingMode(false);
                      setSelectedItemKeys([]);
                    }}
                    disabled={selectedItemKeys.length === 0}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold shadow-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedItemKeys.length === 0
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700/40'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    }`}
                  >
                    <span>🖼️ Show Menu Image</span>
                    {selectedItemKeys.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-white/20 text-[9.5px] rounded-full">
                        {selectedItemKeys.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItemKeys.length === 0) return;
                      if (foodCardActionRef.current?.triggerCompareFood) {
                        foodCardActionRef.current.triggerCompareFood(selectedItemKeys);
                      }
                      setIsSelectingMode(false);
                      setSelectedItemKeys([]);
                    }}
                    disabled={selectedItemKeys.length === 0}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold shadow-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedItemKeys.length === 0
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700/40'
                        : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
                    }`}
                  >
                    <span>⚖️ Compare Food</span>
                    {selectedItemKeys.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-white/20 text-[9.5px] rounded-full">
                        {selectedItemKeys.length}
                      </span>
                    )}
                  </button>
                </>
              )}
              {/* Close / Cancel Search Mode Button */}
              <button
                type="button"
                onClick={() => {
                  setIsSelectingMode(false);
                  setSelectedItemKeys([]);
                }}
                className="p-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-650 dark:text-rose-450 rounded-xl transition-all cursor-pointer flex-shrink-0"
                title="Cancel Selection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          {!isSelectingMode && (
            <div className="flex items-center gap-2">
              <button
                id="food-chat-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex-shrink-0"
                title={t.uploadPhoto}
              >
                <Image className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              <button
                id="food-chat-camera-btn"
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex-shrink-0"
                title="Take photo from phone camera"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              <input
                id="food-chat-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.chatPlaceholder}
                className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3.5 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
              />

              <button
                id="food-chat-send-btn"
                onClick={handleSend}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Full View Consolidated Log Modal */}
      {activeModalTableRows && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animation-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between shrink-0 font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-100 font-display">
                    {activeModalTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeModalTitle.includes('Reference')
                      ? 'Demographically adjusted reference ranges and risk analysis based on age, gender, and ethnicity'
                      : 'Unified view of system-by-system health indicators and 2-year longitudinal insights'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalTableRows(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/35 dark:bg-slate-950/20 font-sans">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                {/* min-w-[1200px] ensures the table is twice as wide for easier reading */}
                <table className="min-w-[1200px] w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/90 font-bold text-slate-500 dark:text-slate-400 sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 w-[200px]">
                        {activeModalTitle.includes('Reference') ? 'Calibration Domain' : 'System'}
                      </th>
                      <th className="px-4 py-3 w-[180px]">Biomarker</th>
                      <th className="px-4 py-3 w-[120px] text-center">Result</th>
                      <th className="px-4 py-3 w-[100px] text-center">Status</th>
                      <th className="px-4 py-3 min-w-[600px]">
                        {activeModalTitle.includes('Reference') ? 'Profile Calibrated Ranges & Diagnostic Explanations' : '2-Year Trend / Insight (Twice as Wide)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-medium">
                    {activeModalTableRows.map((row, idx) => {
                      const stat = row.status.toUpperCase();
                      let badgeStyle = "text-slate-600 bg-slate-50 dark:bg-slate-900 border-slate-150";
                      if (stat === 'CRITICAL') {
                        badgeStyle = "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40";
                      } else if (stat === 'WARNING' || stat === 'AMBER' || stat === 'HIGH' || stat === 'LOW') {
                        badgeStyle = "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40";
                      } else if (stat === 'NORMAL' || stat === 'OPTIMAL') {
                        badgeStyle = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40";
                      }
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 capitalize">{row.system}</td>
                          <td className="px-4 py-3.5 text-slate-900 dark:text-slate-100 font-bold">{row.biomarker}</td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{row.result}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-650 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-line">
                            {row.insight}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between shrink-0 font-sans">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {activeModalTableRows.length} biomarker correlations. Tip: Use horizontal scroll on narrow views.
              </span>
              <button
                type="button"
                onClick={() => setActiveModalTableRows(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Full Screen JSON Viewer */}
      {fullScreenJson && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animation-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between shrink-0 font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-100 font-display">
                    Previous Review Data
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The JSON data provided for context in this conversation step.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFullScreenJson(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/35 dark:bg-slate-950/20 font-sans">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm p-4 overflow-auto">
                <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {fullScreenJson}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between shrink-0 font-sans">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Read-only view
              </span>
              <button
                type="button"
                onClick={() => setFullScreenJson(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      <FullScreenInstructionViewer
        isOpen={activeInstructionAgentType !== null}
        onClose={() => {
          setActiveInstructionAgentType(null);
          setActiveInstructionPrompt(null);
        }}
        agentType={activeInstructionAgentType || ''}
        profile={profile}
        biomarkerHistory={activeHistory}
        agentPrompt={activeInstructionPrompt || undefined}
        outOfRangeBiomarkers={outOfRangeBiomarkers}
        remainingAllowance={remainingAllowance}
        activeMeal={[...messages].reverse().find(m => m.data?.pendingFoodLog)?.pendingFoodLog}
        location={userLocation}
        recentMeals={foodLogs?.slice(-20).map(f => f.name)}
        budget={budget}
        currency={currency}
        maxDistance={maxDistance}
      />
      <FullScreenLogViewer
        isOpen={showFullScreenDebugLogs}
        onClose={() => setShowFullScreenDebugLogs(false)}
        title="AI Agent Diagnostic Log History"
        logsText={debugLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\\n')}
        logsArray={debugLogs.map(l => `[${l.timestamp}]
${l.message}`)}
        onSendToAdmin={handleSendDebugLogsToAdmin}
        isSendingLogs={isDebugSendingLogs}
        logsSendStatus={debugLogsSendStatus}
        onClearLogs={handleClearDebugLogs}
        eventsCount={debugLogs.length}
        conversationsList={conversationsList}
        activeConversationId={activeConversationId || undefined}
        showFilters={true}
      />
    </div>
  );
}
