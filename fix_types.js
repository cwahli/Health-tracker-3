const fs = require('fs');

const missingTypes = `export type Severity = 'Normal' | 'Borderline at risk' | 'At risk' | 'Critical' | string;
export interface RangeConfig {
  type?: 'simple' | 'bracket' | string;
  conditions?: any[];
  brackets?: any[];
}
export interface CustomRangeDef {
  key?: string;
  name?: string;
  type?: string;
  conditions?: any[];
  brackets?: any[];
}
export interface SimpleRange {
  type?: 'simple' | string;
  conditions?: any[];
}
export interface BracketRange {
  type?: 'bracket' | string;
  brackets?: any[];
}
export interface CustomRangeFilter {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  ethnicity?: string;
}
export interface AgentAnalysis {
  id?: string;
  timestamp?: string;
  agentId?: string;
  summary?: string;
}
`;

let currentTypes = fs.readFileSync('src/types.ts', 'utf8');
fs.writeFileSync('src/types.ts', missingTypes + currentTypes);
