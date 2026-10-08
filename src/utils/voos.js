import { format } from 'date-fns';

// Duffel devolve duração em ISO 8601 (ex.: "PT2H30M"). Convertemos pra minutos pra
// poder somar entre trechos e formatar de um jeito só.
export const parseDuracaoISO = (iso) => {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const horas = parseInt(match[1] || '0', 10);
  const minutos = parseInt(match[2] || '0', 10);
  return horas * 60 + minutos;
};

export const formatarMinutos = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
};

export const formatarDataHora = (iso) => {
  if (!iso) return '—';
  try { return format(new Date(iso), 'dd/MM HH:mm'); } catch { return iso; }
};

// Resume um trecho (slice) da oferta: quantas escalas, duração total (a Duffel já manda a
// duração do trecho inteiro, incluindo conexão — por isso não somamos os segmentos à parte),
// horário de saída/chegada, quais companhias operam os voos desse trecho e a tarifa vendida
// nele (ex.: "Basic", "Flex" — cada companhia nomeia do seu jeito).
export const resumoSlice = (slice) => {
  const segmentos = slice?.segments || [];
  const duracaoMin = slice?.duration
    ? parseDuracaoISO(slice.duration)
    : segmentos.reduce((acc, s) => acc + parseDuracaoISO(s.duration), 0);
  return {
    escalas: Math.max(0, segmentos.length - 1),
    duracaoMin,
    partida: segmentos[0]?.departing_at,
    chegada: segmentos[segmentos.length - 1]?.arriving_at,
    companhias: [...new Set(segmentos.map(s => s.operating_carrier?.name).filter(Boolean))],
    tarifa: slice?.fare_brand_name || null
  };
};

// Condições de reembolso/alteração da oferta inteira (não é por trecho). `allowed` pode vir
// null quando a companhia não informou a regra — tratamos como "não sabemos", não como "não".
export const condicoesOferta = (oferta) => ({
  reembolsavel: oferta?.conditions?.refund_before_departure?.allowed ?? null,
  alteravel: oferta?.conditions?.change_before_departure?.allowed ?? null
});
