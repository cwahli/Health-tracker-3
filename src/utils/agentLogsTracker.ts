export interface AgentLogEntry {
  timestamp: string;
  message: string;
}

export interface AgentRequestLog {
  id: string;
  timestamp: string;
  summary: string;
  logs: AgentLogEntry[];
}

export const saveAgentRequestLog = (requestLog: AgentRequestLog) => {
  // Strip large base64 image data before saving to stay within localStorage quota
  const sanitized: AgentRequestLog = {
    ...requestLog,
    logs: requestLog.logs.map(log => ({
      ...log,
      message: log.message.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{200,}/g, '[image data stripped]')
    }))
  };
  const existing = getAgentRequestLogs();
  existing.unshift(sanitized);
  
  // Limit to the last 5 requests to stay well within localStorage quota
  if (existing.length > 5) {
    existing.length = 5;
  }

  try {
    localStorage.setItem('agent_request_logs', JSON.stringify(existing));
  } catch (error) {
    console.warn("[Storage Quota Exceeded] Attempting to save fewer logs...");
    // Fallback: keep only the 2 most recent logs to free up space
    try {
      if (existing.length > 2) {
        existing.length = 2;
        localStorage.setItem('agent_request_logs', JSON.stringify(existing));
      }
    } catch (innerErr) {
      // Last-ditch: keep only the single most recent log
      try {
        existing.length = 1;
        localStorage.setItem('agent_request_logs', JSON.stringify(existing));
      } catch (lastErr) {
        console.error("Could not save even a single agent request log to localStorage due to storage constraints.", lastErr);
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agent_logs_updated'));
  }
};

export const getAgentRequestLogs = (): AgentRequestLog[] => {
  try {
    const data = localStorage.getItem('agent_request_logs');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const deleteAgentRequestLog = (id: string) => {
  const existing = getAgentRequestLogs();
  const updated = existing.filter(r => r.id !== id);
  localStorage.setItem('agent_request_logs', JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('agent_logs_updated'));
  }
};
