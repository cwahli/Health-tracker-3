const fs = require('fs');
let code = fs.readFileSync('src/components/FullScreenLogViewer.tsx', 'utf8');

const importReplacement = `import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Send, Check, AlertTriangle, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getAgentRequestLogs, deleteAgentRequestLog, AgentRequestLog } from '../utils/agentLogsTracker';`;
code = code.replace(/import React.*?lucide-react';/s, importReplacement);

const stateReplacement = `  const [selectedAgent, setSelectedAgent] = useState<'all' | 'scout' | 'dietitian'>('all');
  
  const [requestLogs, setRequestLogs] = useState<AgentRequestLog[]>([]);
  const isDiagnostic = title.includes('Diagnostic');

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
         return requestLogs.flatMap(r => r.logs.map(l => \`[\${l.timestamp}]\\n\${l.message}\`));
      } else {
         const req = requestLogs.find(r => r.id === selectedResponse);
         if (req) return req.logs.map(l => \`[\${l.timestamp}]\\n\${l.message}\`);
      }
      return [];
    }
    return sessionLogs;
  }, [sessionLogs, isDiagnostic, requestLogs, selectedResponse]);`;

code = code.replace(/  const \[selectedAgent.*?return sessionLogs;\n  \}, \[sessionLogs\]\);/s, stateReplacement);

const dropdownTarget = `          {title.includes('Diagnostic') ? (
            logsArray && logsArray.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Discussion Thread:</span>
                <select
                  value={selectedResponse}
                  onChange={(e) => setSelectedResponse(e.target.value)}
                  className="bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 outline-none text-slate-200 font-mono focus:border-indigo-500/50 cursor-pointer shadow-sm text-xs"
                >
                  <option value="all">All Responses</option>
                  {logsArray.map((_, i) => (
                    <option key={i} value={i}>Response {i + 1}</option>
                  ))}
                </select>
              </div>
            )
          ) :`;

const dropdownReplacement = `          {isDiagnostic ? (
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
          ) :`;

code = code.replace(dropdownTarget, dropdownReplacement);

const filterAgentReplacement = `    if (isDiagnostic && selectedResponse !== 'all') {
      const req = requestLogs.find(r => r.id === selectedResponse);
      if (req) currentChunks = req.logs.map(l => \`[\${l.timestamp}]\\n\${l.message}\`);
    }`;

// wait we already replaced chunks to do exactly this logic. So we can remove the logic in filteredByAgent.
const filteredByAgentTarget = `  const filteredByAgent = useMemo(() => {
    let currentChunks = chunks;
    if (title.includes('Diagnostic') && selectedResponse !== 'all') {
      const idx = parseInt(selectedResponse, 10);
      if (!isNaN(idx) && idx >= 0 && idx < currentChunks.length) {
        currentChunks = [currentChunks[idx]];
      }
    }
        
    if (selectedAgent === 'all') return currentChunks;`;

const filteredByAgentReplacement = `  const filteredByAgent = useMemo(() => {
    let currentChunks = chunks;
        
    if (selectedAgent === 'all') return currentChunks;`;

code = code.replace(filteredByAgentTarget, filteredByAgentReplacement);

fs.writeFileSync('src/components/FullScreenLogViewer.tsx', code);
