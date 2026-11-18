// src/utils/permissions.js

// Defina as suas roles aqui como constantes
export const ROLES = {
  ADMIN: 'ADMIN',
  QUALIDADE: 'QUALIDADE',
  COMUM: 'COMUM',
  BI_USER: 'BI_VISUALIZER', // <--- Sua nova role de BI
  FINANCEIRO: 'FINANCEIRO',
  GESTOR_BI: 'GESTOR_BI',
  BI_ADMIN: 'BI_ADMIN'
};

// Roles com acesso à Central de Monitoramento e Atualizações dos BIs
export const BI_MONITOR_ROLES = [ROLES.ADMIN, ROLES.GESTOR_BI, ROLES.BI_ADMIN];

// Normaliza a role do Dataverse (string única, string separada por vírgula, ou já um array) em array limpo
export const parseRoles = (userRoleValue) => {
  if (!userRoleValue) return [];
  if (Array.isArray(userRoleValue)) return userRoleValue.map(r => String(r).trim()).filter(Boolean);
  return String(userRoleValue).split(',').map(r => r.trim()).filter(Boolean);
};

// Mesmo padrão de joinAssignees (utils/assignees.js): junta a lista de volta na
// string separada por vírgula que o Dataverse guarda em cr4a1_role.
export const joinRoles = (rolesArray) => (rolesArray || []).filter(Boolean).join(', ');

// Função central de checagem
export const checkAccess = (userRoleValue, allowedRoles) => {
  const rolesArray = parseRoles(userRoleValue);
  if (rolesArray.length === 0) return false;

  // ADMIN sempre tem acesso a tudo
  if (rolesArray.includes(ROLES.ADMIN)) return true;

  // Verifica se o usuário tem PELO MENOS UMA das roles permitidas
  return rolesArray.some(role => allowedRoles.includes(role));
};

// Verifica se o usuário tem alguma role de coordenação, seja ela de que tipo for
// (COORD COMERCIAL, COORD ADM, COORD RH, COORD BRC, etc.) — diferente de checkAccess,
// que só reconhece a string exata "COORD" e ignora as variantes com sufixo de área.
export const hasCoordRole = (userRoleValue) => {
  return parseRoles(userRoleValue).some(role => role.startsWith('COORD'));
};

// Verifica se o usuário tem permissão para acessar a Central de Monitoramento e Atualizações dos BIs
export const canAccessBiMonitoring = (userRoleValue) => {
  return checkAccess(userRoleValue, BI_MONITOR_ROLES);
};

// Unidades oficiais da Kairós
export const UNITS_KAIROS = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

// Mapeamento de unidade -> roles de coordenação correspondentes (usado para liberar menus/BIs de unidades emprestadas)
export const UNIT_TO_COORD_ROLES = {
  'Barcarena': ['COORD BRC'],
  'São Luís': ['COORD ADM', 'COORD PCP', 'COORD SLZ'],
  'Parauapebas': ['COORD PRP'],
  'São José dos Campos': ['COORD SJC'],
  'Aveiro': ['COORD AVR']
};

// Apenas ADMIN, DIRETORIA e COORD (qualquer coordenação) podem usar o Empréstimo de Unidade
export const canBorrowUnit = (userRoleValue) => {
  return checkAccess(userRoleValue, ['ADMIN', 'DIRETORIA', 'COORD']) || hasCoordRole(userRoleValue);
};

// Converte a coluna cr4a1_unidades_emprestimo (string separada por vírgula ou array) em array limpo
export const parseUnidadesEmprestimo = (raw) => {
  if (!raw) return [];
  const lista = Array.isArray(raw) ? raw : String(raw).split(',');
  return [...new Set(lista.map(u => String(u || '').trim()).filter(Boolean))];
};

export const joinUnidadesEmprestimo = (arr = []) => {
  return [...new Set((arr || []).map(u => String(u || '').trim()).filter(Boolean))].join(', ');
};

// Retorna todas as unidades que o usuário pode acessar (sua unidade principal + unidades emprestadas),
// sem alterar sua unidade principal de origem (cr4a1_unidade).
export const getUnidadesAcessiveis = (userObj) => {
  if (!userObj) return [];
  const principal = (userObj.cr4a1_unidade || '').trim();
  const emprestadas = parseUnidadesEmprestimo(userObj.cr4a1_unidades_emprestimo || userObj.unidadesEmprestimo);
  return [...new Set([principal, ...emprestadas].filter(Boolean))];
};