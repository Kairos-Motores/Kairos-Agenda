// src/utils/permissions.js

// Defina as suas roles aqui como constantes
export const ROLES = {
  ADMIN: 'ADMIN',
  QUALIDADE: 'QUALIDADE',
  COMUM: 'COMUM',
  BI_USER: 'BI_VISUALIZER', // <--- Sua nova role de BI
  FINANCEIRO: 'FINANCEIRO'
};

// Normaliza a role do Dataverse (string única, string separada por vírgula, ou já um array) em array limpo
export const parseRoles = (userRoleValue) => {
  if (!userRoleValue) return [];
  if (Array.isArray(userRoleValue)) return userRoleValue.map(r => String(r).trim()).filter(Boolean);
  return String(userRoleValue).split(',').map(r => r.trim()).filter(Boolean);
};

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