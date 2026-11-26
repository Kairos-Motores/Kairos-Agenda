import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isAssignedTo } from './assignees';

const formatarDataBr = (isoDate) => {
  if (!isoDate) return '';
  const str = String(isoDate).slice(0, 10);
  const [y, m, d] = str.split('-');
  if (!y || !m || !d) return str;
  return `${d}/${m}/${y}`;
};

const nomeArquivoSeguro = (nome) =>
  String(nome || 'Diretor')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Filtra os eventos atribuídos a um diretor específico dentro do período opcional.
 */
export const filtrarEventosDoDiretor = (events = [], username, { dataInicio = '', dataFim = '' } = {}) => {
  return (events || [])
    .filter((ev) => {
      if (!isAssignedTo(ev.cr4a1_user_login, username)) return false;
      const evIni = String(ev.cr4a1_data_inicio || '').slice(0, 10);
      const evFim = String(ev.cr4a1_data_fim || evIni).slice(0, 10);
      if (dataInicio && evFim < dataInicio) return false;
      if (dataFim && evIni > dataFim) return false;
      return true;
    })
    .sort((a, b) => {
      const da = String(a.cr4a1_data_inicio || '');
      const db = String(b.cr4a1_data_inicio || '');
      if (da !== db) return da.localeCompare(db);
      const ha = String(a.cr4a1_hora_inicio || '00:00');
      const hb = String(b.cr4a1_hora_inicio || '00:00');
      return ha.localeCompare(hb);
    });
};

/**
 * Gera e baixa um relatório formal em PDF com os compromissos e atividades de um diretor.
 */
