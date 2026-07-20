const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
initializeApp({
  projectId: firebaseConfig.projectId
});

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function main() {
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    console.log(`User: ${uid}`);
    const imagesSnap = await db.collection('users').doc(uid).collection('foodImages').get();
    console.log(`  Food Images: ${imagesSnap.size}`);
    const foodLogsSnap = await db.collection('users').doc(uid).collection('foodLogs').get();
    console.log(`  Food Logs: ${foodLogsSnap.size}`);
    let missingImages = 0;
    for (const doc of foodLogsSnap.docs) {
       const data = doc.data();
       if (!data.imageUrl && (!data.imageUrls || data.imageUrls.length === 0)) missingImages++;
    }
    console.log(`  Food Logs without images: ${missingImages}`);
    
    // Check if the user document itself has legacy food logs
    const profile = userDoc.data();
    if (profile.foodLogs) {
        console.log(`  Legacy foodLogs array in profile: ${profile.foodLogs.length}`);
        let missing = 0;
        for (const log of profile.foodLogs) {
            if (!log.imageUrl && (!log.imageUrls || log.imageUrls.length === 0)) missing++;
        }
        console.log(`  Legacy foodLogs without images: ${missing}`);
    }
  }
}
main().catch(console.error);
