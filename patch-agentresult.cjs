const fs = require('fs');
let content = fs.readFileSync('src/components/AgentResultTable.tsx', 'utf8');

const sanitizeFn = `function sanitizeUnitText(rawUnit: any): string {
  if (!rawUnit) return '';
  return String(rawUnit)
    .toLowerCase()
    .replace(/[\\s]+/g, ' ')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/percent/g, '%')
    .replace(/\\^/g, '*')
    .replace(/^[a-z]*(?=10)/g, '')
    .replace(/[x×]/g, '')
    .trim();
}

`;

if (!content.includes('function sanitizeUnitText')) {
  content = content.replace(
    /export const AgentResultTable: React\.FC<AgentResultTableProps> = \(\{/,
    sanitizeFn + 'export const AgentResultTable: React.FC<AgentResultTableProps> = ({'
  );
}

content = content.replace(
  /const isSameUnit = \(unit1: string, unit2: string\) => \{[^}]+\};/g,
  `const isSameUnit = (unit1: string, unit2: string) => {
          if (!unit1 || !unit2) return unit1 === unit2;
          return sanitizeUnitText(unit1) === sanitizeUnitText(unit2);
        };`
);

content = content.replace(
  /const isUnitChanged = rawUnit && rawUnit !== rowUnit;/g,
  `const isUnitChanged = rawUnit && sanitizeUnitText(rawUnit) !== sanitizeUnitText(rowUnit);`
);

fs.writeFileSync('src/components/AgentResultTable.tsx', content);
