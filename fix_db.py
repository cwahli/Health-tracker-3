with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace('import { Firestore } from "@google-cloud/firestore";', 'import { getFirestore, Firestore } from "firebase-admin/firestore";')
content = content.replace('db = new Firestore({', 'db = getFirestore(); // new Firestore({')

with open('server.ts', 'w') as f:
    f.write(content)
