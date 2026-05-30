import { addDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, invitesRef, db } from "../firebase";

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

export async function getInviteByToken(token) {
  const q = query(invitesRef, where("token", "==", token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  if (data.used) return null;
  return { id: doc.id, ...data };
}

export async function isEmailInvited(email) {
  const q = query(invitesRef, where("email", "==", email.toLowerCase().trim()));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function consumeInvite(inviteId) {
  const ref = doc(db, "invites", inviteId);
  await updateDoc(ref, { used: true });
}

export function buildInviteLink(token) {
  return `${window.location.origin}?invite=${token}`;
}

export const INVITE_ROLES = [
  { value: "tournament_admin", label: "Tournament Admin", desc: "Can create and manage tournaments" },
  { value: "player", label: "Player", desc: "Can view and join tournaments" },
];
