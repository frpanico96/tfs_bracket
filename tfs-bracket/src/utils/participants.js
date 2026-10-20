// Pure helpers for the `participantNameSet` map ({ lowercasedName: true }) that
// Firestore rules and duplicate checks rely on. Keeping the bookkeeping here means
// every add / edit / remove path derives it the same way.

export const nameKey = (name) => String(name).toLowerCase();

export function addNames(nameSet, names) {
  const next = { ...(nameSet || {}) };
  for (const n of Array.isArray(names) ? names : [names]) next[nameKey(n)] = true;
  return next;
}

export function removeName(nameSet, name) {
  const next = { ...(nameSet || {}) };
  delete next[nameKey(name)];
  return next;
}

export function renameName(nameSet, oldName, newName) {
  return addNames(removeName(nameSet, oldName), newName);
}
