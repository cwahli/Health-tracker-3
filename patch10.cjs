const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const targetImports = `import UserManagementTab from './UserManagementTab';
import { Activity } from 'lucide-react';`;

const replacementImports = `import UserManagementTab from './UserManagementTab';
import BackupRestoreTab from './BackupRestoreTab';
import { Activity } from 'lucide-react';`;

if (content.includes(targetImports)) {
  content = content.replace(targetImports, replacementImports);
  console.log("Imports patched.");
  fs.writeFileSync('src/components/Header.tsx', content);
} else {
  console.log("Target not found!");
}
