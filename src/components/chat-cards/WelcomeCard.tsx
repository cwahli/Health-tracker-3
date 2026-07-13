import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AgentType } from '../../utils/agentConfig';

interface WelcomeCardProps {
  msg: any;
  handleSend: (msg: string) => void;
  isAnalyzing: boolean;
  agentType: AgentType | null;
  autoSendMessage?: string;
}

export const WelcomeCard: React.FC<any> = (props) => {
  const { msg, handleSend, isAnalyzing, agentType, autoSendMessage } = props;
  const isFoodIdea = agentType === 'food_idea';
  const isDailyRec = agentType === 'daily_recommendation';

  return (
    <div className="mt-3">
      {isFoodIdea && (
        <button
          type="button"
          onClick={() => handleSend('Surprise me')}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
        >
          Surprise Me
        </button>
      )}
      {isDailyRec && (
        <button
          type="button"
          onClick={() => handleSend("What's up today?")}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
        >
          What's up today?
        </button>
      )}
      {!isFoodIdea && !isDailyRec && (
        <button
          type="button"
          onClick={() => handleSend(autoSendMessage || 'Start')}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
        >
          {autoSendMessage ? (autoSendMessage.toLowerCase().includes('calibrate') ? 'Start Calibration' : 'Start Review') : "Let's start"}
        </button>
      )}
    </div>
  );
};
