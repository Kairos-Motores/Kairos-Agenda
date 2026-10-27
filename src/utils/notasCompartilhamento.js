/**
 * Utilitários para compartilhamento e permissões de notas do Kairós.
 *
 * Formatos suportados em cr4a1_privado (MaxLength 100):
 * 1. JSON compacto: {"user1":"w","user2":"r"}
 * 2. Delimitado: user1:w,user2:r
 *
 * Permissões:
 * - 'edicao' (salvo como 'w'): leitura e edição
 * - 'leitura' (salvo como 'r'): apenas leitura
 */

export const PERMISSAO_LEITURA = 'leitura';
export const PERMISSAO_EDICAO = 'edicao';

/**
 * Converte valor bruto do Dataverse (cr4a1_privado) em objeto de permissões:
 * { [username]: 'edicao' | 'leitura' }
 */
export function parseCompartilhamento(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const normalizado = {};
    for (const [u, p] of Object.entries(raw)) {
      if (u) {
        normalizado[u] = (p === 'w' || p === 'edicao') ? PERMISSAO_EDICAO : PERMISSAO_LEITURA;
      }
    }
    return normalizado;
  }

  const str = String(raw).trim();
  if (!str) return {};

  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      const normalizado = {};
      for (const [u, p] of Object.entries(parsed)) {
        if (u) {
          normalizado[u] = (p === 'w' || p === 'edicao') ? PERMISSAO_EDICAO : PERMISSAO_LEITURA;
        }
      }
      return normalizado;
    } catch {
      return {};
    }
  }

  // Fallback para formato compacto "user1:w,user2:r"
  const result = {};
  str.split(',').forEach(item => {
    const [u, p] = item.split(':').map(s => s?.trim());
    if (u) {
      result[u] = (p === 'w' || p === 'edicao') ? PERMISSAO_EDICAO : PERMISSAO_LEITURA;
    }
  });
  return result;
}

/**
 * Serializa objeto de compartilhamento para gravação em cr4a1_privado (máx 100 caracteres)
 */
export function serializeCompartilhamento(compartilhamento) {
  if (!compartilhamento || typeof compartilhamento !== 'object') return null;

  const compact = {};
  let count = 0;
  for (const [u, p] of Object.entries(compartilhamento)) {
    if (u && (p === PERMISSAO_EDICAO || p === PERMISSAO_LEITURA || p === 'w' || p === 'r')) {
      compact[u] = (p === PERMISSAO_EDICAO || p === 'w') ? 'w' : 'r';
      count++;
    }
  }

  if (count === 0) return null;

  const jsonStr = JSON.stringify(compact);
  if (jsonStr.length <= 100) {
    return jsonStr;
  }

  // Fallback ultra-compacto se o JSON estourar 100 caracteres
  const compactStr = Object.entries(compact).map(([u, p]) => `${u}:${p}`).join(',');
  return compactStr.slice(0, 100);
}

/**
 * Retorna se o usuário pode visualizar uma determinada nota
 */
export function canUserViewNota(nota, currentUsername) {
  if (!nota) return false;
  const isPrivate = nota.cr4a1_private === true || nota.cr4a1_private === 'true';
  if (!isPrivate) return true;

  const isAuthor = nota.cr4a1_user_login === currentUsername;
  if (isAuthor) return true;

  const compartilhamento = nota.compartilhamento || parseCompartilhamento(nota.cr4a1_privado);
  return Boolean(compartilhamento && compartilhamento[currentUsername]);
}

/**
 * Retorna os privilégios do usuário atual em relação à nota:
 * - isAuthor: se é o autor/proprietário da nota
 * - canEdit: se pode editar conteúdo/título/anexos/checklists
 * - canManagePermissions: se pode vincular/desvincular usuários e alterar permissões (APENAS AUTOR)
 * - canDelete: se pode excluir a nota (APENAS AUTOR)
 * - userPermission: 'autor' | 'edicao' | 'leitura' | 'none'
 */
export function getNotaPermissions(nota, currentUsername) {
  if (!nota) {
    return {
      isAuthor: false,
      canEdit: false,
      canManagePermissions: false,
      canDelete: false,
      userPermission: 'none'
    };
  }

  // Nova nota sendo criada pelo usuário
  if (nota.isNew || !nota.cr4a1_user_login) {
    return {
      isAuthor: true,
      canEdit: true,
      canManagePermissions: true,
      canDelete: false,
      userPermission: 'autor'
    };
  }

  const isAuthor = nota.cr4a1_user_login === currentUsername;
  const compartilhamento = nota.compartilhamento || parseCompartilhamento(nota.cr4a1_privado);
  const sharedPerm = compartilhamento?.[currentUsername];

  if (isAuthor) {
    return {
      isAuthor: true,
      canEdit: true,
      canManagePermissions: true,
      canDelete: true,
      userPermission: 'autor'
    };
  }

  const isPrivate = nota.cr4a1_private === true || nota.cr4a1_private === 'true';

  if (sharedPerm === PERMISSAO_EDICAO) {
    return {
      isAuthor: false,
      canEdit: true,
      canManagePermissions: false,
      canDelete: false,
      userPermission: PERMISSAO_EDICAO
    };
  }

  if (sharedPerm === PERMISSAO_LEITURA) {
    return {
      isAuthor: false,
      canEdit: false,
      canManagePermissions: false,
      canDelete: false,
      userPermission: PERMISSAO_LEITURA
    };
  }

  // Não está explicitamente na lista de compartilhamento
  if (isPrivate) {
    return {
      isAuthor: false,
      canEdit: false,
      canManagePermissions: false,
      canDelete: false,
      userPermission: 'none'
    };
  }

  // Nota pública sem compartilhamento restrito: padrão de edição para membros do workspace
  return {
    isAuthor: false,
    canEdit: true,
    canManagePermissions: false,
    canDelete: false,
    userPermission: PERMISSAO_EDICAO
  };
}
