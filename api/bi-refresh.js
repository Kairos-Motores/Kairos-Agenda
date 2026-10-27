/* global process */
import { EMBEDDED_REPORTS, getPowerBIAccessToken } from './bi-embed.js';

const datasetCache = new Map();
const workspaceCapacityCache = new Map();
const bulkCache = { timestamp: 0, data: null };

let dataverseToken = null;
let dataverseTokenExp = 0;
let quotasRecordCache = { id: null, data: null, timestamp: 0 };

function getBrazilDateString(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function parseRoles(userRoleValue) {
  if (!userRoleValue) return [];
  if (Array.isArray(userRoleValue)) return userRoleValue.map(r => String(r).trim()).filter(Boolean);
  return String(userRoleValue).split(',').map(r => r.trim()).filter(Boolean);
}

function checkAccess(userRoleValue, allowedRoles) {
  const rolesArray = parseRoles(userRoleValue);
  return rolesArray.some(role => allowedRoles.includes(role));
}

async function getDataverseToken() {
  const now = Date.now();
  if (dataverseToken && now < dataverseTokenExp - 60000) return dataverseToken;
  const { DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET, DATAVERSE_ENV_URL } = process.env;
  const params = new URLSearchParams({
    client_id: DATAVERSE_CLIENT_ID,
    scope: `${DATAVERSE_ENV_URL}/.default`,
    client_secret: DATAVERSE_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });
  const res = await fetch(`https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const data = await res.json();
  dataverseToken = data.access_token;
  dataverseTokenExp = now + (data.expires_in || 3600) * 1000;
  return dataverseToken;
}

async function getQuotasRecord() {
  const now = Date.now();
  if (quotasRecordCache.data && (now - quotasRecordCache.timestamp < 10000)) {
    return quotasRecordCache;
  }
  const token = await getDataverseToken();
  const { DATAVERSE_ENV_URL } = process.env;
  const res = await fetch(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_bi_permissaos?$filter=cr4a1_biid eq '__user_refresh_quotas__'`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (json.value && json.value.length > 0) {
    const rec = json.value[0];
    let parsed = { quotas: {}, usage: {} };
    try { parsed = JSON.parse(rec.cr4a1_rolespermitidas || '{}'); } catch { /* ignore */ }
    quotasRecordCache = { id: rec.cr4a1_bi_permissaoid, data: parsed, timestamp: now };
    return quotasRecordCache;
  }
  // Cria caso não exista
  const createRes = await fetch(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_bi_permissaos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({
      cr4a1_nome: 'Configuração de Cotas de Atualização de BI',
      cr4a1_biid: '__user_refresh_quotas__',
      cr4a1_rolespermitidas: JSON.stringify({ quotas: {}, usage: {} })
    })
  });
  const created = await createRes.json();
  quotasRecordCache = { id: created.cr4a1_bi_permissaoid, data: { quotas: {}, usage: {} }, timestamp: now };
  return quotasRecordCache;
}

async function saveQuotasRecord(recordId, newConfig) {
  const token = await getDataverseToken();
  const { DATAVERSE_ENV_URL } = process.env;
  await fetch(`${DATAVERSE_ENV_URL}/api/data/v9.2/cr4a1_bi_permissaos(${recordId})`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cr4a1_rolespermitidas: JSON.stringify(newConfig) })
  });
  quotasRecordCache = { id: recordId, data: newConfig, timestamp: Date.now() };
}

