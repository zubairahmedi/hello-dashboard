export default function findConsultant(data, displayName) {
  if (!Array.isArray(data)) return undefined;
  const normalize = (s = '') => s.toString().replace(/[\.\s]/g, '').toLowerCase();
  const target = normalize(displayName);

  // 1) exact normalized match
  let found = data.find(c => normalize(c.name) === target);
  if (found) return found;

  // 2) normalized includes either way
  found = data.find(c => {
    const n = normalize(c.name);
    return n.includes(target) || target.includes(n);
  });
  if (found) return found;

  // 3) fallback: match on all name parts (loose)
  const parts = displayName.split(/\s+/).map(p => p.replace(/[\.]/g, '').toLowerCase());
  found = data.find(c => {
    const name = (c.name || '').toLowerCase();
    return parts.every(p => p.length === 0 ? true : name.includes(p));
  });

  return found;
}
