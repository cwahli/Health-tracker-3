import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

async function run() {
  try {
    const usersSnap = await db.collection('users').get();
    let targetUid = null;
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email && data.email.toLowerCase() === 'cwah.liu@gmail.com') {
        targetUid = doc.id;
      }
    });

    if (!targetUid) {
      console.log("User not found!");
      return;
    }
    const uid = targetUid;
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