async function getDatasetForReport(aadToken, workspaceId, reportId) {
  if (datasetCache.has(reportId)) {
    return datasetCache.get(reportId);
  }
  const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`, {
    headers: { Authorization: `Bearer ${aadToken}` }
  });
  if (!res.ok) {
    throw new Error(`Falha ao obter metadados do relatório (${res.status})`);
  }
  const data = await res.json();
  if (!data.datasetId) {
    throw new Error('Relatório não possui um datasetId associado.');
  }
  datasetCache.set(reportId, data.datasetId);
  return data.datasetId;
}

async function getWorkspaceDedicatedCapacity(aadToken, workspaceId) {
  if (workspaceCapacityCache.has(workspaceId)) {
    return workspaceCapacityCache.get(workspaceId);
  }
  try {
    const res = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}`, {
      headers: { Authorization: `Bearer ${aadToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const isDedicated = !!data.isOnDedicatedCapacity;
      workspaceCapacityCache.set(workspaceId, isDedicated);
      return isDedicated;
    }
  } catch (err) {
    console.warn('[bi-refresh] Erro ao consultar capacidade do workspace:', err.message);
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. GET
    if (req.method === 'GET') {
      const { id, all, userRole, username, quotas, myQuota, force } = req.query;

      // 1.1 Listagem de Cotas para o ADMIN (Gerenciamento de Usuários)
      if (quotas === 'true') {
        if (!checkAccess(userRole, ['ADMIN'])) {
          return res.status(403).json({ ok: false, error: 'Acesso restrito ao administrador.' });
        }
        const record = await getQuotasRecord();
        const todayStr = getBrazilDateString(new Date());
        return res.status(200).json({
          ok: true,
          quotas: record.data.quotas || {},
          usageToday: record.data.usage?.[todayStr] || {},
          todayUsage: record.data.usage?.[todayStr] || {}
        });
      }

      // 1.2 Consulta da cota pessoal do usuário logado
      if (myQuota === 'true') {
        const isAdmin = checkAccess(userRole, ['ADMIN']);
        if (isAdmin) {
          return res.status(200).json({
            ok: true,
            canRefresh: true,
            isAdmin: true,
            dailyLimit: 999,
            usedToday: 0,
            remaining: 999
          });
        }

        if (!username) {
          return res.status(200).json({ ok: true, canRefresh: false, dailyLimit: 0, usedToday: 0, remaining: 0 });
        }

        const record = await getQuotasRecord();
        const todayStr = getBrazilDateString(new Date());
        const userCfg = record.data.quotas?.[username];

        if (!userCfg || userCfg.enabled === false) {
          return res.status(200).json({ ok: true, canRefresh: false, dailyLimit: 0, usedToday: 0, remaining: 0 });
        }

        const dailyLimit = Math.max(1, parseInt(userCfg.dailyLimit, 10) || 1);
        const usedToday = record.data.usage?.[todayStr]?.[username] || 0;
        const remaining = Math.max(0, dailyLimit - usedToday);

        return res.status(200).json({
          ok: true,
          canRefresh: true,
          isAdmin: false,
          dailyLimit,
          usedToday,
          remaining
        });
      }

      // 1.3 Central de Monitoramento (Opção 2 - Apenas ADMIN)
      if (all === 'true') {
        if (!checkAccess(userRole, ['ADMIN'])) {
          return res.status(403).json({
            ok: false,
            error: 'Acesso negado. Apenas administradores têm acesso à central de monitoramento de todos os BIs.'
          });
        }

        const now = Date.now();
        if (force !== 'true' && bulkCache.data && (now - bulkCache.timestamp < 30000)) {
          return res.status(200).json(bulkCache.data);
        }

        const aadToken = await getPowerBIAccessToken();
        const keys = Object.keys(EMBEDDED_REPORTS);
        const reports = [];
        const concurrency = 15;
        let index = 0;

        const worker = async () => {
          while (index < keys.length) {
            const i = index++;
            const k = keys[i];
            const { workspaceId, reportId } = EMBEDDED_REPORTS[k];
            try {
              const datasetId = await getDatasetForReport(aadToken, workspaceId, reportId);

              const refRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes?$top=15`, {
                headers: { Authorization: `Bearer ${aadToken}` }
              });
              const refData = await refRes.json();
              const refreshes = refData.value || [];

              let scheduleTimes = [];
              try {
                const sRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshSchedule`, {
                  headers: { Authorization: `Bearer ${aadToken}` }
                });
                if (sRes.ok) {
                  const sData = await sRes.json();
                  if (sData.enabled && Array.isArray(sData.times)) scheduleTimes = sData.times;
                }
              } catch {
                // ignora schedule indisponível
              }

              const latest = refreshes[0] || null;
              const isRefreshing = latest ? (latest.status === 'Unknown' || latest.status === 'InProgress') : false;
              const todayStr = getBrazilDateString(new Date());
              const refreshesToday = refreshes.filter(r => r.startTime && getBrazilDateString(new Date(r.startTime)) === todayStr);

              let errorDetails = null;
              const failedRefresh = (latest && latest.status === 'Failed') ? latest : refreshes.find(r => r.status === 'Failed');
              if (failedRefresh && failedRefresh.serviceExceptionJson) {
                let parsed = null;
                try {
                  parsed = JSON.parse(failedRefresh.serviceExceptionJson);
                } catch {
                  parsed = { errorDescription: failedRefresh.serviceExceptionJson };
                }
                errorDetails = {
                  refreshId: failedRefresh.id,
                  startTime: failedRefresh.startTime,
                  endTime: failedRefresh.endTime,
                  errorCode: parsed?.errorCode || 'Erro Desconhecido',
                  errorDescription: parsed?.errorDescription || failedRefresh.serviceExceptionJson
                };
              }

              reports.push({
                id: k,
                workspaceId,
                datasetId,
                isRefreshing,
                latestStatus: latest?.status || 'None',
                lastRefreshTime: latest?.endTime || latest?.startTime || null,
                refreshesToday: refreshesToday.length,
                totalScheduledToday: scheduleTimes.length,
                scheduleTimes,
                error: errorDetails
              });
            } catch (err) {
              reports.push({ id: k, error: err.message, latestStatus: 'Error' });
            }
          }
        };

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);

        const summary = {
          total: reports.length,
          completed: reports.filter(r => !r.isRefreshing && r.latestStatus === 'Completed').length,
          failed: reports.filter(r => !r.isRefreshing && r.latestStatus === 'Failed').length,
          inProgress: reports.filter(r => r.isRefreshing).length,
        };

        const payload = {
          ok: true,
          summary,
          reports,
          updatedAt: new Date().toISOString()
        };

        bulkCache.data = payload;
        bulkCache.timestamp = now;

        return res.status(200).json(payload);
      }

      // 1.4 Consulta de um relatório individual (Opção 1)
      const config = EMBEDDED_REPORTS[id];
      if (!config) {
        return res.status(404).json({ ok: false, error: 'Relatório Power BI não configurado para atualização via API' });
      }

      const { workspaceId, reportId } = config;
      const aadToken = await getPowerBIAccessToken();
      const datasetId = await getDatasetForReport(aadToken, workspaceId, reportId);
      const isOnDedicatedCapacity = await getWorkspaceDedicatedCapacity(aadToken, workspaceId);

      // Buscar histórico de atualizações (top 30 para cobrir o dia)
      const refRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes?$top=30`, {
        headers: { Authorization: `Bearer ${aadToken}` }
      });
      if (!refRes.ok) {
        throw new Error(`Falha ao obter histórico de atualizações (${refRes.status})`);
      }
      const refData = await refRes.json();
      const refreshes = refData.value || [];

      // Buscar agendamento configurado
      let scheduleData = null;
      try {
        const sRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshSchedule`, {
          headers: { Authorization: `Bearer ${aadToken}` }
        });
        if (sRes.ok) scheduleData = await sRes.json();
      } catch {
        // Ignora caso agendamento não esteja disponível
      }

      const latest = refreshes[0] || null;
      const isRefreshing = latest ? (latest.status === 'Unknown' || latest.status === 'InProgress') : false;

      // Calcular atualizações de hoje no fuso horário do Brasil
      const todayStr = getBrazilDateString(new Date());
      const refreshesToday = refreshes.filter(r => r.startTime && getBrazilDateString(new Date(r.startTime)) === todayStr);

      const scheduleTimes = (scheduleData && scheduleData.enabled && Array.isArray(scheduleData.times)) ? scheduleData.times : [];
      const totalScheduledToday = scheduleTimes.length;
      const dailyLimit = isOnDedicatedCapacity ? 48 : 8;

      // Extrair detalhes de erro se houver falha
      let errorDetails = null;
      const failedRefresh = (latest && latest.status === 'Failed') ? latest : refreshes.find(r => r.status === 'Failed');
      if (failedRefresh && failedRefresh.serviceExceptionJson) {
        let parsed = null;
        try {
          parsed = JSON.parse(failedRefresh.serviceExceptionJson);
        } catch {
          parsed = { errorDescription: failedRefresh.serviceExceptionJson };
        }
        errorDetails = {
          refreshId: failedRefresh.id,
          startTime: failedRefresh.startTime,
          endTime: failedRefresh.endTime,
          errorCode: parsed?.errorCode || 'Erro Desconhecido',
          errorDescription: parsed?.errorDescription || failedRefresh.serviceExceptionJson || 'Falha ao processar atualização no Power BI.',
          raw: failedRefresh.serviceExceptionJson
        };
      }

      return res.status(200).json({
        ok: true,
        biId: id,
        datasetId,
        isRefreshing,
        lastRefresh: latest ? {
          id: latest.id,
          refreshType: latest.refreshType,
          startTime: latest.startTime,
          endTime: latest.endTime,
          status: latest.status,
        } : null,
        lastFailedRefresh: errorDetails,
        refreshesToday: refreshesToday.length,
        totalScheduledToday,
        dailyLimit,
        scheduleTimes,
        isOnDedicatedCapacity,
      });
    }

    // 2. POST
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { action, id, userRole, username, targetUsername, enabled, dailyLimit } = body;

      // 2.1 Salvar Cota do Usuário (ADMIN apenas)
      if (action === 'saveUserQuota') {
        if (!checkAccess(userRole, ['ADMIN'])) {
          return res.status(403).json({ ok: false, error: 'Apenas administradores podem configurar cotas.' });
        }
        const target = targetUsername || body.targetUser || body.user;
        if (!target) {
          return res.status(400).json({ ok: false, error: 'Usuário alvo não informado.' });
        }
        const record = await getQuotasRecord();
        const config = record.data;
        if (!config.quotas) config.quotas = {};
        const limitNum = Math.max(1, parseInt(dailyLimit, 10) || 1);
        const isEnabled = enabled !== undefined ? !!enabled : (limitNum > 0);
        config.quotas[target] = {
          enabled: isEnabled,
          dailyLimit: limitNum
        };
        await saveQuotasRecord(record.id, config);
        return res.status(200).json({ ok: true, message: 'Cota de atualização salva com sucesso!', quotas: config.quotas });
      }

      // 2.2 Zerar Uso de Hoje do Usuário (ADMIN apenas)
      if (action === 'resetUserUsage') {
        if (!checkAccess(userRole, ['ADMIN'])) {
          return res.status(403).json({ ok: false, error: 'Apenas administradores podem resetar cotas.' });
        }
        const target = targetUsername || body.targetUser || body.user;
        if (!target) {
          return res.status(400).json({ ok: false, error: 'Usuário alvo não informado.' });
        }
        const record = await getQuotasRecord();
        const config = record.data;
        const todayStr = getBrazilDateString(new Date());
        if (config.usage && config.usage[todayStr]) {
          config.usage[todayStr][target] = 0;
        }
        await saveQuotasRecord(record.id, config);
        return res.status(200).json({ ok: true, message: 'Uso de hoje zerado com sucesso!' });
      }

      // 2.3 Disparar Atualização sob Demanda
      const isAdmin = checkAccess(userRole, ['ADMIN']);
      let userQuotaCfg = null;
      let recordObj = null;
      const todayStr = getBrazilDateString(new Date());

      // Validação de segurança e quota
      if (!isAdmin) {
        if (!username) {
          return res.status(403).json({
            ok: false,
            error: 'Identificação de usuário necessária para disparar atualização.'
          });
        }
        recordObj = await getQuotasRecord();
        userQuotaCfg = recordObj.data.quotas?.[username];

        if (!userQuotaCfg || userQuotaCfg.enabled === false) {
          return res.status(403).json({
            ok: false,
            error: 'Você não possui permissão para atualizar os dados dos painéis BI. Solicite acesso ao administrador.'
          });
        }

        const maxAllowed = Math.max(1, parseInt(userQuotaCfg.dailyLimit, 10) || 1);
        const usedToday = recordObj.data.usage?.[todayStr]?.[username] || 0;

        if (usedToday >= maxAllowed) {
          return res.status(429).json({
            ok: false,
            error: `Você já atingiu o seu limite diário de ${maxAllowed} atualização(ões) para hoje.`
          });
        }
      }

      const config = EMBEDDED_REPORTS[id];
      if (!config) {
        return res.status(404).json({ ok: false, error: 'Relatório Power BI não encontrado.' });
      }

      const { workspaceId, reportId } = config;
      const aadToken = await getPowerBIAccessToken();
      const datasetId = await getDatasetForReport(aadToken, workspaceId, reportId);

      const triggerRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aadToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notifyOption: 'NoNotification' })
      });

      if (triggerRes.status === 202) {
        // Limpa cache consolidado para forçar atualização no próximo fetch
        bulkCache.timestamp = 0;

        // Se não for admin, contabiliza o uso no Dataverse
        let remaining = null;
        let used = null;
        if (!isAdmin && recordObj && userQuotaCfg) {
          const cfg = recordObj.data;
          if (!cfg.usage) cfg.usage = {};
          if (!cfg.usage[todayStr]) cfg.usage[todayStr] = {};
          const prevUsed = cfg.usage[todayStr][username] || 0;
          used = prevUsed + 1;
          cfg.usage[todayStr][username] = used;
          const maxAllowed = Math.max(1, parseInt(userQuotaCfg.dailyLimit, 10) || 1);
          remaining = Math.max(0, maxAllowed - used);

          // Limpa datas com mais de 3 dias
          Object.keys(cfg.usage).forEach(d => {
            if (d !== todayStr && Math.abs(new Date(todayStr) - new Date(d)) > 3 * 86400000) {
              delete cfg.usage[d];
            }
          });

          await saveQuotasRecord(recordObj.id, cfg);
        }

        return res.status(200).json({
          ok: true,
          message: 'Atualização do conjunto de dados iniciada com sucesso no Power BI.',
          remaining,
          usedToday: used
        });
      }

      const errText = await triggerRes.text();
      let errJson = null;
      try { errJson = JSON.parse(errText); } catch { /* ignore */ }

      if (triggerRes.status === 400 && (errJson?.error?.code === 'RefreshInProgressException' || errText.includes('RefreshInProgressException') || errText.includes('already executing'))) {
        return res.status(400).json({
          ok: false,
          error: 'Uma atualização já está em andamento para este conjunto de dados no Power BI.'
        });
      }

      return res.status(triggerRes.status || 500).json({
        ok: false,
        error: errJson?.error?.message || errText || 'Falha ao iniciar atualização no Power BI.'
      });
    }

    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('[bi-refresh] Erro no processamento:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Erro interno ao processar atualização' });
  }
}
