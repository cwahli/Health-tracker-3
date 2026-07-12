import { ChatMessage } from '../types';

export type AgentType = 'food' | 'medical' | 'food_idea' | 'daily_recommendation' | 'medical_extract' | 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5' | 'agent6' | 'agent7' | 'data_review';

export interface AgentConfig {
  id: AgentType;
  category: 'food' | 'medical' | 'system' | 'insights';
  displayName: string;
  description?: string;
  capabilities: string[];
  allowedModes?: string[];
  systemPrompt?: string;
  welcomeMessage?: string | ((context?: any) => string);
}

export const AGENT_REGISTRY: Record<AgentType, AgentConfig> = {
  food: {
    id: 'food',
    category: 'food',
    displayName: 'Food & Nutrition Agent',
    description: 'Logs and analyzes meals, evaluates nutritional content.',
    capabilities: ['vision', 'nutrition_analysis', 'food_logging'],
    allowedModes: ['new_log', 'modify', 'discussion', 'evaluation'],
    welcomeMessage: 'Hello! Tell me or upload a photo of what you are planning to eat, and I will analyze its health benefits, risk factors, and full 30 nutrient breakdown based on your profile.',
  },
  medical: {
    id: 'medical',
    category: 'medical',
    displayName: 'Medical Diagnostics Agent',
    description: 'Discusses symptoms, medical history, and suggests diagnostic ideas.',
    capabilities: ['diagnostic', 'biomarker_analysis'],
    welcomeMessage: 'Hello! I can help you parse blood report photos, medical test charts, or manual body logs to build a comprehensive profile of your biomarkers. What information would you like to enter today?',
  },
  food_idea: {
    id: 'food_idea',
    category: 'food',
    displayName: 'Culinary Ideation Agent',
    description: 'Suggests recipes and meals tailored to health goals.',
    capabilities: ['recipe_generation', 'meal_planning'],
    welcomeMessage: 'Hello! Do you have any specific food preferences or cravings today? I will need your location to find the best dining options matching your biomarker goals.',
  },
  daily_recommendation: {
    id: 'daily_recommendation',
    category: 'insights',
    displayName: 'Daily Actions Agent',
    description: 'Generates daily action plans and tracks progress.',
    capabilities: ['action_planning'],
    welcomeMessage: 'Hello! I am your AI Health Coach. Let me look at your clinical biomarkers, daily steps, and latest dietary intake to give you a customized, comprehensive health recommendation today.',
  },
  medical_extract: {
    id: 'medical_extract',
    category: 'medical',
    displayName: 'Clinical Data Parser',
    description: 'Extracts biomarkers from raw text or reports into a structured format.',
    capabilities: ['vision', 'medical_extraction'],
    welcomeMessage: 'Hello! I am the Clinical Data Parser. I extract biomarkers and readings from raw text or reports into a structured format.',
  },
  data_review: {
    id: 'data_review',
    category: 'medical',
    displayName: 'Data Accuracy Agent',
    description: 'Reviews and corrects biomarker extraction data.',
    capabilities: ['data_validation'],
    welcomeMessage: (ctx: any) => `Hello! I am your Clinical Calibration Agent. Here is what is about to happen: I will analyze ${ctx?.dataReviewBatchIdx === 'custom' ? 'Custom Test Batch' : 'Batch ' + (ctx?.dataReviewBatchIdx !== null && ctx?.dataReviewBatchIdx !== undefined ? (ctx?.dataReviewBatchIdx as number) + 1 : 1)} containing your raw biomarker readings. I will automatically recognize your demographic parameters (age, gender, ethnicity) and calibrate all reference ranges precisely to your profile. I will then map each biomarker to its standard physiological grouping, potential medical conditions, and break down each medical range clinically (such as Borderline High or Optimal zones) with clear, actionable insights—all without repeating boilerplate demographic lines. Let's start the calibration!`,
  },
  agent1: {
    id: 'agent1',
    category: 'medical',
    displayName: 'Clinical Calibration Agent',
    description: 'Standardizes extracted clinical terminology to a master dictionary.',
    capabilities: ['data_standardization'],
    welcomeMessage: 'Hello! I am the Clinical Data Parser. I extract biomarkers and readings from raw text or reports into a structured format.',
  },
  agent2: {
    id: 'agent2',
    category: 'medical',
    displayName: 'Clinical Assessment Agent',
    description: 'Adds clinical context like standard medical groupings and risk categories.',
    capabilities: ['clinical_context'],
    welcomeMessage: 'Hello! I am the Clinical Ontologist. I map extracted biomarkers to clinical conditions and physiological risk categories.',
  },
  agent3: {
    id: 'agent3',
    category: 'medical',
    displayName: 'Clinical Harmonization Agent',
    description: 'Consolidates overlapping and synonymous terminology.',
    capabilities: ['terminology_consolidation'],
    welcomeMessage: 'Hello! I am the Clinical Data Coordinator. I assemble mapped data into clean physiological buckets.',
  },
  agent4: {
    id: 'agent4',
    category: 'medical',
    displayName: 'Biomarker Synthesis Agent',
    description: 'Generates detailed, personalized explanations and metadata for biomarkers.',
    capabilities: ['biomarker_synthesis'],
    welcomeMessage: 'Hello! I am the Prognostic Diagnostics Assessment agent. I analyze your biomarker history to project timeline risks and identify testing gaps.',
  },
  agent5: {
    id: 'agent5',
    category: 'insights',
    displayName: 'Holistic Review Agent',
    description: 'Reviews profile holistically to generate broad insights.',
    capabilities: ['holistic_analysis'],
    welcomeMessage: 'Hello! I am the Personalized Reference Ranges agent. I calibrate normal biomarker reference ranges to your exact demographics.',
  },
  agent6: {
    id: 'agent6',
    category: 'insights',
    displayName: 'Action Plan Agent',
    description: 'Develops targeted action plans based on holistic review.',
    capabilities: ['action_planning'],
    welcomeMessage: 'Hello! I am the Lifestyle Precision Intervention agent. I translate diagnostic risk into strict dietary and movement targets.',
  },
  agent7: {
    id: 'agent7',
    category: 'insights',
    displayName: 'Health Report Agent',
    description: 'Formats insights and action plans into a cohesive report.',
    capabilities: ['report_generation'],
    welcomeMessage: 'Hello! I am the Medical Literature Consensus agent. I scan PubMed and clinical trials to bring recent scientific debate to your context.',
  }
};
