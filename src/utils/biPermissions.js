// src/utils/biPermissions.js
//
// Um painel de BI (biConfig.js) tem um allowedRoles padrão definido no código.
// A tabela cr4a1_bi_permissaos guarda overrides opcionais desse valor, editáveis
// pelo ADMIN em tempo real via Gerir Utilizadores > Painéis BI — sem precisar de
// deploy. Este arquivo centraliza como os dois se combinam, para o DashboardPanel
// (decide o que aparece pra cada usuário) e o editor de permissões usarem a mesma
// lógica.
import { checkAccess, parseRoles } from './permissions';

// [{ cr4a1_biid, cr4a1_rolespermitidas, ... }] -> { [biId]: ['ROLE1', 'ROLE2'] }
export const buildBiRolesOverrideMap = (biPermissoes = []) =>
    biPermissoes.reduce((acc, row) => {
        if (row.cr4a1_biid) acc[row.cr4a1_biid] = parseRoles(row.cr4a1_rolespermitidas);
        return acc;
    }, {});

// As roles que hoje decidem quem vê o painel: o override do Dataverse se existir
// (mesmo que seja uma lista vazia — "escondido de todo mundo"), senão o allowedRoles
// estático do biConfig.js.
export const getEffectiveAllowedRoles = (bi, overridesByBiId = {}) =>
    Object.prototype.hasOwnProperty.call(overridesByBiId, bi.id) ? overridesByBiId[bi.id] : bi.allowedRoles;

export const hasBiOverride = (bi, overridesByBiId = {}) =>
    Object.prototype.hasOwnProperty.call(overridesByBiId, bi.id);

export const isBiVisibleForRoles = (bi, roleValue, overridesByBiId = {}) => {
    const allowed = getEffectiveAllowedRoles(bi, overridesByBiId);
    return allowed.includes('ALL') || checkAccess(roleValue, allowed);
};
