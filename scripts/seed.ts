// Seeds the petition document and demo comments. Usage: npm run seed (reads .env.local).
import { cert, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { seedComments, seedPetition } from "../src/data/seed";

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, PETITION_ID = "default" } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY");
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

async function main() {
  const petition = db.collection("petitions").doc(PETITION_ID);
  const existing = await petition.collection("comments").limit(1).get();
  if (!existing.empty) throw new Error(`petitions/${PETITION_ID} already has comments; refusing to reseed`);

  const batch = db.batch();
  batch.set(petition, seedPetition);
  for (const c of seedComments()) {
    batch.set(petition.collection("comments").doc(), { ...c, createdAt: Timestamp.fromDate(new Date(c.createdAt)) });
  }
  await batch.commit();
  console.log(`Seeded petitions/${PETITION_ID}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