export const exportarAgendaDiretorPdf = ({
  diretor,
  eventos = [],
  workspaces = [],
  emitidoPor = '',
  diaIso = ''
}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentW = pageW - marginX * 2;
  const footerY = pageH - 28;
  const maxY = pageH - 52;

  const nomeDiretor = diretor?.cr4a1_nome_exibicao || diretor?.cr4a1_username || 'Diretor(a)';
  const unidadeDiretor = (diretor?.cr4a1_unidade || '').trim();
  const agora = new Date();
  const diaAlvoIso = diaIso || format(agora, 'yyyy-MM-dd');
  const [anoD, mesD, diaD] = diaAlvoIso.split('-').map(Number);
  const dataAlvoObj = new Date(anoD, (mesD || 1) - 1, diaD || 1);
  const diaFmt = format(dataAlvoObj, 'dd/MM/yyyy', { locale: ptBR });
  const diaSemana = format(dataAlvoObj, 'EEEE', { locale: ptBR });
  const dataEmissaoFmt = format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const wsMap = new Map(
    (workspaces || []).map((w) => [w.cr4a1_calendarios_workspacesid, w.cr4a1_nome])
  );

  let y = 44;

  const garantirEspaco = (alturaNecessaria) => {
    if (y + alturaNecessaria > maxY) {
      doc.addPage();
      y = 44;
    }
  };

  // --- CABEÇALHO INSTITUCIONAL ---
  doc.setFillColor(26, 115, 232);
  doc.rect(marginX, y - 8, 4, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 115, 232);
  doc.text('KAIRÓS MOTORES • AGENDA EXECUTIVA DIÁRIA', marginX + 12, y + 3);

  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  doc.text(`Agenda do Dia — ${diaFmt}`, marginX + 12, y + 22);

  y += 42;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;

  // --- METADADOS ---
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Diretor(a):', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    unidadeDiretor ? `${nomeDiretor} (${unidadeDiretor})` : nomeDiretor,
    marginX + 64,
    y
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Data:', marginX + 300, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${diaFmt} (${diaSemana})`, marginX + 332, y);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Emitido em:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(dataEmissaoFmt, marginX + 64, y);

  if (emitidoPor) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Emitido por:', marginX + 300, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(emitidoPor, marginX + 362, y);
  }
  y += 22;

  // --- TEXTO FORMAL INTRODUTÓRIO ---
  const total = eventos.length;
  const concluidos = eventos.filter((e) => e.cr4a1_concluida === 'Sim').length;
  const pendentes = total - concluidos;

  const textoFormal =
    `Prezado(a) ${nomeDiretor}, encaminhamos a seguir o resumo formal dos compromissos, reuniões e atividades programados em sua agenda para o dia ${diaFmt} (${diaSemana}), ` +
    (total > 0
      ? `totalizando ${total} registro(s) (${pendentes} agendado(s)/pendente(s) e ${concluidos} concluído(s)), organizados em ordem cronológica para seu acompanhamento diário.`
      : `não havendo compromissos registrados até o momento para esta data.`);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const linhasTexto = doc.splitTextToSize(textoFormal, contentW - 24);
  const alturaCaixa = linhasTexto.length * 14 + 20;

  doc.roundedRect(marginX, y, contentW, alturaCaixa, 6, 6, 'FD');
  doc.setTextColor(30, 41, 59);
  doc.text(linhasTexto, marginX + 12, y + 17);
  y += alturaCaixa + 16;

  // --- RESUMO QUANTITATIVO ---
  const boxW = (contentW - 16) / 3;
  const cardsResumo = [
    { label: 'TOTAL DE COMPROMISSOS', valor: String(total), cor: [26, 115, 232] },
    { label: 'AGENDADOS / PENDENTES', valor: String(pendentes), cor: [217, 119, 6] },
    { label: 'CONCLUÍDOS', valor: String(concluidos), cor: [22, 163, 74] }
  ];
  cardsResumo.forEach((c, idx) => {
    const bx = marginX + idx * (boxW + 8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bx, y, boxW, 44, 5, 5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, bx + 10, y + 15);
    doc.setFontSize(14);
    doc.setTextColor(c.cor[0], c.cor[1], c.cor[2]);
    doc.text(c.valor, bx + 10, y + 34);
  });
  y += 62;

  // --- LISTAGEM CRONOLÓGICA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Detalhamento dos Compromissos e Atividades', marginX, y);
  y += 14;

  if (eventos.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, contentW, 44, 6, 6, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum compromisso ou atividade encontrado para os critérios selecionados.', marginX + 14, y + 26);
  } else {
    eventos.forEach((ev, idx) => {
      const dataIniFmt = formatarDataBr(ev.cr4a1_data_inicio);
      const dataFimFmt = formatarDataBr(ev.cr4a1_data_fim);
      const faixaData =
        dataFimFmt && dataFimFmt !== dataIniFmt ? `${dataIniFmt} a ${dataFimFmt}` : dataIniFmt;
      const horario = ev.cr4a1_dia_inteiro
        ? 'Dia inteiro'
        : `${ev.cr4a1_hora_inicio || '08:00'}${ev.cr4a1_hora_fim ? ` – ${ev.cr4a1_hora_fim}` : ''}`;

      const titulo = (ev.cr4a1_titulo || 'Compromisso sem título').trim();
      const tipo = (ev.cr4a1_tipo || 'Evento').trim();
      const status = ev.cr4a1_concluida === 'Sim' ? 'Concluído' : 'Agendado';
      const wsNome = ev.cr4a1_workspace_id ? wsMap.get(ev.cr4a1_workspace_id) : '';
      const detalhes = (ev.cr4a1_detalhes || '').trim();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const linhasTitulo = doc.splitTextToSize(`${idx + 1}. ${titulo}`, contentW - 24);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const linhasDetalhes = detalhes ? doc.splitTextToSize(detalhes, contentW - 24) : [];

      const alturaCard =
        16 + // meta linha
        linhasTitulo.length * 13 +
        (linhasDetalhes.length > 0 ? linhasDetalhes.length * 11.5 + 6 : 0) +
        14;

      garantirEspaco(alturaCard + 6);

      // Card do evento
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginX, y, contentW, alturaCard, 5, 5, 'FD');

      // Barra lateral colorida por status
      if (ev.cr4a1_concluida === 'Sim') {
        doc.setFillColor(22, 163, 74);
      } else {
        doc.setFillColor(26, 115, 232);
      }
      doc.rect(marginX, y, 3.5, alturaCard, 'F');

      // Linha de data/hora/tipo/status
      let cy = y + 15;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(26, 115, 232);
      const cabecalhoItem = `${faixaData}  •  ${horario}`;
      doc.text(cabecalhoItem, marginX + 12, cy);

      const metaDireita = [tipo, wsNome, status].filter(Boolean).join('  |  ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(metaDireita, pageW - marginX - 10, cy, { align: 'right' });

      cy += 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(linhasTitulo, marginX + 12, cy);
      cy += linhasTitulo.length * 13;

      if (linhasDetalhes.length > 0) {
        cy += 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(linhasDetalhes, marginX + 12, cy);
      }

      y += alturaCard + 8;
    });
  }

  // --- RODAPÉ EM TODAS AS PÁGINAS ---
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, footerY - 12, pageW - marginX, footerY - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Kairós Agenda • Relatório de ${nomeDiretor}`, marginX, footerY);
    doc.text(`Página ${i} de ${totalPaginas}`, pageW - marginX, footerY, { align: 'right' });
  }

  const nomeArquivo = `Agenda_Dia_${nomeArquivoSeguro(nomeDiretor)}_${diaAlvoIso}.pdf`;
  doc.save(nomeArquivo);
  return nomeArquivo;
};

/**
 * Gera o texto objetivo da agenda do dia formatado para WhatsApp:
 * Ex: *08:00 – 09:00* | *Fazer a IT com Amanda do processo de outras saídas, extravio e perda financeira (Brasil)*
 */
export const gerarTextoAgendaWhatsapp = ({
  diretor,
  eventos = [],
  workspaces = [],
  emitidoPor = '',
  diaIso = ''
}) => {
  if (!eventos || eventos.length === 0) {
    return 'Nenhum compromisso agendado para hoje.';
  }

  return eventos
    .map((ev) => {
      const horario = ev.cr4a1_dia_inteiro
        ? 'Dia inteiro'
        : `${ev.cr4a1_hora_inicio || '08:00'}${ev.cr4a1_hora_fim ? ` – ${ev.cr4a1_hora_fim}` : ''}`;
      const titulo = (ev.cr4a1_titulo || 'Compromisso sem título').trim();
      return `*${horario}* | *${titulo}*`;
    })
    .join('\n');
};

/**
 * Utilitário seguro para copiar texto para a área de transferência.
 */
export const copiarTextoClipboard = async (texto) => {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Continua para o fallback
    }
  }
  try {
    const el = document.createElement('textarea');
    el.value = texto;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (e) {
    console.error('Falha ao copiar texto:', e);
    return false;
  }
};

