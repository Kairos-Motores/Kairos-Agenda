import ExcelJS from 'exceljs';
import { resumoSlice, condicoesOferta, formatarMinutos, formatarDataHora } from './voos';

// Verde/amarelo/vermelho claros pra sinalizar faixa de preço (barato/médio/caro) na planilha.
const corPorFaixa = (preco, min, max) => {
  if (max === min) return 'FFB7E1CD';
  const faixa = (preco - min) / (max - min);
  if (faixa < 0.33) return 'FFB7E1CD';
  if (faixa < 0.66) return 'FFFCE8B2';
  return 'FFF4C7C3';
};

export const exportarCotacaoXlsx = async (ofertas, { origem, destino, dataIda, dataVolta }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kairós Agenda';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Cotação de Passagens');
  const temVolta = ofertas.some(o => o.slices?.[1]);

  const colunas = [
    { header: 'Companhia', key: 'companhia', width: 26 },
    { header: 'Tarifa', key: 'tarifa', width: 14 },
    { header: 'Reembolsável', key: 'reembolsavel', width: 14 },
    { header: 'Alterável', key: 'alteravel', width: 13 },
    { header: 'Tipo', key: 'tipo', width: 14 },
    { header: 'Escalas (ida)', key: 'escalasIda', width: 13 },
    { header: 'Saída (ida)', key: 'saidaIda', width: 16 },
    { header: 'Chegada (ida)', key: 'chegadaIda', width: 16 },
    { header: 'Duração (ida)', key: 'duracaoIda', width: 14 },
    ...(temVolta ? [
      { header: 'Escalas (volta)', key: 'escalasVolta', width: 14 },
      { header: 'Saída (volta)', key: 'saidaVolta', width: 16 },
      { header: 'Chegada (volta)', key: 'chegadaVolta', width: 16 },
      { header: 'Duração (volta)', key: 'duracaoVolta', width: 14 }
    ] : []),
    { header: 'Preço total', key: 'preco', width: 14 },
    { header: 'Moeda', key: 'moeda', width: 9 },
    { header: 'Avaliação', key: 'avaliacao', width: 26 }
  ];
  sheet.columns = colunas;

  const cabecalho = sheet.getRow(1);
  cabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecalho.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
  cabecalho.alignment = { vertical: 'middle', horizontal: 'center' };
  cabecalho.height = 22;

  const ordenadasPorPreco = [...ofertas].sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
  const maisBarataId = ordenadasPorPreco[0]?.id;
  const precos = ofertas.map(o => parseFloat(o.total_amount));
  const min = Math.min(...precos);
  const max = Math.max(...precos);

  const textoCondicao = (valor) => (valor === null ? 'Não informado' : (valor ? 'Sim' : 'Não'));
  const corCondicao = (valor) => (valor === null ? 'FFEDEDED' : (valor ? 'FFB7E1CD' : 'FFF4C7C3'));

  ofertas.forEach(oferta => {
    const ida = resumoSlice(oferta.slices[0]);
    const volta = oferta.slices[1] ? resumoSlice(oferta.slices[1]) : null;
    const preco = parseFloat(oferta.total_amount);
    const vantajosa = oferta.id === maisBarataId;
    const { reembolsavel, alteravel } = condicoesOferta(oferta);
    const avaliacao = vantajosa
      ? 'Mais vantajosa (menor preço)'
      : (ida.escalas === 0 ? 'Voo direto, preço maior' : `${ida.escalas} escala(s) na ida`);

    const row = sheet.addRow({
      companhia: ida.companhias.join(', ') || oferta.owner?.name || '—',
      tarifa: ida.tarifa || '—',
      reembolsavel: textoCondicao(reembolsavel),
      alteravel: textoCondicao(alteravel),
      tipo: volta ? 'Ida e volta' : 'Somente ida',
      escalasIda: ida.escalas,
      saidaIda: formatarDataHora(ida.partida),
      chegadaIda: formatarDataHora(ida.chegada),
      duracaoIda: formatarMinutos(ida.duracaoMin),
      ...(temVolta ? {
        escalasVolta: volta ? volta.escalas : '—',
        saidaVolta: volta ? formatarDataHora(volta.partida) : '—',
        chegadaVolta: volta ? formatarDataHora(volta.chegada) : '—',
        duracaoVolta: volta ? formatarMinutos(volta.duracaoMin) : '—'
      } : {}),
      preco,
      moeda: oferta.total_currency,
      avaliacao
    });

    const precoCell = row.getCell('preco');
    precoCell.numFmt = '#,##0.00';
    precoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corPorFaixa(preco, min, max) } };

    row.getCell('reembolsavel').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corCondicao(reembolsavel) } };
    row.getCell('alteravel').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corCondicao(alteravel) } };

    if (vantajosa) {
      row.font = { bold: true };
      row.getCell('avaliacao').font = { bold: true, color: { argb: 'FF1E7E34' } };
    }
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cotacao-${origem}-${destino}-${dataIda}${dataVolta ? `-volta-${dataVolta}` : ''}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
