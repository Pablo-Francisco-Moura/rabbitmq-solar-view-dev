export function parseUnidadeIds(text) {
  const matches = text.match(/\d+/g) || [];
  return [...new Set(matches.map(Number))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
}
