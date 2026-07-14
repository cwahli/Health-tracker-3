import React, { useState, useRef } from 'react';
import { AgentCardProps } from './types';
import { ErrorBoundary } from '../ErrorBoundary';
import { AGENT_REGISTRY } from '../../utils/agentConfig';
import { CheckCircle, XCircle, Activity, Target, Calendar, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const HealthBaselineCard: React.FC<AgentCardProps> = ({
  msg,
  onAgentFinish,
  setLoggedMessageIds,
  loggedMessageIds,
  onDeleteMessage
}) => {
  const [unselectedKeys, setUnselectedKeys] = useState<Set<number>>(new Set());
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (msg.agentType !== 'health_baseline') return null;

  const agentConfig = AGENT_REGISTRY[msg.agentType];
  const report = msg.data?.agentResult?.report || msg.data?.agentResult || {};

  const riskCategories = Array.isArray(report.riskCategories) ? report.riskCategories : [];
  const biomarkerTargets = Array.isArray(report.biomarkerTargets) ? report.biomarkerTargets : [];
  const nutrientTargets = Array.isArray(report.nutrientTargets) ? report.nutrientTargets : (Array.isArray(report.topNutrientTargets) ? report.topNutrientTargets : []);
  const dailyActivities = Array.isArray(report.dailyActivities) ? report.dailyActivities : [];
  const generalNutrientTargets = report.generalNutrientTargets || {};
  const globalSummary = report.globalSummary || '';
  const timelineToOptimal = report.timelineToOptimal || '';

  const isHandled = (loggedMessageIds || []).includes(msg.id);

  const scrollToCard = (index: number) => {
    const container = scrollContainerRef.current;
    if (container) {
      const children = container.children;
      if (children && children[index]) {
        (children[index] as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
        setCurrentCardIndex(index);
      }
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const children = container.children;
    if (!children || children.length === 0) return;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    const containerCenter = container.getBoundingClientRect().left + container.clientWidth / 2;
    
    for (let i = 0; i < children.length; i++) {
      const childRect = children[i].getBoundingClientRect();
      const childCenter = childRect.left + childRect.width / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    setCurrentCardIndex(closestIndex);
  };

  const toggleSelection = (idx: number) => {
    setUnselectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleApply = async (unselected: number[]) => {
    if (onAgentFinish) {
      if (msg.data && msg.data.agentResult) {
         msg.data.agentResult.unselectedRowKeys = unselected;
      }
      await onAgentFinish(msg.agentType!, msg.data?.agentResult);
      setLoggedMessageIds?.(prev => [...prev, msg.id]);
    }
  };

  const handleDismiss = () => {
    if (onDeleteMessage) {
      onDeleteMessage(msg.id);
    } else {
      setLoggedMessageIds?.(prev => [...prev, msg.id]);
    }
  };

  return (
    <ErrorBoundary>
      {!hasStarted ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {agentConfig?.displayName || 'Health Baseline Analysis'}
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {typeof agentConfig?.welcomeMessage === 'function' 
              ? agentConfig.welcomeMessage() 
              : (agentConfig?.welcomeMessage || "I've analyzed your health markers and have created a tailored health baseline plan for you. Would you like to review it?")}
          </p>
          <button
            onClick={() => setHasStarted(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-all active:scale-[0.98]"
          >
            Start Review
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {agentConfig?.displayName || 'Health Baseline Analysis'}
            </h2>
          </div>

          {globalSummary && (
            <div className="py-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Global Summary</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{globalSummary}</p>
            </div>
          )}

          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            style={{ touchAction: 'pan-x' }}
            className="flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {riskCategories.map((category: any, idx: number) => {
              const isSelected = !unselectedKeys.has(idx);
              const mappedBiomarkerTargets = Array.isArray(category.biomarkerTargets) ? category.biomarkerTargets : [];

              return (
                <div 
                  key={idx} 
                  className={`w-[75%] snap-center shrink-0 transition-all duration-200 ${
                    isSelected 
                      ? 'opacity-100' 
                      : 'opacity-40'
                  } ${idx !== riskCategories.length - 1 ? 'border-r border-slate-800 pr-4' : ''}`}
                >
                  <div className="py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          category.level === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                          category.level === 'medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        }`} />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {category.categoryName}
                        </h4>
                        <div className="text-xs font-medium text-slate-500 capitalize">
                          {category.level} Risk
                        </div>
                      </div>
                    </div>
                    {!isHandled && (
                      <button
                        onClick={() => toggleSelection(idx)}
                        className={`p-2 rounded-xl flex items-center space-x-1.5 transition-colors ${
                          isSelected 
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400' 
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? (
                          <><CheckCircle className="w-4 h-4" /><span className="text-xs font-medium hidden sm:inline">Included</span></>
                        ) : (
                          <><XCircle className="w-4 h-4" /><span className="text-xs font-medium hidden sm:inline">Excluded</span></>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="py-2 space-y-5">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Analysis</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {category.description || category.analysis}
                      </p>
                    </div>

                    {category.unaddressedRisk && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider">Unaddressed Risk</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {category.unaddressedRisk}
                        </p>
                      </div>
                    )}

                    {mappedBiomarkerTargets.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                          <Target className="w-3.5 h-3.5" />
                          <span>Biomarker Targets</span>
                        </div>
                        <div className="grid gap-2">
                          {mappedBiomarkerTargets.map((bt: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-2">
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{bt.name || bt.biomarkerKey}</div>
                                {bt.reasoning && <div className="text-xs text-slate-500 leading-relaxed">{bt.reasoning}</div>}
                              </div>
                              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap ml-4">
                                {bt.targetValue}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Targets (if any mapped directly to category) */}
                    {(category.nutrientTargets?.length > 0 || category.dailyActivities?.length > 0) && (
                      <div className="space-y-5">
                          {category.nutrientTargets?.length > 0 && (
                          <div className="space-y-3">
                              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nutrient Targets</div>
                              <div className="grid gap-2">
                                {category.nutrientTargets.map((nt: any, i: number) => (
                                  <div key={i} className="py-2 flex flex-col space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{nt.nutrientKey}</span>
                                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{nt.targetValue}</span>
                                    </div>
                                    {(nt.rationale || nt.reasoning) && <div className="text-xs text-slate-500 leading-relaxed">{nt.rationale || nt.reasoning}</div>}
                                  </div>
                                ))}
                              </div>
                          </div>
                          )}
                          {category.dailyActivities?.length > 0 && (
                          <div className="space-y-3">
                              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Daily Activities</div>
                              <div className="space-y-2">
                                {category.dailyActivities.map((da: any, i: number) => (
                                  <div key={i} className="py-2 flex justify-between items-center">
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{da.activity}</div>
                                    <div className="text-sm font-bold text-indigo-500">{da.target}</div>
                                  </div>
                                ))}
                              </div>
                          </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {riskCategories.length > 1 && (
            <div className="flex items-center justify-between py-2">
              <button
                type="button"
                onClick={() => scrollToCard(Math.max(0, currentCardIndex - 1))}
                disabled={currentCardIndex === 0}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
                aria-label="Previous category"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  {riskCategories.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToCard(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        currentCardIndex === idx 
                          ? 'w-4 bg-indigo-600 dark:bg-indigo-500' 
                          : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                      aria-label={`Go to category ${idx + 1}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-450 font-medium">
                  {currentCardIndex + 1} / {riskCategories.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => scrollToCard(Math.min(riskCategories.length - 1, currentCardIndex + 1))}
                disabled={currentCardIndex === riskCategories.length - 1}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
                aria-label="Next category"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Global Targets & Activities */}
          {(nutrientTargets.length > 0 || dailyActivities.length > 0) && (
            <div className="py-4 space-y-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Global Action Plan</h3>
              
              {nutrientTargets.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Key Nutrient Targets</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {nutrientTargets.map((nt: any, i: number) => (
                      <div key={i} className="py-2">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">{nt.nutrientKey}</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-2 text-right">{nt.targetValue}</span>
                        </div>
                        {(nt.rationale || nt.reasoning) && <div className="text-xs text-slate-500 leading-relaxed">{nt.rationale || nt.reasoning}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dailyActivities.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Daily Activities</span>
                  </div>
                  <div className="space-y-2">
                    {dailyActivities.map((da: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{da.activity}</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 ml-3 text-right">{da.target}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {timelineToOptimal && (
            <div className="py-4 space-y-3">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-4 h-4" />
                <span>Timeline to Optimal</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{timelineToOptimal}</p>
            </div>
          )}

          {Object.keys(generalNutrientTargets).length > 0 && (
            <div className="py-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">General Nutrient Targets</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(generalNutrientTargets).map(([key, value]: [string, any]) => (
                  <div key={key} className="py-2 flex flex-col justify-center">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1 capitalize tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isHandled && onAgentFinish && (
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => handleApply(Array.from(unselectedKeys))}
                className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/10 transition-all active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>Accept Selected</span>
              </button>
              
              <button
                onClick={() => handleApply([])}
                className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Accept All</span>
              </button>

              <button
                onClick={handleDismiss}
                className="w-full sm:w-auto p-3 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-100 dark:hover:border-red-500/20 rounded-2xl transition-all active:scale-[0.98]"
                title="Delete / Dismiss"
              >
                <Trash2 className="w-5 h-5" />
                <span className="ml-2 sm:hidden font-bold text-sm">Delete Analysis</span>
              </button>
            </div>
          )}

          {isHandled && onAgentFinish && (
            <div className="flex items-center justify-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Analysis Handled</span>
            </div>
          )}
        </div>
      )}
    </ErrorBoundary>
  );
};
