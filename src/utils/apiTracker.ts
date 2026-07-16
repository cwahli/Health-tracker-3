export interface ApiCallEvent {
  timestamp: string;
  type: 'gemini' | 'usda' | 'brave' | 'firebase_read' | 'firebase_write' | 'firebase_delete';
  label: string;
  queryId: string;
  userEmail: string;
}

let currentQueryId = "init_" + Date.now();

export const generateQueryId = () => {
  return "session_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
};

export const setActiveQueryId = (id: string | null) => {
  currentQueryId = id || "main_" + Date.now();
};

export const getActiveQueryId = () => currentQueryId;

export const trackApiCall = (
  type: ApiCallEvent['type'],
  label: string,
  userEmail: string = 'anonymous'
) => {
  const event: ApiCallEvent = {
    timestamp: new Date().toISOString(),
    type,
    label,
    queryId: currentQueryId,
    userEmail
  };
  
  try {
    const existing = localStorage.getItem('local_api_events');
    const events: ApiCallEvent[] = existing ? JSON.parse(existing) : [];
    events.push(event);
    if (events.length > 2000) events.shift();
    localStorage.setItem('local_api_events', JSON.stringify(events));
  } catch (e) {
    console.warn("Could not save api event", e);
  }
};
