import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Send, Check, AlertTriangle, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getAgentRequestLogs, deleteAgentRequestLog, AgentRequestLog } from '../utils/agentLogsTracker';

interface FullScreenLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  logsText: string;
  logsArray?: string[];
  onSendToAdmin?: () => Promise<void>;
  isSendingLogs?: boolean;
  logsSendStatus?: 'idle' | 'success' | 'error';
  onClearLogs?: () => void;
  eventsCount?: number;
  conversationsList?: { id: string; title: string }[];
  activeConversationId?: string;
  showFilters?: boolean;
}

interface AgentDef {
  id: string;
  name: string;
  test: (lower: string) => boolean;
}

const ALL_AGENT_DEFS: AgentDef[] = [
  {
    id: 'front_desk',
    name: 'Health Preparation Agent',
    test: (l) => l.includes('agenttype: front_desk') || l.includes('agenttype:front_desk') || l.includes('[frontdesk') || l.includes('front-desk') || l.includes('health preparation agent')
  },
  {
    id: 'agent1',
    name: 'Clinical Calibration Agent',
    test: (l) => l.includes('agenttype: agent1') || l.includes('agenttype:agent1') || l.includes('standardize units agent') || l.includes('clinical calibration agent') || l.includes('[agent1]')
  },
  {
    id: 'data_review',
    name: 'Data Accuracy Agent',
    test: (l) => l.includes('agenttype: data_review') || l.includes('agenttype:data_review') || l.includes('data accuracy agent') || l.includes('clinical data accuracy agent') || l.includes('[data_review]')
  },
  {
    id: 'health_baseline',
    name: 'Health Coach',
    test: (l) => l.includes('agenttype: health_baseline') || l.includes('agenttype:health_baseline') || l.includes('health baseline') || l.includes('[health_baseline]')
  },
  {
    id: 'agent7',
    name: 'Health Report Agent',
    test: (l) => l.includes('agenttype: agent7') || l.includes('agenttype:agent7') || l.includes('health report agent') || l.includes('medical insights') || l.includes('[agent7]')
  },
  {
    id: 'scout',
    name: 'Visual Food Scout',
    test: (l) => l.includes('vision scout') || l.includes('image payload')
  },
  {
    id: 'medical_extract',
    name: 'Clinical Data Parser',
    test: (l) => l.includes('agenttype: medical_extract') || l.includes('agenttype:medical_extract') || l.includes('clinical data parser') || l.includes('[medical_extract]')
  },
  {
    id: 'agent2',
    name: 'Clinical Assessment Agent',
    test: (l) => l.includes('agenttype: agent2') || l.includes('agenttype:agent2') || l.includes('clinical assessment agent') || l.includes('medical categorisation agent') || l.includes('[agent2]')
  },
  {
    id: 'agent3',
    name: 'Clinical Harmonization Agent',
    test: (l) => l.includes('agenttype: agent3') || l.includes('agenttype:agent3') || l.includes('clinical harmonization agent') || l.includes('name consolidation agent') || l.includes('[agent3]')
  },
  {
    id: 'agent4',
    name: 'Health Planning Agent',
    test: (l) => l.includes('agenttype: agent4') || l.includes('agenttype:agent4') || l.includes('health planning agent') || l.includes('diagnostic agent (agent4)') || l.includes('biomarker synthesis agent') || l.includes('[agent4]')
  },
  {
    id: 'agent5',
    name: 'Holistic Review Agent',
    test: (l) => l.includes('agenttype: agent5') || l.includes('agenttype:agent5') || l.includes('holistic review agent') || l.includes('[agent5]')
  },
  {
    id: 'food_idea',
    name: 'Culinary Ideation Agent',
    test: (l) => l.includes('agenttype: food_idea') || l.includes('agenttype:food_idea') || l.includes('culinary ideation agent') || l.includes('[food_idea]')
  },
  {
    id: 'daily_recommendation',
    name: 'Daily Actions Agent',
    test: (l) => l.includes('agenttype: daily_recommendation') || l.includes('agenttype:daily_recommendation') || l.includes('daily actions agent') || l.includes('[daily_recommendation]')
  },
  {
    id: 'medical',
    name: 'Medical Diagnostics Agent',
    test: (l) => l.includes('agenttype: medical') || l.includes('agenttype:medical') || l.includes('medical diagnostics agent') || l.includes('[medical]')
  },
  {
    id: 'food',
    name: 'Clinical Dietitian AI',
    test: (l) => l.includes('agenttype: food') || l.includes('agenttype:food') || l.includes('clinical dietitian ai') || l.includes('food & nutrition agent') || l.includes('[food_analysis]') || l.includes('food analyze agent') || l.includes('dietitian')
  }
];

