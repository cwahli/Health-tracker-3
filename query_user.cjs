const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
// Setup admin SDK using default credentials assuming this environment has them
initializeApp({ projectId: 'ai-studio-biomarkerandnutr-08909b73-fa3b-476a-a58f-0cce7d43db2c' });
const db = getFirestore();

async function run() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', 'Cwah.Liu@gmail.com').get();
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }  
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().biomarkers);
    console.log(doc.data().biomarkerHistory);
  });
}
run();
