import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Cloud, RefreshCw, Trash2, Clock, Check, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ApiCallEvent } from '../utils/apiTracker';

interface ApiCallTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function ApiCallTrackerModal({ isOpen, onClose, userEmail }: ApiCallTrackerModalProps) {
  const [events, setEvents] = useState<ApiCallEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gemini' | 'usda' | 'brave' | 'firebase'>('all');

  const loadEvents = () => {
    try {
      const saved = localStorage.getItem('local_api_events');
      if (saved) {
        setEvents(JSON.parse(saved));
      } else {
        setEvents([]);
      }
    } catch (e) {
      console.warn("Could not load api events", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      setSyncStatusMsg('idle');
    }
  }, [isOpen]);

  // Filter events based on selected category tap
  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return events;
    if (selectedCategory === 'firebase') {
      return events.filter(e => e.type === 'firebase_read' || e.type === 'firebase_write' || e.type === 'firebase_delete');
    }
    return events.filter(e => e.type === selectedCategory);
  }, [events, selectedCategory]);

  // Filter events for today (local date)
  const todayEvents = useMemo(() => {
    const todayStr = new Date().toDateString();
    return events.filter(e => new Date(e.timestamp).toDateString() === todayStr);
  }, [events]);

  // Calculate today's totals
  const todayTotals = useMemo(() => {
    const totals = {
      gemini: 0,
      usda: 0,
      brave: 0,
      firebase_read: 0,
      firebase_write: 0,
      firebase_delete: 0
    };
    todayEvents.forEach(e => {
      if (e.type in totals) {
        totals[e.type as keyof typeof totals]++;
      }
    });
    return totals;
  }, [todayEvents]);

  // Group filtered events by queryId (newest query first)
  const groupedQueries = useMemo(() => {
    const groups: Record<string, ApiCallEvent[]> = {};
    filteredEvents.forEach(e => {
      const qid = e.queryId || 'default';
      if (!groups[qid]) {
        groups[qid] = [];
      }
      groups[qid].push(e);
    });
    Object.keys(groups).forEach(qid => {
      groups[qid].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });
    const sortedQueryIds = Object.keys(groups).sort((a, b) => {
      const firstA = new Date(groups[a][0].timestamp).getTime();
      const firstB = new Date(groups[b][0].timestamp).getTime();
      return firstB - firstA;
    });
    return sortedQueryIds.map((qid, idx) => {
      const queryEvents = groups[qid];
      const firstEvent = queryEvents[0];
      const lastEvent = queryEvents[queryEvents.length - 1];
      
      const durationMs = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();
      const durationStr = durationMs > 0 
        ? (durationMs >= 60000 
            ? `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
            : `${Math.floor(durationMs / 1000)}s`)
        : 'instant';
      const counts = {
        gemini: 0,
        usda: 0,
        brave: 0,
        firebase_read: 0,
        firebase_write: 0,
        firebase_delete: 0
      };
      queryEvents.forEach(e => {
        if (e.type in counts) {
          counts[e.type as keyof typeof counts]++;
        }
      });
      return {
        queryId: qid,
        displayNumber: sortedQueryIds.length - idx,
        events: queryEvents,
        duration: durationStr,
        counts,
        firstTimestamp: firstEvent.timestamp
      };
    });
  }, [filteredEvents]);

  // Day by day query grouping
  const dayByDayQueries = useMemo(() => {
    const dayGroups: Record<string, typeof groupedQueries> = {};
    groupedQueries.forEach(q => {
      const date = new Date(q.firstTimestamp);
      const dayStr = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!dayGroups[dayStr]) {
        dayGroups[dayStr] = [];
      }
      dayGroups[dayStr].push(q);
    });
    return dayGroups;
  }, [groupedQueries]);

  const handleSyncToCloud = async () => {
    const unsynced = events.filter(e => e.syncStatus !== 'synced');
    if (unsynced.length === 0) {
      setSyncStatusMsg('success');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg('idle');
    try {
      const batch = writeBatch(db);
      unsynced.forEach(event => {
        const docRef = doc(collection(db, 'api_events'));
        batch.set(docRef, {
          ...event,
          syncStatus: 'synced',
          syncedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      const updatedEvents = events.map(e => ({
        ...e,
        syncStatus: 'synced' as const
      }));
      localStorage.setItem('local_api_events', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      setSyncStatusMsg('success');
    } catch (err) {
      console.error("Failed to sync api events", err);
      setSyncStatusMsg('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all local API log history?")) {
      localStorage.removeItem('local_api_events');
      setEvents([]);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toTimeString().split(' ')[0];
    } catch (e) {
      return '00:00:00';
    }
  };

  const getTypeColor = (type: ApiCallEvent['type']) => {
    switch (type) {
      case 'gemini':
        return 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-900/30';
      case 'usda':
        return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-900/30';
      case 'brave':
        return 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-900/30';
      case 'firebase_read':
        return 'text-sky-600 bg-sky-50 border-sky-100 dark:text-sky-400 dark:bg-sky-900/20 dark:border-sky-900/30';
      case 'firebase_write':
        return 'text-purple-600 bg-purple-50 border-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-900/30';
      case 'firebase_delete':
        return 'text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-900/30';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-slate-900/20 dark:border-slate-900/30';
    }
  };

  const getTypeLabel = (type: ApiCallEvent['type']) => {
    switch (type) {
      case 'gemini': return 'Gemini Agent';
      case 'usda': return 'USDA Lookup';
      case 'brave': return 'Brave Search';
      case 'firebase_read': return 'Firestore Read';
      case 'firebase_write': return 'Firestore Write';
      case 'firebase_delete': return 'Firestore Delete';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full h-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden animation-fade-in text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">API & Agent Call Tracker</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track developer usage, database quotas, and agent diagnostics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncToCloud}
              disabled={isSyncing}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                isSyncing 
                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-850 dark:text-slate-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync to Cloud
            </button>
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-450 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
              title="Clear Local History"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scroll Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {syncStatusMsg === 'success' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center gap-2 text-xs">
              <Check className="w-4 h-4" />
              <span>All offline API events successfully synchronized with Firestore!</span>
            </div>
          )}
          {syncStatusMsg === 'error' && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Network error: Cloud synchronization failed. Please try again.</span>
            </div>
          )}

          {/* Today's Breakdown Dashboard (No box backgrounds, tap to filter) */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Today's Summary</h3>
              {selectedCategory !== 'all' && (
                <button 
                  onClick={() => setSelectedCategory('all')} 
                  className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                >
                  Clear filter (Show All)
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Gemini Agent Filter */}
              <div 
                onClick={() => setSelectedCategory(selectedCategory === 'gemini' ? 'all' : 'gemini')}
                className={`cursor-pointer select-none transition-all duration-200 py-3 px-1 border-b-2 text-center sm:text-left ${
                  selectedCategory === 'gemini' 
                    ? 'border-indigo-500 opacity-100 scale-[1.03]' 
                    : selectedCategory === 'all'
                      ? 'border-transparent hover:border-indigo-300 opacity-100'
                      : 'border-transparent opacity-40 hover:opacity-75'
                }`}
              >
                <span className="block text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Gemini Agent</span>
                <span className="block text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">{todayTotals.gemini}</span>
              </div>

              {/* USDA Lookups Filter */}
              <div 
                onClick={() => setSelectedCategory(selectedCategory === 'usda' ? 'all' : 'usda')}
                className={`cursor-pointer select-none transition-all duration-200 py-3 px-1 border-b-2 text-center sm:text-left ${
                  selectedCategory === 'usda' 
                    ? 'border-emerald-500 opacity-100 scale-[1.03]' 
                    : selectedCategory === 'all'
                      ? 'border-transparent hover:border-emerald-300 opacity-100'
                      : 'border-transparent opacity-40 hover:opacity-75'
                }`}
              >
                <span className="block text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">USDA Lookups</span>
                <span className="block text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">{todayTotals.usda}</span>
              </div>

              {/* Brave Search Filter */}
              <div 
                onClick={() => setSelectedCategory(selectedCategory === 'brave' ? 'all' : 'brave')}
                className={`cursor-pointer select-none transition-all duration-200 py-3 px-1 border-b-2 text-center sm:text-left ${
                  selectedCategory === 'brave' 
                    ? 'border-amber-500 opacity-100 scale-[1.03]' 
                    : selectedCategory === 'all'
                      ? 'border-transparent hover:border-amber-300 opacity-100'
                      : 'border-transparent opacity-40 hover:opacity-75'
                }`}
              >
                <span className="block text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Brave Search</span>
                <span className="block text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">{todayTotals.brave}</span>
              </div>

              {/* Firebase Call Filter */}
              <div 
                onClick={() => setSelectedCategory(selectedCategory === 'firebase' ? 'all' : 'firebase')}
                className={`cursor-pointer select-none transition-all duration-200 py-3 px-1 border-b-2 text-center sm:text-left ${
                  selectedCategory === 'firebase' 
                    ? 'border-sky-500 opacity-100 scale-[1.03]' 
                    : selectedCategory === 'all'
                      ? 'border-transparent hover:border-sky-300 opacity-100'
                      : 'border-transparent opacity-40 hover:opacity-75'
                }`}
              >
                <span className="block text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-wider">Firebase Call</span>
                <span className="block text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">
                  {todayTotals.firebase_read + todayTotals.firebase_write + todayTotals.firebase_delete}
                </span>
                <span className="block text-[9px] text-slate-450 mt-0.5 font-medium">
                  r: {todayTotals.firebase_read} | w: {todayTotals.firebase_write} | d: {todayTotals.firebase_delete}
                </span>
              </div>
            </div>
          </div>

          {/* Day-by-Day Chronological Query Sessions */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Query History Sessions</h3>
            
            {Object.keys(dayByDayQueries).length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Clock className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <span className="block text-xs text-slate-450">No matching API call history found.</span>
              </div>
            ) : (
              Object.keys(dayByDayQueries).map((dayStr) => (
                <div key={dayStr} className="space-y-3.5">
                  {/* Day Header */}
                  <div className="flex items-center gap-2.5 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{dayStr}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      ({dayByDayQueries[dayStr].length} query{dayByDayQueries[dayStr].length !== 1 ? 'ies' : ''})
                    </span>
                  </div>

                  {/* Sessions within this Day */}
                  <div className="space-y-4">
                    {dayByDayQueries[dayStr].map((q) => (
                      <div key={q.queryId} className="border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 space-y-3 bg-slate-50/10 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                        
                        {/* Query Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Query {q.displayNumber}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono select-all">({q.queryId})</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">Duration: {q.duration === 'instant' ? 'instant' : q.duration}</span>
                          </div>
                        </div>

                        {/* List of actions */}
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {q.events.map((e, eIdx) => (
                            <div key={eIdx} className="flex items-center justify-between gap-4 text-xs">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-slate-450 dark:text-slate-500">{formatTime(e.timestamp)}</span>
                                <span className="font-semibold text-slate-800 dark:text-white">{e.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${getTypeColor(e.type)}`}>
                                  {getTypeLabel(e.type)}
                                </span>
                                {e.syncStatus === 'synced' ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500" title="Synced to Database">Synced</span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500" title="Saved locally offline">Local</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Query Summary footer (No background, white text in dark mode) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] p-0 border-none bg-transparent">
                          <span className="font-black text-slate-500 dark:text-white uppercase tracking-wider">Total calls for this query:</span>
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-white font-medium">
                            {q.counts.gemini > 0 && <span>Gemini Agent: {q.counts.gemini}</span>}
                            {q.counts.usda > 0 && <span>USDA: {q.counts.usda}</span>}
                            {q.counts.brave > 0 && <span>Brave Search: {q.counts.brave}</span>}
                            {(q.counts.firebase_read + q.counts.firebase_write + q.counts.firebase_delete) > 0 && (
                              <span>
                                Firebase: {q.counts.firebase_read + q.counts.firebase_write + q.counts.firebase_delete} 
                                <span className="text-slate-400 dark:text-slate-300 font-normal"> (r:{q.counts.firebase_read} w:{q.counts.firebase_write} d:{q.counts.firebase_delete})</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
