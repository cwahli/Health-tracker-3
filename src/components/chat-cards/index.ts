export * from './types';
export * from './FoodIdeaCard';
export * from './FoodCard';
export * from './BiomarkerCard';
export * from './WelcomeCard';

import { FoodIdeaCard } from './FoodIdeaCard';
import { FoodCard } from './FoodCard';
import { BiomarkerCard } from './BiomarkerCard';
import { WelcomeCard } from './WelcomeCard';
import { AgentType } from '../../utils/agentConfig';

export const agentCardRegistry: Record<string, React.FC<any>> = {
  food_idea: FoodIdeaCard,
  food: FoodCard,
  agent1: BiomarkerCard,
  agent2: BiomarkerCard,
  agent3: BiomarkerCard,
  agent4: BiomarkerCard,
  agent5: BiomarkerCard,
  agent6: BiomarkerCard,
  agent7: BiomarkerCard,
  data_review: BiomarkerCard,
  medical: BiomarkerCard,
  medical_extract: BiomarkerCard,
  welcome: WelcomeCard
};