function tryFormatJsonString(str: string): string | null {
  if (!str) return null;
  let trimmed = str.trim();

  // Strip trailing truncation marker if present
  let truncationNote = '';
  const truncIdx = trimmed.indexOf('\n... [truncated');
  if (truncIdx !== -1) {
    truncationNote = trimmed.slice(truncIdx).trim();
    trimmed = trimmed.slice(0, truncIdx).trim();
  }

  // Check if it looks like JSON (starts with { or [)
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  // Ignore bracketed timestamps or tag headers like [11:27:53] or [Medical Analyze Agent] or [UnifiedLLM]
  if (/^\[\d{1,2}:\d{2}/.test(trimmed) || /^\[[A-Za-z0-9_\s-]+\](?!\s*[:{\[\"\d])/.test(trimmed)) {
    return null;
  }

  // Try direct JSON.parse
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string' && item.length < 30 && !item.includes('{'))) {
        return null;
      }
      const pretty = JSON.stringify(parsed, null, 2);
      return truncationNote ? `${pretty}\n\n${truncationNote}` : pretty;
    }
  } catch (e) {
    // Attempt repair for truncated JSON
  }

  // Only attempt repair if it starts with { and contains key-value colon patterns
  if (!trimmed.startsWith('{') || !trimmed.includes(':')) {
    return null;
  }

  try {
    let repaired = trimmed;
    let inString = false;
    let escape = false;
    const stack: string[] = [];

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
        } else if (char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
        }
      }
    }

    if (inString) {
      repaired += '"';
    }

    repaired = repaired.trim().replace(/,\s*$/, '');

    while (stack.length > 0) {
      const top = stack.pop();
      if (top === '{') repaired += '}';
      else if (top === '[') repaired += ']';
    }

    const parsed = JSON.parse(repaired);
    if (typeof parsed === 'object' && parsed !== null) {
      const pretty = JSON.stringify(parsed, null, 2);
      return truncationNote ? `${pretty}\n\n${truncationNote}` : pretty;
    }
  } catch (e) {
    return null;
  }

  return null;
}

