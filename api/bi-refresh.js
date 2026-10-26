// api/bi-refresh.js
import { EMBEDDED_REPORTS, getPowerBIAccessToken } from './bi-embed.js';

const datasetCache = new Map();
const workspaceCapacityCache = new Map();

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
    // 1. GET - Consultar status, última atualização, contador do dia e agendamento
    if (req.method === 'GET') {
      const { id } = req.query;
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

    // 2. POST - Disparar atualização sob demanda (Restrito a ADMIN)
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { id, userRole } = body;

      // Validação de segurança no backend
      if (!checkAccess(userRole, ['ADMIN'])) {
        return res.status(403).json({
          ok: false,
          error: 'Acesso negado. Apenas usuários administradores podem disparar atualizações manuais dos dados.'
        });
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
        return res.status(200).json({
          ok: true,
          message: 'Atualização do conjunto de dados iniciada com sucesso no Power BI.'
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
