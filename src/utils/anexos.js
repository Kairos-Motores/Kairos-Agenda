// Mesmo padrão já usado pelos anexos de evento e evidências do SSMA: cada arquivo vira um
// data URL base64 guardado direto numa coluna de texto do Dataverse (sem serviço de storage
// à parte). O campo aguenta ~1.048.576 caracteres — damos uma boa margem abaixo disso pra
// sobrar espaço pro JSON em volta (nome, tamanho...) e pra mais de um arquivo.
export const MAX_ANEXO_BYTES = 400 * 1024; // 400 KB por arquivo
export const MAX_TOTAL_ANEXOS_BYTES = 700 * 1024; // ~700 KB somando todos os anexos do mesmo registro

export const formatarTamanho = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const parseAnexos = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

export const lerArquivoComoBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const somaTamanhos = (anexos) => anexos.reduce((acc, a) => acc + (a.size || 0), 0);

export const tipoDoAnexo = (anexo) => {
  const nome = (anexo?.name || '').toLowerCase();
  if (anexo?.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(nome)) return 'imagem';
  if (anexo?.type === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  return 'arquivo';
};
