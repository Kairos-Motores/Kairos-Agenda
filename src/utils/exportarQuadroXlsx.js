import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { extrairTarefas, htmlParaTexto } from './descricaoTarefas';
import { parseAssignees } from './assignees';
import { parseAnexos } from './anexos';
import { parseComentarios } from './comentarios';

const corStatus = (concluida, dataIso) => {
  if (concluida) return 'FFB7E1CD'; // verde
  if (dataIso && new Date(dataIso) < new Date()) return 'FFF4C7C3'; // atrasada, vermelho
  return 'FFFCE8B2'; // pendente, amarelo
};

const nomeDe = (login, allUsers) => allUsers.find(u => u.cr4a1_username === login)?.cr4a1_nome_exibicao || login || '—';

// Exporta o quadro inteiro (todas as listas e fichas, sem respeitar os filtros da tela — é um
// retrato completo pra relatório/backup, não só do que está visível no momento).
export const exportarQuadroXlsx = async (listas, fichas, etiquetas, allUsers, workspaceNome) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kairós Agenda';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Fichas');
  const colunas = [
    { header: 'Lista', key: 'lista', width: 20 },
    { header: 'Título', key: 'titulo', width: 32 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Data', key: 'data', width: 18 },
    { header: 'Responsável', key: 'responsavel', width: 20 },
    { header: 'Etiquetas', key: 'etiquetas', width: 24 },
    { header: 'Checklist', key: 'checklist', width: 11 },
    { header: 'Comentários', key: 'comentarios', width: 12 },
    { header: 'Anexos', key: 'anexos', width: 10 },
    { header: 'Repetição', key: 'repeticao', width: 13 },
    { header: 'Fixada', key: 'fixada', width: 9 },
    { header: 'Descrição', key: 'descricao', width: 50 }
  ];
  sheet.columns = colunas;

  const cabecalho = sheet.getRow(1);
  cabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecalho.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
  cabecalho.alignment = { vertical: 'middle', horizontal: 'center' };
  cabecalho.height = 22;

  const nomeDaLista = (id) => listas.find(l => l.cr4a1_listaid === id)?.cr4a1_nome || '—';
  const nomesDasEtiquetas = (raw) => parseAssignees(raw)
    .map(id => etiquetas.find(e => e.cr4a1_etiquetaid === id)?.cr4a1_nome)
    .filter(Boolean)
    .join(', ');
  const REPETICAO_LABEL = { Diaria: 'Diariamente', Semanal: 'Semanalmente', Mensal: 'Mensalmente' };

  const ordenadas = [...fichas].sort((a, b) => {
    const la = nomeDaLista(a.cr4a1_lista_id);
    const lb = nomeDaLista(b.cr4a1_lista_id);
    if (la !== lb) return la.localeCompare(lb);
    return (a.cr4a1_ordem ?? 0) - (b.cr4a1_ordem ?? 0);
  });

  ordenadas.forEach(ficha => {
    const concluida = ficha.cr4a1_concluida === 'Sim';
    const microtarefas = extrairTarefas(ficha.cr4a1_descricao);
    const microtarefasFeitas = microtarefas.filter(t => t.concluida).length;

    const row = sheet.addRow({
      lista: nomeDaLista(ficha.cr4a1_lista_id),
      titulo: ficha.cr4a1_titulo || '',
      status: concluida ? 'Concluída' : 'Pendente',
      data: ficha.cr4a1_data_inicio ? format(new Date(ficha.cr4a1_data_inicio), 'dd/MM/yyyy HH:mm') : '—',
      responsavel: nomeDe(ficha.cr4a1_responsavel_login, allUsers),
      etiquetas: nomesDasEtiquetas(ficha.cr4a1_etiquetas) || '—',
      checklist: microtarefas.length ? `${microtarefasFeitas}/${microtarefas.length}` : '—',
      comentarios: parseComentarios(ficha.cr4a1_comentarios).length,
      anexos: parseAnexos(ficha.cr4a1_arquivos).length,
      repeticao: REPETICAO_LABEL[ficha.cr4a1_recorrencia] || '—',
      fixada: ficha.cr4a1_fixada === 'Sim' ? 'Sim' : 'Não',
      descricao: htmlParaTexto(ficha.cr4a1_descricao)
    });

    row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corStatus(concluida, ficha.cr4a1_data_inicio) } };
    row.alignment = { vertical: 'top', wrapText: true };
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const nomeArquivo = (workspaceNome || 'quadro').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  a.download = `trello-${nomeArquivo}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
