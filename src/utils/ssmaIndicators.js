import { SSMA_INDICATORS, tipoParaIndicador } from '../config/ssmaConfig';

// Uma atividade só conta como "realizado válido" se tiver evidência anexada — mesma regra
// enunciada na planilha original ("Evidência é obrigatória para que o realizado seja
// considerado"), aplicada aqui de forma consistente a todos os indicadores (a planilha
// só tinha essa regra formalizada para o TST-07; generalizamos para os 10).
const filtrarPorCompetenciaUnidade = (lista, competencia, unidade) =>
    (lista || []).filter(item => item.cr4a1_competencia === competencia && item.cr4a1_unidade === unidade);

export const diasEmAtraso = (atividade) => {
    const prazo = atividade.cr4a1_prazo ? new Date(atividade.cr4a1_prazo) : null;
    if (!prazo) return 0;
    if (atividade.cr4a1_data_fim_real) {
        const fimReal = new Date(atividade.cr4a1_data_fim_real);
        return Math.max(0, Math.round((fimReal - prazo) / 86400000));
    }
    if (atividade.cr4a1_status === 'Concluído') return 0;
    return Math.max(0, Math.round((new Date() - prazo) / 86400000));
};

export const realizadoValidoRow = (atividade) => {
    if (!atividade.cr4a1_evidencia) return 0;
    return Number(atividade.cr4a1_realizado) || 0;
};

// Calcula os 10 indicadores TST para uma competência+unidade, a partir das atividades brutas.
export const computeSsmaIndicadores = (atividades, competencia, unidade) => {
    const filtradas = filtrarPorCompetenciaUnidade(atividades, competencia, unidade);

    return SSMA_INDICATORS.map(ind => {
        const doTipo = filtradas.filter(a => a.cr4a1_tipo === ind.tipo);
        const previsto = doTipo.reduce((sum, a) => sum + (Number(a.cr4a1_previsto) || 0), 0);
        const realizadoValido = doTipo.reduce((sum, a) => sum + realizadoValidoRow(a), 0);
        const resultado = previsto === 0 ? null : realizadoValido / previsto;
        const status = previsto === 0 ? 'NÃO INFORMADO' : (resultado >= ind.meta ? 'ATINGIDO' : 'ABAIXO DA META');
        const memoria = previsto === 0
            ? 'Sem base válida'
            : `${realizadoValido} ÷ ${previsto} = ${(resultado * 100).toFixed(1)}% | Meta ${(ind.meta * 100).toFixed(1)}%`;

        return { ...ind, previsto, realizadoValido, resultado, status, memoria };
    });
};

// KPIs do topo do "Resumo Supervisor": atingimento geral, atividades realizadas, atrasos,
// gasto realizado, itens sem evidência e pendências.
export const computeSsmaResumo = (atividades, gastos, competencia, unidade) => {
    const indicadores = computeSsmaIndicadores(atividades, competencia, unidade);
    const filtradas = filtrarPorCompetenciaUnidade(atividades, competencia, unidade);
    const gastosFiltrados = filtrarPorCompetenciaUnidade(gastos, competencia, unidade);

    const atingimentoGeral = indicadores.filter(i => i.status === 'ATINGIDO').length / SSMA_INDICATORS.length;
    const atividadesRealizadas = filtradas.reduce((sum, a) => sum + (Number(a.cr4a1_realizado) || 0), 0);
    const registrosAtrasados = filtradas.filter(a => diasEmAtraso(a) > 0).length;
    const gastoRealizado = gastosFiltrados.reduce((sum, g) => sum + (Number(g.cr4a1_realizado) || 0), 0);
    const semEvidencia = filtradas.filter(a => a.cr4a1_tipo && !a.cr4a1_evidencia).length;
    const pendencias = filtradas.filter(a => a.cr4a1_status === 'Pendente').length;

    return {
        indicadores,
        atingimentoGeral,
        atividadesRealizadas,
        registrosAtrasados,
        gastoRealizado,
        semEvidencia,
        pendencias,
        atingidos: indicadores.filter(i => i.status === 'ATINGIDO').length,
        abaixoDaMeta: indicadores.filter(i => i.status === 'ABAIXO DA META').length,
        naoInformados: indicadores.filter(i => i.status === 'NÃO INFORMADO').length
    };
};

export const computeGastosPorCategoria = (gastos, categorias, competencia, unidade) => {
    const filtrados = filtrarPorCompetenciaUnidade(gastos, competencia, unidade);
    return categorias.map(categoria => {
        const doCategoria = filtrados.filter(g => g.cr4a1_categoria === categoria);
        return {
            categoria,
            realizado: doCategoria.reduce((sum, g) => sum + (Number(g.cr4a1_realizado) || 0), 0),
            orcado: doCategoria.reduce((sum, g) => sum + (Number(g.cr4a1_orcado) || 0), 0)
        };
    });
};

export { tipoParaIndicador };
