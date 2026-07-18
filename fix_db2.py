with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("""    db = getFirestore(); // new Firestore({
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
    });""", """    db = getFirestore(firebaseConfig.firestoreDatabaseId ? getApps()[0] : undefined, firebaseConfig.firestoreDatabaseId);""")

with open('server.ts', 'w') as f:
    f.write(content)
