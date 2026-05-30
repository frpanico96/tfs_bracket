import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, db } from "../firebase";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMINS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getFallbackRole(user) {
  return ADMIN_EMAILS.includes(user?.email?.toLowerCase()) ? "admin" : "player";
}

export default function useUserRole(user) {
  const [role, setRole] = useState(() => user ? null : null);
  const [loading, setLoading] = useState(() => !user);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        if (snap.exists()) {
          setRole(snap.data().role || "player");
        } else {
          const newRole = getFallbackRole(user);
          await setDoc(ref, {
            role: newRole,
            email: user.email,
            name: user.displayName,
            createdAt: serverTimestamp(),
          });
          if (!cancelled) setRole(newRole);
        }
      } catch {
        if (!cancelled) setRole(getFallbackRole(user));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { role, isGlobalAdmin: role === "admin", loading };
}
