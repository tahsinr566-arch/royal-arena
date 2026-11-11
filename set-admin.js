// Run this locally from the project root after installing firebase-admin.
// IMPORTANT: Keep your service-account JSON private. Never upload it to GitHub.
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const email = process.argv[2];
if (!email) throw new Error("Usage: node scripts/set-admin.js admin@example.com");

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin claim enabled for ${email}. Ask them to sign out and sign in again.`);
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
