/**
 * Utilitários para persistir a fila de cores recentes do usuário (Marca-texto e Cartão de Nota)
 * na coluna `cr4a1_cor` (String 100) da tabela `cr4a1_usuarios_agendas` no Dataverse,
 * mantendo 100% de compatibilidade com a cor principal do avatar do usuário.
 *
 * Formato compacto salvo no Dataverse (máx ~95 caracteres, limite da coluna = 100):
 *   "#1a73e8|m:ffeb3b,f48fb1,81c784,4fc3f7,ba68c8,ffb74d|n:e3f2fd,fff9c4,fce4ec,e8f5e9,f3e5f5,fff3e0"
 */

const MAX_RECENTES = 6;

const normalizarHex = (hex) => {
  if (!hex || typeof hex !== 'string') return '';
  const limpo = hex.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(limpo)) return `#${limpo}`;
  return '';
};

const hexSemHash = (hex) => normalizarHex(hex).replace('#', '');

/**
 * Lê o valor bruto de `cr4a1_cor` vindo do Dataverse e separa:
 * - corAvatar: ex. "#1a73e8"
 * - recentesMarcaTexto: array de hex (ex. ["#ffeb3b", "#f48fb1"])
 * - recentesNota: array de hex (ex. ["#e3f2fd", "#fff9c4"])
 */
export function parseUserCorField(rawCor) {
  if (!rawCor || typeof rawCor !== 'string') {
    return {
      corAvatar: '',
      recentesMarcaTexto: [],
      recentesNota: []
    };
  }

  const partes = rawCor.split('|');
  const corAvatar = normalizarHex(partes[0]) || partes[0].trim();
  let recentesMarcaTexto = [];
  let recentesNota = [];

  for (let i = 1; i < partes.length; i++) {
    const seg = partes[i].trim();
    if (seg.startsWith('m:')) {
      recentesMarcaTexto = seg
        .slice(2)
        .split(',')
        .map(normalizarHex)
        .filter(Boolean)
        .slice(0, MAX_RECENTES);
    } else if (seg.startsWith('n:')) {
      recentesNota = seg
        .slice(2)
        .split(',')
        .map(normalizarHex)
        .filter(Boolean)
        .slice(0, MAX_RECENTES);
    }
  }

  return {
    corAvatar,
    recentesMarcaTexto,
    recentesNota
  };
}

/**
 * Serializa a cor do avatar + filas de cores recentes para caber em `cr4a1_cor` (<= 100 chars).
 */
export function serializeUserCorField({ corAvatar, recentesMarcaTexto = [], recentesNota = [] }) {
  const base = normalizarHex(corAvatar) || '#1a73e8';
  const mList = recentesMarcaTexto.map(hexSemHash).filter(Boolean).slice(0, MAX_RECENTES);
  const nList = recentesNota.map(hexSemHash).filter(Boolean).slice(0, MAX_RECENTES);

  const sufixos = [];
  if (mList.length > 0) sufixos.push(`m:${mList.join(',')}`);
  if (nList.length > 0) sufixos.push(`n:${nList.join(',')}`);

  if (sufixos.length === 0) return base;
  const resultado = `${base}|${sufixos.join('|')}`;
  return resultado.slice(0, 100);
}

/**
 * Insere uma nova cor no início da fila de recentes (sem duplicatas, máx 6 itens).
 */
export function adicionarCorRecenteNaFila(filaAtual = [], novaCorHex) {
  const hex = normalizarHex(novaCorHex);
  if (!hex) return Array.isArray(filaAtual) ? filaAtual : [];
  const semDuplicata = (Array.isArray(filaAtual) ? filaAtual : [])
    .map(normalizarHex)
    .filter(c => c && c !== hex);
  return [hex, ...semDuplicata].slice(0, MAX_RECENTES);
}

/**
 * Extrai a cor personalizada do cartão da nota (se houver) de dentro dos blocos de `cr4a1_conteudo`
 * e devolve `{ corNota, blocosLimpos }` para que os blocos normais da nota não exibam o bloco meta.
 */
export function extrairMetaConteudoNota(conteudoBruto, corExistente = '') {
  if (!Array.isArray(conteudoBruto)) {
    return { corNota: normalizarHex(corExistente), blocosLimpos: [] };
  }
  const blocoMeta = conteudoBruto.find(b => b && (b.type === '__meta__' || b.id === '__nota_meta__'));
  const blocosLimpos = conteudoBruto.filter(b => b && b.type !== '__meta__' && b.id !== '__nota_meta__');
  const corNota = normalizarHex(corExistente || blocoMeta?.cor || '');
  return { corNota, blocosLimpos };
}

/**
 * Empacota a cor da nota junto aos blocos de `cr4a1_conteudo` para persistência no Dataverse
 * sem exigir coluna extra em `cr4a1_notas_kairoses`.
 */
export function empacotarMetaConteudoNota(blocos = [], corNota = '') {
  const limpos = (Array.isArray(blocos) ? blocos : []).filter(
    b => b && b.type !== '__meta__' && b.id !== '__nota_meta__'
  );
  const hex = normalizarHex(corNota);
  if (!hex) return limpos;
  return [{ id: '__nota_meta__', type: '__meta__', value: '', cor: hex }, ...limpos];
}
