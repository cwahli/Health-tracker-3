import { Firestore } from "@google-cloud/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const db = new Firestore({
    projectId: config.projectId,
    databaseId: config.firestoreDatabaseId,
});

async function run() {
    try {
        const snap = await db.collection("users").get();
        console.log("Users:", snap.size);
    } catch (e: any) {
        console.error(e.message);
    }
}
run();