function FormattedLogChunk({ chunk, searchTerm, highlightText }: { chunk: string; searchTerm: string; highlightText: (text: string, highlight: string) => React.ReactNode }) {
  const lines = chunk.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-1.5 p-2 bg-slate-950/40 rounded overflow-x-auto text-[11px] font-mono text-emerald-300/90 leading-relaxed">
            {highlightText(codeBuffer.join('\n'), searchTerm)}
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Section XML tags
    if (/^<[A-Z0-9_]+>$/i.test(trimmed) || /^<\/[A-Z0-9_]+>$/i.test(trimmed)) {
      const isClose = trimmed.startsWith('</');
      const tagName = trimmed.replace(/[<>/]/g, '');
      elements.push(
        <div key={`tag-${i}`} className={`my-1 flex items-center gap-2 font-mono font-bold text-[10px] tracking-wider uppercase ${isClose ? 'text-slate-500' : 'text-indigo-400'}`}>
          <span>{isClose ? `--- END ${tagName} ---` : `--- SECTION: ${tagName} ---`}</span>
        </div>
      );
      continue;
    }

    // Check for "Label: {" or "Label: ["
    const labelJsonMatch = line.match(/^([A-Za-z0-9\s_():\[\]-]+):\s*([{\[].*)$/);
    if (labelJsonMatch) {
      const label = labelJsonMatch[1];
      const jsonStr = labelJsonMatch[2];
      const prettyJson = tryFormatJsonString(jsonStr);
      if (prettyJson) {
        elements.push(
          <div key={`json-lbl-${i}`} className="my-1 pl-2">
            <span className="text-slate-400 font-bold text-[11px] font-mono">{highlightText(label, searchTerm)}:</span>
            <div className="font-mono text-[11px] text-indigo-200/90 leading-relaxed whitespace-pre font-normal pt-1 max-h-[450px] overflow-y-auto">
              {highlightText(prettyJson, searchTerm)}
            </div>
          </div>
        );
        continue;
      }
    }

    // Standalone or inline JSON (starts with { or [)
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const prettyJson = tryFormatJsonString(trimmed);
      if (prettyJson) {
        elements.push(
          <div key={`json-standalone-${i}`} className="my-1 pl-2 font-mono text-[11px] text-indigo-200/90 leading-relaxed whitespace-pre font-normal max-h-[450px] overflow-y-auto">
            {highlightText(prettyJson, searchTerm)}
          </div>
        );
        continue;
      }
    }

    // Normal line
    elements.push(
      <div key={`line-${i}`} className="min-h-[1.25rem] font-mono text-[11px] text-slate-300 leading-relaxed">
        {highlightText(line, searchTerm)}
      </div>
    );
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <div key="code-flush" className="my-1.5 p-2 bg-slate-950/40 rounded overflow-x-auto text-[11px] font-mono text-emerald-300/90 leading-relaxed">
        {highlightText(codeBuffer.join('\n'), searchTerm)}
      </div>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export default function FullScreenLogViewer({
  isOpen,
  onClose,
  title,
  logsText,
  logsArray,
  onSendToAdmin,
  isSendingLogs = false,
  logsSendStatus = 'idle',
  onClearLogs,
  eventsCount,
  conversationsList,
  activeConversationId,
  showFilters = false
}: FullScreenLogViewerProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<string>('all');

  const [selectedSessionId, setSelectedSessionId] = useState(activeConversationId || '');
  const [sessionLogs, setSessionLogs] = useState<string[]>(logsArray || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  
  const [requestLogs, setRequestLogs] = useState<AgentRequestLog[]>([]);
  const isDiagnostic = title.includes('Diagnostic');
  const actualShowFilters = showFilters || isDiagnostic;

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback...', err);
    }
    
    // Fallback using textarea for restricted contexts like iframes
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return !!successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  };

  const loadRequestLogs = () => {
    if (isDiagnostic) {
      setRequestLogs(getAgentRequestLogs());
    }
  };

  useEffect(() => {
    if (isOpen && isDiagnostic) {
      loadRequestLogs();
      const listener = () => loadRequestLogs();
      window.addEventListener('agent_logs_updated', listener);
      return () => window.removeEventListener('agent_logs_updated', listener);
    }
  }, [isOpen, isDiagnostic]);

  const chunks = useMemo(() => {
    if (isDiagnostic) {
      if (selectedResponse === 'all') {
         const allHistorical = requestLogs.flatMap(r => r.logs.map(l => `[${l.timestamp}]\n${l.message}`));
         const allCurrent = sessionLogs; // from global polling
         // Deduplicate by string content
         const unique = new Set([...allHistorical, ...allCurrent]);
         return Array.from(unique);
      } else {
         const req = requestLogs.find(r => r.id === selectedResponse);
         if (req) return req.logs.map(l => `[${l.timestamp}]\n${l.message}`);
      }
      return [];
    }
    return sessionLogs;
  }, [sessionLogs, isDiagnostic, requestLogs, selectedResponse]);

  const agentLogs = useMemo(() => {
    const currentChunks = chunks;
    const logsMap: Record<string, string[]> = {};
    ALL_AGENT_DEFS.forEach(def => { logsMap[def.id] = []; });
    logsMap['other'] = [];

    let currentAgentId: string | null = null;

    currentChunks.forEach(chunk => {
      const lower = chunk.toLowerCase();
      
      // If generic LLM log, inherit current agent phase if available
      if (lower.includes('[unifiedllm')) {
        if (currentAgentId && logsMap[currentAgentId]) {
          logsMap[currentAgentId].push(chunk);
        } else {
          logsMap['other'].push(chunk);
        }
        return;
      }

      const matchedDef = ALL_AGENT_DEFS.find(def => def.test(lower));
      if (matchedDef) {
        currentAgentId = matchedDef.id;
        logsMap[matchedDef.id].push(chunk);
      } else if (currentAgentId && logsMap[currentAgentId]) {
        logsMap[currentAgentId].push(chunk);
      } else {
        logsMap['other'].push(chunk);
      }
    });

    return logsMap;
  }, [chunks]);

  const availableAgents = useMemo(() => {
    return ALL_AGENT_DEFS.filter(def => agentLogs[def.id] && agentLogs[def.id].length > 0);
  }, [agentLogs]);

  const filteredByAgent = useMemo(() => {
    if (selectedAgent === 'all') return chunks;
    return agentLogs[selectedAgent] || [];
  }, [chunks, agentLogs, selectedAgent]);

  // Reset selectedAgent filter if the current selected agent has no logs
  useEffect(() => {
    if (selectedAgent !== 'all' && (!agentLogs[selectedAgent] || agentLogs[selectedAgent].length === 0)) {
      setSelectedAgent('all');
    }
  }, [agentLogs, selectedAgent]);

  const filteredChunks = useMemo(() => {
    if (!searchTerm) return filteredByAgent;
    const lowerSearch = searchTerm.toLowerCase();
    return filteredByAgent.filter(chunk => chunk.toLowerCase().includes(lowerSearch));
  }, [filteredByAgent, searchTerm]);

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredChunks.length > 0) {
        if (e.shiftKey) {
          setActiveMatchIndex(prev => (prev - 1 + filteredChunks.length) % filteredChunks.length);
        } else {
          setActiveMatchIndex(prev => (prev + 1) % filteredChunks.length);
        }
      }
    }
  };

  // Scroll active match into view — center on the highlighted keyword itself, not just
  // the top/bottom edge of the (often very long) log chunk it appears in.
  useEffect(() => {
    if (searchTerm && filteredChunks.length > 0) {
      const container = document.getElementById(`log-chunk-${activeMatchIndex}`);
      const markElement = container?.querySelector('mark');
      const target = markElement || container;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeMatchIndex, searchTerm, filteredChunks.length]);

  // React to prop updates on mount or open
  useEffect(() => {
    if (isOpen) {
      setSelectedSessionId(activeConversationId || '');
      setSessionLogs(logsArray || []);
    }
  }, [isOpen, activeConversationId, logsArray]);

  const fetchLogsForSession = async (sessId: string) => {
    if (!sessId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/gemini/debug-logs?sessionId=${sessId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          const formatted = data.logs.map((l: any) => `[${l.timestamp}]\n${l.message}`);
          setSessionLogs(formatted);
        }
      }
    } catch (err) {
      console.warn("Error fetching debug logs for session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionChange = (sessId: string) => {
    setSelectedSessionId(sessId);
    fetchLogsForSession(sessId);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-500/40 text-yellow-100 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  if (!isOpen) return null;

  const handleCopyAll = async () => {
    try {
      let textToCopy = '';
      if (filteredChunks && filteredChunks.length > 0) {
        textToCopy = filteredChunks.join('\n\n');
      } else {
        textToCopy = logsText || '';
      }

      const success = await copyToClipboard(textToCopy);
      if (success) {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      } else {
        throw new Error('Copy failed');
      }
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const handleClear = () => {
    if (isDiagnostic) {
      localStorage.removeItem('agent_request_logs');
      setRequestLogs([]);
      window.dispatchEvent(new Event('agent_logs_updated'));
    }
    if (onClearLogs) {
      onClearLogs();
      setSessionLogs([]);
    }
  };

  const handleCopyChunk = async (text: string, index: number) => {
    try {
      const success = await copyToClipboard(text);
      if (success) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        throw new Error('Copy failed');
      }
    } catch (err) {
      console.error('Failed to copy chunk:', err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col animate-fade-in w-full h-[100dvh] text-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              {title}
            </h2>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters & Selector Panel */}
      {actualShowFilters && (
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/60 flex flex-wrap items-center gap-4 text-xs font-sans">
          {/* Session Filter */}
          {isDiagnostic ? (
            requestLogs.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Request:</span>
                <select
                  value={selectedResponse}
                  onChange={(e) => setSelectedResponse(e.target.value)}
                  className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 outline-none text-slate-200 font-mono focus:border-indigo-500/50 cursor-pointer shadow-sm text-xs max-w-[200px] truncate"
                >
                  <option value="all">All Requests</option>
                  {requestLogs.map((req) => (
                    <option key={req.id} value={req.id}>
                      {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})} - {req.summary}
                    </option>
                  ))}
                </select>
                {selectedResponse !== 'all' && (
                  <button
                    onClick={() => {
                      deleteAgentRequestLog(selectedResponse);
                      setSelectedResponse('all');
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/20 rounded-md transition-colors"
                    title="Delete Request Log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          ) : conversationsList && conversationsList.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Session:</span>
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 outline-none text-slate-200 font-mono focus:border-indigo-500/50 cursor-pointer shadow-sm text-xs"
              >
                {conversationsList.map((conv) => (
                  <option key={conv.id} value={conv.id}>
                    {conv.title || 'Untitled Session'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Agent Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 outline-none text-slate-200 font-mono focus:border-indigo-500/50 cursor-pointer shadow-sm text-xs"
            >
              <option value="all">All Agents / Process Steps</option>
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
              {agentLogs['other'] && agentLogs['other'].length > 0 && availableAgents.length === 0 && (
                <option value="other">System Logs</option>
              )}
            </select>
          </div>

          {/* Inline Mobile Search with Count & Next/Prev Controls */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs contents..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-900 border border-slate-800/80 rounded-xl pl-9 pr-24 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-sm"
            />
            {searchTerm && filteredChunks.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800/60 text-[10px] font-mono text-slate-400">
                <span>
                  {activeMatchIndex + 1}/{filteredChunks.length}
                </span>
                <div className="w-[1px] h-3 bg-slate-800" />
                <button
                  type="button"
                  title="Previous match (Shift+Enter)"
                  onClick={() => setActiveMatchIndex(prev => (prev - 1 + filteredChunks.length) % filteredChunks.length)}
                  className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Next match (Enter)"
                  onClick={() => setActiveMatchIndex(prev => (prev + 1) % filteredChunks.length)}
                  className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {searchTerm && filteredChunks.length === 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-rose-400">
                No matches
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 mx-[10px] py-4 bg-transparent flex flex-col min-h-0">
        {filteredChunks.length === 0 ? (
          <span className="text-slate-500 italic font-mono text-xs px-2">
            {chunks.length === 0 ? 'No logs recorded yet.' : 'No matches found.'}
          </span>
        ) : (
          <div className="flex-1 w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 font-mono text-[11px] text-slate-300 leading-relaxed overflow-y-auto select-text whitespace-pre-wrap">
            {filteredChunks.map((chunk, idx) => {
              const isActive = searchTerm && idx === activeMatchIndex;
              return (
                <div
                  id={`log-chunk-${idx}`}
                  key={idx}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-950/40 border border-indigo-500/50 ring-1 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                      : 'border border-transparent'
                  }`}
                >
                  <FormattedLogChunk chunk={chunk} searchTerm={searchTerm} highlightText={highlightText} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950">
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
          {eventsCount !== undefined ? (
            <span>{eventsCount} events logged</span>
          ) : (
            <span>{logsText ? `${logsText.length} characters` : 'Empty log'}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClearLogs && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-950/25 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Clear Log
            </button>
          )}
          <button
            onClick={handleCopyAll}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied All!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy All</span>
              </>
            )}
          </button>
          {onSendToAdmin && (
            <button
              onClick={onSendToAdmin}
              disabled={isSendingLogs || !logsText}
              className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                logsSendStatus === 'success'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : logsSendStatus === 'error'
                  ? 'bg-rose-650 border-rose-550 text-white'
                  : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
              }`}
            >
              {isSendingLogs ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Sending...</span>
                </>
              ) : logsSendStatus === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Sent!</span>
                </>
              ) : logsSendStatus === 'error' ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Failed!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send to Admin</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  , document.body);
}
