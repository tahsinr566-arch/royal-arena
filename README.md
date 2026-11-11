# ROYAL ARENA — PLAY • COMPETE • WIN

A mobile-first esports tournament web app starter inspired by your reference screenshot, with a premium black / navy / gold visual style.

## What is included

- Home, tournament list, Solo / Duo / Squad filters, tournament detail and join flow
- Email/password Firebase Authentication
- Player profile with Free Fire UID
- Demo-points wallet (not real money; no deposits or withdrawals)
- Leaderboard and notifications views
- Admin dashboard with secure custom-claim checks
- Cloud Functions for tournament creation, joining, status changes and demo-point adjustments
- Firestore security rules that block client-side wallet and tournament-entry writes
- Demo preview when Firebase has not yet been configured

## 1. Preview locally

Because this is an ES-module app, use a local web server (not `file://`).

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. Until Firebase is configured, the app runs with sample data. Demo login is intentionally disabled.

## 2. Create and configure Firebase

1. Create a project at https://console.firebase.google.com/
2. Add a **Web app** and copy its Firebase config.
3. Replace the placeholder values in `firebase-config.js`.
4. In Firebase Authentication, enable **Email/Password**.
5. Create a Cloud Firestore database.
6. Publish the rules from `firestore.rules` in Firestore → Rules.
7. Install the Firebase CLI and sign in:

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

Choose JavaScript and Node 20. Copy this project's `functions/index.js` and `functions/package.json` into the generated `functions/` folder, then:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```

If you have not initialized Firestore in the Firebase CLI, run `firebase init firestore` and select `firestore.rules`.

## 3. Make an admin account safely

Admin access uses Firebase **custom claims**, not a password stored in the website.

1. Create your own account through the app.
2. In Firebase Console → Project settings → Service accounts, generate a private service-account key.
3. Save it locally as `service-account.json` in the project root. Do not upload this file.
4. Install the Admin SDK locally and run:

```bash
npm install firebase-admin
node scripts/set-admin.js your-admin-email@example.com
```

5. Sign out and sign in again. The Admin Dashboard will appear.

Keep `service-account.json` private and add it to `.gitignore`. Never paste it into the website or a public repository.

## 4. Deploy frontend to GitHub Pages

1. Upload `index.html`, `styles.css`, `app.js`, `firebase-config.js`, and the other frontend files to your GitHub repository.
2. Open repository **Settings → Pages**.
3. Under Build and deployment, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then Save.
5. Open the published Pages URL.

GitHub Pages hosts only the frontend. Firebase Authentication, Firestore and Cloud Functions run separately on Firebase. This split is intentional: secrets and privileged operations must never live in browser code.

## 5. Important notes

- The default page is a demo preview with sample tournament cards and sample points.
- Demo points are not money. This starter does not process payments, cash prizes, deposits or withdrawals.
- Tournament entry points are displayed as information only; no wallet debit is implemented.
- The leaderboard expects documents in `leaderboard/{userId}` with `displayName`, `points` and optional `ffUid`. Populate it from trusted server-side match-result verification, not from player-submitted scores.
- Notifications are read from `notifications/{notificationId}` documents with a `userId`, `title`, `message` and `createdAt` field.
- Before a public launch, add Firebase App Check, abuse protection, moderation, verified result reporting, privacy policy and support contact details.
- Do not claim that a match result or prize is verified unless your admin process actually verifies it.
