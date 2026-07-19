import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();
const auth = getAuth();

async function run() {
  try {
    const userRecord = await auth.getUserByEmail('Cwah.Liu@gmail.com');
    const uid = userRecord.uid;
    console.log("UID:", uid);

    const consolidatedSnap = await db.collection('users').doc(uid).collection('consolidated_logs').get();
    console.log(`consolidated_logs count: ${consolidatedSnap.size}`);
    
    let totalConsolidatedFoods = 0;
    consolidatedSnap.forEach(doc => {
      const data = doc.data();
      if (data.logs) {
        Object.values(data.logs).forEach((log: any) => {
          if (log.type === 'food') totalConsolidatedFoods++;
        });
      }
    });
    console.log(`Total food logs in consolidated_logs: ${totalConsolidatedFoods}`);

    const legacySnap = await db.collection('users').doc(uid).collection('foodLogs').get();
    console.log(`legacy foodLogs count: ${legacySnap.size}`);

    const profileSnap = await db.collection('users').doc(uid).get();
    const profile = profileSnap.data();
    console.log(`deletedFoodLogIds count: ${Object.keys(profile?.deletedFoodLogIds || {}).length}`);
    console.log(`legacyMigrated: ${profile?.metadata?.legacyMigrated}`);

  } catch (e) {
    console.error(e);
  }
}

run();
