import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, db } from "../firebase";
import { getInviteByToken, consumeInvite, isEmailInvited } from "../utils/invite";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMINS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getFallbackRole(user) {
  return ADMIN_EMAILS.includes(user?.email?.toLowerCase()) ? "admin" : "player";
}

export default function useUserRole(user, inviteToken) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(!user);
  const [inviteResult, setInviteResult] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(!user ? null : false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        let resolvedRole;

        if (snap.exists()) {
          resolvedRole = snap.data().role || "player";
          if (inviteToken) {
            const invite = await getInviteByToken(inviteToken);
            if (invite && invite.email === user.email) {
              resolvedRole = invite.role;
              await updateDoc(ref, { role: resolvedRole });
              await consumeInvite(invite.id);
              if (!cancelled) setInviteResult({ success: true, role: resolvedRole });
            } else if (!invite) {
              if (!cancelled) setInviteResult({ success: false, reason: "invalid" });
            } else {
              if (!cancelled) setInviteResult({ success: false, reason: "email_mismatch" });
            }
          }
        } else {
          if (inviteToken) {
            const invite = await getInviteByToken(inviteToken);
            if (invite && invite.email === user.email) {
              resolvedRole = invite.role;
              await setDoc(ref, {
                role: resolvedRole,
                email: user.email,
                name: user.displayName,
                createdAt: serverTimestamp(),
              });
              await consumeInvite(invite.id);
              if (!cancelled) setInviteResult({ success: true, role: resolvedRole });
            } else if (!invite) {
              if (!cancelled) setInviteResult({ success: false, reason: "invalid" });
            } else {
              if (!cancelled) setInviteResult({ success: false, reason: "email_mismatch" });
            }
          }
          if (!resolvedRole) {
            resolvedRole = getFallbackRole(user);
            await setDoc(ref, {
              role: resolvedRole,
              email: user.email,
              name: user.displayName,
              createdAt: serverTimestamp(),
            });
          }
        }

        if (!cancelled) setRole(resolvedRole);

        const email = user.email?.toLowerCase();
        if (ADMIN_EMAILS.includes(email)) {
          if (!cancelled) setIsAuthorized(true);
        } else {
          try {
            const invited = await isEmailInvited(email);
            if (!cancelled) setIsAuthorized(invited);
          } catch {
            if (!cancelled) setIsAuthorized(false);
          }
        }
      } catch (err) {
        console.warn("useUserRole: invite processing failed", err);
        if (!cancelled) {
          if (inviteToken) setInviteResult({ success: false, reason: "error" });
          setRole(getFallbackRole(user));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, inviteToken]);

  return {
    role,
    isGlobalAdmin: role === "admin" || role === "tournament_admin",
    isSuperAdmin: role === "admin",
    loading,
    inviteResult,
    isAuthorized,
  };
}
