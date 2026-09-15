import { addDays, startOfDay } from 'date-fns';
import { SSMA_FREQUENCIA_DIAS } from '../config/ssmaConfig';

const parseDia = (yyyyMMdd) => startOfDay(new Date(`${yyyyMMdd}T12:00:00`));

// Acha o ciclo mais recente de uma recorrência que já venceu (data <= hoje) e ainda não
// foi gerado como atividade — ou null se nenhum ciclo está pendente. Se vários ciclos
// passaram sem o app ser aberto (ex: quinzenal parado por 2 meses), devolve só o mais
// recente: os ciclos intermediários são pulados, nunca empilhados como pendências.
export const proximoCicloPendente = (recorrencia, hoje = new Date()) => {
    const intervalo = SSMA_FREQUENCIA_DIAS[recorrencia.cr4a1_frequencia];
    const base = recorrencia.cr4a1_ultima_geracao || recorrencia.cr4a1_data_inicio;
    if (!intervalo || !base) return null;

    const agora = startOfDay(hoje);

    // Sem geração anterior: o primeiro ciclo vence na própria data de início.
    if (!recorrencia.cr4a1_ultima_geracao) {
        const inicio = parseDia(recorrencia.cr4a1_data_inicio);
        return inicio <= agora ? inicio : null;
    }

    let ciclo = addDays(parseDia(recorrencia.cr4a1_ultima_geracao), intervalo);
    if (ciclo > agora) return null;
    while (addDays(ciclo, intervalo) <= agora) {
        ciclo = addDays(ciclo, intervalo);
    }
    return ciclo;
};

// Só para exibição na lista de recorrências — quando o próximo ciclo deve vencer,
// vencido ou não (ao contrário de proximoCicloPendente, que só devolve ciclos já vencidos).
export const proximaGeracaoPrevista = (recorrencia) => {
    const intervalo = SSMA_FREQUENCIA_DIAS[recorrencia.cr4a1_frequencia];
    const base = recorrencia.cr4a1_ultima_geracao || recorrencia.cr4a1_data_inicio;
    if (!intervalo || !base) return null;
    return recorrencia.cr4a1_ultima_geracao
        ? addDays(parseDia(recorrencia.cr4a1_ultima_geracao), intervalo)
        : parseDia(recorrencia.cr4a1_data_inicio);
};
