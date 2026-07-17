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
  const [selectedAgent, setSelectedAgent] = useState<'all' | 'scout' | 'dietitian'>('all');
  
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

  const filteredByAgent = useMemo(() => {
    const currentChunks = chunks;
    if (selectedAgent === 'all') return currentChunks;
    return currentChunks.filter(chunk => {
      const lower = chunk.toLowerCase();
      if (selectedAgent === 'scout') {
        return lower.includes('vision scout') || 
               lower.includes('image payload') || 
               (lower.includes('unifiedllm') && (lower.includes('visual food identification') || lower.includes('analyze this image')));
      } else {
        return lower.includes('routeagent') || 
               lower.includes('modify math') || 
               lower.includes('mode routing') || 
               lower.includes('client state') || 
               lower.includes('database matches') ||
               lower.includes('fallback') ||
               (lower.includes('unifiedllm') && (lower.includes('clinical dietitian') || lower.includes('current_active_meal_state')));
      }
    });
  }, [chunks, selectedAgent]);

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

  // Scroll active match into view
  useEffect(() => {
    if (searchTerm && filteredChunks.length > 0) {
      const element = document.getElementById(`log-chunk-${activeMatchIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      console.error("Error fetching debug logs for session:", err);
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
              onChange={(e) => setSelectedAgent(e.target.value as any)}
              className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 outline-none text-slate-200 font-mono focus:border-indigo-500/50 cursor-pointer shadow-sm text-xs"
            >
              <option value="all">All Agents / Process Steps</option>
              <option value="scout">Visual Food Scout (Image Classifier)</option>
              <option value="dietitian">Clinical Dietitian AI</option>
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
                  {highlightText(chunk, searchTerm)}
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
