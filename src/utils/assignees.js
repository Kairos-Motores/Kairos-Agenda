// Um evento pode ter mais de um responsável: são guardados como uma lista separada
// por vírgulas no mesmo campo de texto cr4a1_user_login (mesmo padrão já usado em
// cr4a1_membros_logins nos workspaces).

export const parseAssignees = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
};

export const joinAssignees = (usernames) => (usernames || []).filter(Boolean).join(', ');

export const isAssignedTo = (eventLoginField, username) => parseAssignees(eventLoginField).includes(username);
