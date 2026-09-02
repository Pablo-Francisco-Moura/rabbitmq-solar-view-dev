export function parseUnidadeIds(text) {
  const matches = text.match(/\d+/g) || [];
  return [...new Set(matches.map(Number))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
}

// Nomes de unidade sao identificados explicitamente pelo usuario entre aspas
// duplas, um por trecho, podendo aparecer misturados com unidadeIds em
// qualquer linha/token, ex: '928153\n"UFV Sirius"' ou '928153 "UFV"'.
export function parseSearchNomes(text) {
  const matches = [...text.matchAll(/"([^"]*)"/g)];
  return [...new Set(matches.map((match) => match[1].trim()).filter(Boolean))];
}

// unidadeIds fora de aspas duplas (o trecho entre aspas e' removido antes,
// para nao confundir digitos de um nome com um id).
export function parseSearchIds(text) {
  return parseUnidadeIds(text.replace(/"[^"]*"/g, " "));
}
