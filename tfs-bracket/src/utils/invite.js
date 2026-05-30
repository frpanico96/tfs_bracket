import { addDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, invitesRef, db } from "../firebase";

export async function createInvite({ email, role, createdBy, createdByName }) {
  const token = crypto.randomUUID();
  const inviteRef = await addDoc(invitesRef, {
    token,
    email: email.toLowerCase().trim(),
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
