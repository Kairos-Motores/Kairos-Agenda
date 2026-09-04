import { BI_CONFIG } from './biConfig';

// Deriva do biConfig.js — fonte única já mantida para os painéis de BI — quais
// workspaces cada role deve automaticamente ganhar (ou perder) como membro quando
// a role de um usuário muda. Reaproveita o par allowedRoles/workspaceName de cada
// painel: qualquer painel novo que entrar no biConfig já atualiza este mapeamento
// sozinho, sem precisar manter duas listas em paralelo.
//
// COMUM é excluído de propósito: no biConfig ele aparece em todos os 5 Kanbans de
// unidade (um por filial), mas isso não significa que um usuário COMUM deva virar
// membro das 5 sedes — o vínculo dele com a própria unidade já é feito no onboarding
// (App.jsx, escolha da filial) e não deve ser mexido por este mapeamento.
const ROLES_EXCLUDED_FROM_AUTO_MEMBERSHIP = ['COMUM'];

// Roles usadas em checagens de permissão pelo app (hasRole/checkAccess) mas que não
// aparecem em nenhum painel do biConfig — precisam existir na lista de seleção do
// editor de roles mesmo sem gerar entrada no mapeamento acima.
const EXTRA_KNOWN_ROLES = ['SECRETARIA'];

const buildRoleWorkspaceMap = () => {
    const map = {};
    BI_CONFIG.forEach(panel => {
        (panel.allowedRoles || []).forEach(role => {
            if (ROLES_EXCLUDED_FROM_AUTO_MEMBERSHIP.includes(role)) return;
            if (!map[role]) map[role] = new Set();
            map[role].add(panel.workspaceName);
        });
    });
    const plain = {};
    Object.keys(map).forEach(role => { plain[role] = Array.from(map[role]); });
    return plain;
};

// { ROLE: ['Workspace A', 'Workspace B', ...] }
export const ROLE_WORKSPACE_MAP = buildRoleWorkspaceMap();

// Lista completa de roles conhecidas pelo app, para popular o editor de roles.
export const ALL_KNOWN_ROLES = Array.from(new Set([
    ...ROLES_EXCLUDED_FROM_AUTO_MEMBERSHIP,
    ...Object.keys(ROLE_WORKSPACE_MAP),
    ...EXTRA_KNOWN_ROLES
])).sort();
