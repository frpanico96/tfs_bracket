export function getUserName(user) {
  if (!user) return "Player";
  const p = user.providerData?.[0];
  return user.displayName || p?.displayName || user.email || "Player";
}

export function getUserPhoto(user) {
  if (!user) return null;
  const p = user.providerData?.[0];
  return user.photoURL || p?.photoURL || null;
}

export function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
