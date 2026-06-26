// src/utils/permissions.js

// Defina as suas roles aqui como constantes
export const ROLES = {
  ADMIN: 'ADMIN',
  QUALIDADE: 'QUALIDADE',
  COMUM: 'COMUM',
  BI_USER: 'BI_VISUALIZER', // <--- Sua nova role de BI
  FINANCEIRO: 'FINANCEIRO'
};

// Função central de checagem
export const checkAccess = (userRoleString, allowedRoles) => {
  if (!userRoleString) return false;
  
  // Transforma a string do Dataverse em array limpo
  const rolesArray = userRoleString.split(',').map(r => r.trim());
  
  // ADMIN sempre tem acesso a tudo
  if (rolesArray.includes(ROLES.ADMIN)) return true;
  
  // Verifica se o usuário tem PELO MENOS UMA das roles permitidas
  return rolesArray.some(role => allowedRoles.includes(role));
};