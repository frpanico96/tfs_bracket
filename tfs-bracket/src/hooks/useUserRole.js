import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, db } from "../firebase";
import { getInviteByToken, consumeInvite, isEmailInvited } from "../utils/invite";
import { getUserName } from "../utils/user";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMINS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOW_OPEN_REGISTRATION = import.meta.env.VITE_ALLOW_OPEN_REGISTRATION === "true";

function getProvider(user) {
  const p = user.providerData?.[0];
  if (!p) return "google";
  if (p.providerId === "oidc.discord.com") return "discord";
  return "google";
}

function getFallbackRole(user) {
  return ADMIN_EMAILS.includes(user?.email?.toLowerCase()) ? "admin" : "player";
}

function buildUserData(user, role, provider, email) {
  const data = {
    role,
    name: getUserName(user),
    provider,
    createdAt: serverTimestamp(),
    display_name: "",
  };
  if (email) data.email = email;
  if (provider === "discord") {
    const p = user.providerData?.[0];
    if (p?.uid) data.external_id = p.uid;
  }
  return data;
}

function buildUpdateData(user, role, provider) {
  const data = { role, name: getUserName(user), provider };
  if (provider === "discord") {
    const p = user.providerData?.[0];
    if (p?.uid) data.external_id = p.uid;
  }
  return data;
}

export default function useUserRole(user, inviteToken) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteResult, setInviteResult] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const lastValidation = useRef(0);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const now = Date.now();
      if (inviteToken && now - lastValidation.current < 2000) return;
      lastValidation.current = now;

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        let resolvedRole;
        let registeredViaInvite = false;
        let userDocExists = snap.exists();
        const provider = getProvider(user);
        const email = user.email?.toLowerCase();

        const handleInvite = async (invite) => {
          resolvedRole = invite.role;
          registeredViaInvite = true;

          if (snap.exists()) {
            const updateData = buildUpdateData(user, resolvedRole, provider);
            updateData.registeredViaInvite = true;
            await updateDoc(ref, updateData);
          } else {
            const userData = buildUserData(user, resolvedRole, provider, email);
            userData.registeredViaInvite = true;
            await setDoc(ref, userData);
          }

          await consumeInvite(invite.id);
          userDocExists = true;
          if (!cancelled) setInviteResult({ success: true, role: resolvedRole });
        };

        if (inviteToken) {
          const invite = await getInviteByToken(inviteToken);
          if (invite) {
            if (invite.email) {
              if (invite.email === email) {
                await handleInvite(invite);
              } else {
                if (!cancelled) setInviteResult({ success: false, reason: "email_mismatch" });
              }
            } else {
              await handleInvite(invite);
            }
          } else {
            if (!cancelled) setInviteResult({ success: false, reason: "invalid" });
          }
        }

        if (!resolvedRole) {
          if (userDocExists) {
            resolvedRole = snap.data().role || "player";
            registeredViaInvite = !!snap.data().registeredViaInvite;
          } else {
            resolvedRole = getFallbackRole(user);
            const shouldCreateDoc = ALLOW_OPEN_REGISTRATION || ADMIN_EMAILS.includes(email);
            if (shouldCreateDoc) {
              await setDoc(ref, buildUserData(user, resolvedRole, provider, email));
              userDocExists = true;
            }
          }
        }

        if (!cancelled) setRole(resolvedRole);

        if (ADMIN_EMAILS.includes(email)) {
          if (!cancelled) setIsAuthorized(true);
        } else if (registeredViaInvite) {
          if (!cancelled) setIsAuthorized(true);
        } else if (userDocExists) {
          if (!cancelled) setIsAuthorized(true);
        } else if (email && (await isEmailInvited(email))) {
          if (!cancelled) setIsAuthorized(true);
        } else if (ALLOW_OPEN_REGISTRATION) {
          if (!cancelled) setIsAuthorized(true);
        } else {
          if (!cancelled) setIsAuthorized(false);
        }

        if (!cancelled && userDocExists) {
          const finalSnap = await getDoc(ref);
          if (finalSnap.exists()) {
            const data = finalSnap.data();
            if (!data.external_id && provider === "discord") {
              const p = user.providerData?.[0];
              if (p?.uid) {
                await updateDoc(ref, { external_id: p.uid });
                data.external_id = p.uid;
              }
            }
            setUserDoc(data);
          }
        }
      } catch (err) {
        console.warn("useUserRole: invite processing failed", err);
        if (!cancelled) {
          if (inviteToken) setInviteResult({ success: false, reason: "error" });
          setRole(getFallbackRole(user));
          if (!ALLOW_OPEN_REGISTRATION) setIsAuthorized(false);
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
    loading: user ? loading : false,
    inviteResult,
    isAuthorized: user ? isAuthorized : null,
    userDoc,
  };
}
