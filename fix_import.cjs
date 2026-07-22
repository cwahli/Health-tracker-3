const fs = require('fs');
let content = fs.readFileSync('src/components/InsightsTab.tsx', 'utf-8');
content = content.replace(/Search\n\} from 'lucide-react';/, "Search, Stethoscope\n} from 'lucide-react';");
fs.writeFileSync('src/components/InsightsTab.tsx', content);
