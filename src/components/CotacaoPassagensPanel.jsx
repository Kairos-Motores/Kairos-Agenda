import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plane, Search, Download, Filter, ArrowLeftRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { DateField } from './ui/date-field';
import { resumoSlice, formatarMinutos, formatarDataHora } from '../utils/voos';
import { exportarCotacaoXlsx } from '../utils/exportarCotacaoXlsx';

const API_DUFFEL = '/api/duffel-proxy';

export const CotacaoPassagensPanel = () => {
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [dataIda, setDataIda] = useState('');
  const [dataVolta, setDataVolta] = useState('');
  const [direto, setDireto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [ofertas, setOfertas] = useState(null);
  const [erro, setErro] = useState('');
  const [companhiasFiltro, setCompanhiasFiltro] = useState([]);
  const [precoMax, setPrecoMax] = useState(null);

  const buscar = async (e) => {
    e.preventDefault();
    if (origem.trim().length !== 3 || destino.trim().length !== 3 || !dataIda) {
      toast.error('Informe origem e destino (código IATA de 3 letras) e a data de ida.');
      return;
    }
    setBuscando(true);
    setErro('');
    setOfertas(null);
    try {
      const slices = [{ origin: origem.trim().toUpperCase(), destination: destino.trim().toUpperCase(), departure_date: dataIda }];
      if (dataVolta) slices.push({ origin: destino.trim().toUpperCase(), destination: origem.trim().toUpperCase(), departure_date: dataVolta });

      const res = await fetch(API_DUFFEL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slices,
          passengers: [{ type: 'adult' }],
          max_connections: direto ? 0 : 2,
          cabin_class: 'economy'
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar voos.');

      const lista = json.data?.offers || [];
      setOfertas(lista);
      setCompanhiasFiltro([]);
      setPrecoMax(null);
      if (lista.length === 0) toast('Nenhum voo encontrado para essa busca.');
    } catch (err) {
      setErro(err.message || 'Erro ao buscar voos.');
      toast.error('Erro ao buscar voos.');
    } finally {
      setBuscando(false);
    }
  };

  const inverterRota = () => {
    setOrigem(destino);
    setDestino(origem);
  };

  const companhiasDisponiveis = useMemo(() => {
    if (!ofertas) return [];
    return [...new Set(ofertas.map(o => o.owner?.name).filter(Boolean))].sort();
  }, [ofertas]);

  const faixaPreco = useMemo(() => {
    if (!ofertas || ofertas.length === 0) return { min: 0, max: 0 };
    const valores = ofertas.map(o => parseFloat(o.total_amount));
    return { min: Math.floor(Math.min(...valores)), max: Math.ceil(Math.max(...valores)) };
  }, [ofertas]);

  const ofertasFiltradas = useMemo(() => {
    if (!ofertas) return [];
    const limite = precoMax ?? faixaPreco.max;
    return ofertas
      .filter(o => companhiasFiltro.length === 0 || companhiasFiltro.includes(o.owner?.name))
      .filter(o => parseFloat(o.total_amount) <= limite)
      .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
  }, [ofertas, companhiasFiltro, precoMax, faixaPreco.max]);

  const maisBarataId = ofertasFiltradas[0]?.id;

  const toggleCompanhia = (nome) => {
    setCompanhiasFiltro(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]);
  };

  const baixarPlanilha = () => {
    if (!ofertasFiltradas.length) return;
    exportarCotacaoXlsx(ofertasFiltradas, { origem, destino, dataIda, dataVolta });
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-foreground"><Plane className="size-6 text-primary" /> Cotação de Passagens Aéreas</h2>
        <p className="text-sm text-muted-foreground">Compare voos e preços entre companhias, e baixe a cotação completa em planilha.</p>
      </header>

      <form onSubmit={buscar} className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary p-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Origem (código IATA)</Label>
            <Input value={origem} onChange={e => setOrigem(e.target.value.toUpperCase().slice(0, 3))} placeholder="Ex: GRU" className="bg-card uppercase" />
          </div>
          <div className="flex items-end gap-1.5">
            <div className="flex-1">
              <Label>Destino (código IATA)</Label>
              <Input value={destino} onChange={e => setDestino(e.target.value.toUpperCase().slice(0, 3))} placeholder="Ex: GIG" className="bg-card uppercase" />
            </div>
            <Button type="button" variant="outline" size="icon" title="Inverter origem e destino" onClick={inverterRota}>
              <ArrowLeftRight className="size-4" />
            </Button>
          </div>
          <DateField label="Data de ida" selectedDate={dataIda} onSelect={setDataIda} />
          <DateField label="Data de volta (opcional)" selectedDate={dataVolta} onSelect={setDataVolta} allowClear />
          <Button type="submit" disabled={buscando} className="w-full">
            <Search className="size-4" /> {buscando ? 'Buscando...' : 'Buscar voos'}
          </Button>
        </div>
        <label className="flex w-fit items-center gap-2 text-sm text-foreground">
          <Switch checked={direto} onCheckedChange={setDireto} />
          Somente voos diretos
        </label>
      </form>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {ofertas && ofertas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Filter className="size-3.5" /> Companhias:</span>
            {companhiasDisponiveis.map(nome => (
              <button
                key={nome}
                type="button"
                onClick={() => toggleCompanhia(nome)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${companhiasFiltro.length === 0 || companhiasFiltro.includes(nome) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                {nome}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">Preço até {(precoMax ?? faixaPreco.max).toFixed(0)}</span>
              <input
                type="range"
                min={faixaPreco.min}
                max={faixaPreco.max}
                value={precoMax ?? faixaPreco.max}
                onChange={e => setPrecoMax(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={baixarPlanilha}>
              <Download className="size-4" /> Baixar planilha (.xlsx)
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {ofertasFiltradas.map(oferta => {
              const ida = resumoSlice(oferta.slices[0]);
              const volta = oferta.slices[1] ? resumoSlice(oferta.slices[1]) : null;
              const vantajosa = oferta.id === maisBarataId;
              return (
                <div key={oferta.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${vantajosa ? 'border-success bg-success/5' : 'border-border bg-card'}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{ida.companhias.join(', ') || oferta.owner?.name}</span>
                      {vantajosa && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">MAIS VANTAJOSA</span>}
                      {ida.escalas === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DIRETO</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Ida: {formatarDataHora(ida.partida)} → {formatarDataHora(ida.chegada)} ({formatarMinutos(ida.duracaoMin)}, {ida.escalas === 0 ? 'direto' : `${ida.escalas} escala(s)`})
                    </span>
                    {volta && (
                      <span className="text-xs text-muted-foreground">
                        Volta: {formatarDataHora(volta.partida)} → {formatarDataHora(volta.chegada)} ({formatarMinutos(volta.duracaoMin)}, {volta.escalas === 0 ? 'direto' : `${volta.escalas} escala(s)`})
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-extrabold text-foreground">{oferta.total_currency} {parseFloat(oferta.total_amount).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {ofertas && ofertas.length === 0 && !erro && (
        <p className="text-sm text-muted-foreground">Nenhum voo encontrado para essa busca.</p>
      )}
    </div>
  );
};
