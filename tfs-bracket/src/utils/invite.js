import { addDoc, doc, getDocs, runTransaction, query, where, serverTimestamp, increment, invitesRef, db } from "../firebase";

export async function createInvite({ email, role, createdBy, createdByName }) {
  const normalized = email.toLowerCase().trim();

  const existing = query(invitesRef, where("email", "==", normalized));
  const snap = await getDocs(existing);
  const found = snap.docs.find((d) => d.data().role === role && !d.data().used);
  if (found) {
    return { id: found.id, token: found.data().token, existing: true };
  }

  const token = crypto.randomUUID();
  const inviteRef = await addDoc(invitesRef, {
    token,
    email: normalized,
    role,
    used: false,
    createdBy,
    createdByName,
    createdAt: serverTimestamp(),
  });
  return { id: inviteRef.id, token };
}

export async function createGenericInvite({ maxUses, expiresAt, createdBy, createdByName }) {
  const token = crypto.randomUUID();
  const inviteRef = await addDoc(invitesRef, {
    token,
    role: "player",
    maxUses,
    usedCount: 0,
    expiresAt,
    createdBy,
    createdByName,
    createdAt: serverTimestamp(),
  });
  return { id: inviteRef.id, token };
}

export async function getInviteByToken(token) {
  const q = query(invitesRef, where("token", "==", token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();

  if (data.used) return null;

  if (data.maxUses != null && (data.usedCount || 0) >= data.maxUses) return null;

  if (data.expiresAt) {
    const exp = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
    if (exp < Date.now()) return null;
  }

  return { id: doc.id, ...data };
}

export async function isEmailInvited(email) {
  const q = query(invitesRef, where("email", "==", email.toLowerCase().trim()), where("used", "==", false));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function consumeInvite(inviteId) {
  const ref = doc(db, "invites", inviteId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.used) throw new Error("Invite already consumed");
    if (data.maxUses != null && (data.usedCount || 0) >= data.maxUses) throw new Error("Max uses reached");
    if (data.expiresAt) {
      const exp = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
      if (exp < Date.now()) throw new Error("Invite expired");
    }
    const newCount = (data.usedCount || 0) + 1;
    const updates = { usedCount: increment(1) };
    if (data.maxUses == null || newCount >= data.maxUses) {
      updates.used = true;
    }
    transaction.update(ref, updates);
  });
}

export function buildInviteLink(token) {
  return `${window.location.origin}?invite=${token}`;
}

export const INVITE_ROLES = [
  { value: "tournament_admin", label: "Tournament Admin", desc: "Can create and manage tournaments" },
  { value: "player", label: "Player", desc: "Can view and join tournaments" },
];
