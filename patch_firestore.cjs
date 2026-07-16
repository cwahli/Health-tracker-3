const fs = require('fs');

const filesToPatch = [
  'src/components/FoodHistoryTab.tsx',
  'src/components/Header.tsx',
  'src/components/LogChat.tsx',
  'src/utils/googleBackup.ts',
  'src/utils/syncUtils.ts',
  'src/utils/migrationTask.ts',
  'src/services/SyncService.ts'
];

for (const file of filesToPatch) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');
  
  if (!code.includes('import { trackApiCall')) {
    if (file.startsWith('src/components/')) {
      code = "import { trackApiCall } from '../utils/apiTracker';\n" + code;
    } else if (file.startsWith('src/utils/') || file.startsWith('src/services/')) {
      code = "import { trackApiCall } from './apiTracker';\n" + code;
    }
  }

  // Very basic regex to inject trackApiCall before setDoc, getDoc, updateDoc, deleteDoc, getDocs
  // This is risky if not matched perfectly, but we'll try replacing `await setDoc(`
  code = code.replace(/await setDoc\(/g, "trackApiCall('firebase_write', 'Firestore setDoc');\n      await setDoc(");
  code = code.replace(/await getDoc\(/g, "trackApiCall('firebase_read', 'Firestore getDoc');\n      await getDoc(");
  code = code.replace(/await updateDoc\(/g, "trackApiCall('firebase_write', 'Firestore updateDoc');\n      await updateDoc(");
  code = code.replace(/await deleteDoc\(/g, "trackApiCall('firebase_delete', 'Firestore deleteDoc');\n      await deleteDoc(");
  code = code.replace(/await getDocs\(/g, "trackApiCall('firebase_read', 'Firestore getDocs');\n      await getDocs(");

  fs.writeFileSync(file, code);
}
