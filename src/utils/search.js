// Busca que ignora maiúsculas e acentos: "sao" encontra "São", "joao" encontra "João".
export const normalizeSearch = (value) =>
  String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const matchesSearch = (value, query) => normalizeSearch(value).includes(normalizeSearch(query));
