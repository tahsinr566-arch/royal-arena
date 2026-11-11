const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
initializeApp();
const db = getFirestore();

function requireAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}
function requireUser(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  return request.auth.uid;
}

exports.createTournament = onCall(async (request) => {
  requireAdmin(request);
  const d = request.data || {};
  const title = String(d.title || "").trim();
  const mode = String(d.mode || "");
  const capacity = Number(d.capacity);
  const entryPoints = Number(d.entryPoints);
  const prizePoints = Number(d.prizePoints);
  const date = new Date(d.date);
  if (!title || title.length > 60 || !["Solo","Duo","Squad"].includes(mode) ||
      !Number.isInteger(capacity) || capacity < 2 || capacity > 1000 ||
      !Number.isInteger(entryPoints) || entryPoints < 0 ||
      !Number.isInteger(prizePoints) || prizePoints < 0 || Number.isNaN(date.getTime())) {
    throw new HttpsError("invalid-argument", "Please check tournament details.");
  }
  const ref = db.collection("tournaments").doc();
  await ref.set({
    title, mode, capacity, entryPoints, prizePoints,
    date: date.toISOString(), description: String(d.description || "").slice(0,120),
    joined: 0, status: "open", createdAt: FieldValue.serverTimestamp()
  });
  return { tournamentId: ref.id };
});

exports.updateTournamentStatus = onCall(async (request) => {
  requireAdmin(request);
  const { tournamentId, status } = request.data || {};
  if (!tournamentId || !["open","closed"].includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid tournament or status.");
  }
  const ref = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Tournament not found.");
    tx.update(ref, { status });
  });
  return { ok: true };
});

exports.joinTournament = onCall(async (request) => {
  const uid = requireUser(request);
  const { tournamentId } = request.data || {};
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new HttpsError("invalid-argument", "Tournament ID is required.");
  }
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  const profileRef = db.collection("profiles").doc(uid);
  const entryRef = db.collection("entries").doc(`${tournamentId}_${uid}`);
  await db.runTransaction(async tx => {
    const [tSnap, pSnap, eSnap] = await Promise.all([
      tx.get(tournamentRef), tx.get(profileRef), tx.get(entryRef)
    ]);
    if (!tSnap.exists) throw new HttpsError("not-found", "Tournament not found.");
    if (!pSnap.exists || !String(pSnap.data().ffUid || "").trim()) {
      throw new HttpsError("failed-precondition", "Add your Free Fire UID to your profile first.");
    }
    if (eSnap.exists) throw new HttpsError("already-exists", "You have already joined this tournament.");
    const t = tSnap.data();
    if (t.status !== "open") throw new HttpsError("failed-precondition", "Registration is closed.");
    if (Number(t.joined || 0) >= Number(t.capacity || 0)) throw new HttpsError("resource-exhausted", "Tournament is full.");
    // Entry points are informational in this starter. No real-money or wallet debit is implemented.
    tx.create(entryRef, {
      tournamentId, userId: uid, ffUid: pSnap.data().ffUid,
      displayName: pSnap.data().displayName || "Player",
      createdAt: FieldValue.serverTimestamp(), status: "registered"
    });
    tx.update(tournamentRef, { joined: FieldValue.increment(1) });
  });
  return { ok: true };
});

// Demo-point adjustments are admin-only and are never exposed as a client-side write.
exports.adjustDemoPoints = onCall(async (request) => {
  requireAdmin(request);
  const { userId, amount, note } = request.data || {};
  if (typeof userId !== "string" || !Number.isInteger(amount) || Math.abs(amount) > 100000) {
    throw new HttpsError("invalid-argument", "Invalid user or point amount.");
  }
  const walletRef = db.collection("wallets").doc(userId);
  await db.runTransaction(async tx => {
    const snap = await tx.get(walletRef);
    const current = snap.exists ? Number(snap.data().balance || 0) : 0;
    const next = current + amount;
    if (next < 0) throw new HttpsError("failed-precondition", "Balance cannot be negative.");
    tx.set(walletRef, { balance: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { ok: true, note: String(note || "Admin adjustment").slice(0,100) };
});
