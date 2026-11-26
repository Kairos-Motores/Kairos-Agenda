import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, X } from 'lucide-react';
import { matchesSearch } from '../../utils/search';
import { fetchPlaceDetails, setCachedPlace } from '../../utils/placesLookup';

const UNIDADES_PADRAO_KAIROS = [
  'Kairós Motores — São Luís (Matriz)',
  'Kairós Motores — Forquilha',
  'Kairós Motores — Barcarena',
  'Kairós Motores — Parauapebas',
  'Kairós Motores — São José dos Campos',
  'Kairós Motores — Aveiro (Portugal)'
];

const formatarFeaturePhoton = (feature) => {
  const p = feature?.properties || {};
  const nome = p.name || '';
  const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
  const bairro = p.district || p.suburb || p.locality || '';
  const cidade = p.city || p.town || p.village || p.county || '';
  const estado = p.state || '';
  const pais = p.country || '';

  const partesPrincipais = [];
  if (nome) partesPrincipais.push(nome);
  if (rua && rua !== nome) partesPrincipais.push(rua);
  if (bairro && bairro !== nome && bairro !== cidade) partesPrincipais.push(bairro);
  const cidadeUf = [cidade, estado].filter(Boolean).join(' - ');
  if (cidadeUf) partesPrincipais.push(cidadeUf);

  const label = partesPrincipais.join(' • ') || [p.name, p.city, p.country].filter(Boolean).join(', ');
  const sub = [rua, bairro, cidadeUf, pais].filter(Boolean).join(', ');
  return { label, sub };
};

export const LocationField = ({
  value = '',
  onChange,
  allUsers = [],
  placeholder = 'Adicionar local, empresa, CEP ou endereço...'
}) => {
  const [aberto, setAberto] = useState(false);
  const [enderecos, setEnderecos] = useState([]);
  const [carregandoEnderecos, setCarregandoEnderecos] = useState(false);
  const containerRef = useRef(null);

  const unidadesDisponiveis = useMemo(() => {
    const mapa = new Map();
    const adicionar = (nome) => {
      const limpo = String(nome || '').trim();
      if (!limpo) return;
      const chave = limpo.toLowerCase();
      if (!mapa.has(chave)) mapa.set(chave, limpo);
    };
    UNIDADES_PADRAO_KAIROS.forEach(adicionar);
    (allUsers || []).forEach((u) => adicionar(u.cr4a1_unidade));
    return Array.from(mapa.values());
  }, [allUsers]);

  const unidadesFiltradas = useMemo(() => {
    const termo = String(value || '').trim();
    if (!termo) return unidadesDisponiveis;
    const palavras = termo.split(/\s+/).filter(Boolean);
    return unidadesDisponiveis.filter((u) => palavras.every((p) => matchesSearch(u, p)));
  }, [unidadesDisponiveis, value]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  useEffect(() => {
    const termo = String(value || '').trim();
    if (!aberto || termo.length < 2 || /^https?:\/\//i.test(termo)) {
      setEnderecos([]);
      setCarregandoEnderecos(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCarregandoEnderecos(true);
      try {
        // 1. CEP brasileiro via ViaCEP
        const cepMatch = termo.replace(/\D/g, '');
        if (/^\d{8}$/.test(cepMatch) && /^[\d-]+$/.test(termo)) {
          const resCep = await fetch(`https://viacep.com.br/ws/${cepMatch}/json/`, {
            signal: controller.signal
          });
          if (resCep.ok) {
            const dadosCep = await resCep.json();
            if (!dadosCep.erro && !controller.signal.aborted) {
              const labelCep = [
                dadosCep.logradouro,
                dadosCep.bairro,
                [dadosCep.localidade, dadosCep.uf].filter(Boolean).join(' - ')
              ].filter(Boolean).join(' • ');
              setEnderecos([{
                id: `cep-${cepMatch}`,
                mainText: labelCep || `CEP ${dadosCep.cep}`,
                secondaryText: `CEP ${dadosCep.cep}${dadosCep.complemento ? ` (${dadosCep.complemento})` : ''}`,
                fullText: labelCep || `CEP ${dadosCep.cep}`
              }]);
              setCarregandoEnderecos(false);
              return;
            }
          }
        }

        // 2. Busca principal oficial via Google Places Autocomplete (New)
        let resultados = [];
        try {
          const resGoogle = await fetch(
            `/api/places-proxy?action=autocomplete&q=${encodeURIComponent(termo)}`,
            { signal: controller.signal }
          );
          if (resGoogle.ok) {
            const dataGoogle = await resGoogle.json();
            if (Array.isArray(dataGoogle?.suggestions) && dataGoogle.suggestions.length > 0) {
              resultados = dataGoogle.suggestions.map((s) => ({
                id: `gp-${s.placeId}`,
                placeId: s.placeId,
                mainText: s.mainText,
                secondaryText: s.secondaryText,
                fullText: s.fullText
              }));
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }

        // 3. Fallback Photon (BR/PT) se Google Places não retornar ou estiver offline
        if (resultados.length === 0 && termo.length >= 3 && !controller.signal.aborted) {
          try {
            const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(termo)}&limit=8&lat=-2.53&lon=-44.30`;
            const resPhoton = await fetch(urlPhoton, { signal: controller.signal });
            if (resPhoton.ok) {
              const dataPhoton = await resPhoton.json();
              const features = (Array.isArray(dataPhoton?.features) ? dataPhoton.features : [])
                .filter((f) => ['BR', 'PT'].includes(f.properties?.countrycode));
              const vistos = new Set();
              for (const f of features) {
                const { label, sub } = formatarFeaturePhoton(f);
                if (!label || vistos.has(label.toLowerCase())) continue;
                vistos.add(label.toLowerCase());
                resultados.push({
                  id: `ph-${f.properties?.osm_type || 'n'}-${f.properties?.osm_id || resultados.length}`,
                  mainText: label,
                  secondaryText: sub || label,
                  fullText: label
                });
                if (resultados.length >= 6) break;
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') return;
          }
        }

        if (!controller.signal.aborted) {
          setEnderecos(resultados);
        }
      } catch (err) {
        if (err.name !== 'AbortError') setEnderecos([]);
      } finally {
        if (!controller.signal.aborted) setCarregandoEnderecos(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, aberto]);

  const selecionarItem = async (item) => {
    setAberto(false);
    if (item.placeId) {
      onChange(item.fullText || item.mainText);
      const det = await fetchPlaceDetails({ placeId: item.placeId });
      if (det) {
        const valorFinal = det.name && det.address && !det.address.toLowerCase().startsWith(det.name.toLowerCase())
          ? `${det.name} — ${det.address}`
          : (det.address || det.name || item.fullText);
        setCachedPlace(valorFinal, det);
        onChange(valorFinal);
      }
    } else {
      onChange(item.fullText || item.mainText);
    }
  };

  const mostrarDropdown = aberto && (unidadesFiltradas.length > 0 || enderecos.length > 0 || carregandoEnderecos);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <MapPin className="pointer-events-none absolute left-3.5 size-4 text-primary" />
        <input
          type="text"
          value={value}
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setAberto(true);
          }}
          placeholder={placeholder}
          aria-label="Localização do evento"
          className="h-11 w-full rounded-xl border border-border bg-secondary pl-10 pr-9 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpar local"
            className="absolute right-2.5 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {mostrarDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          {(carregandoEnderecos || enderecos.length > 0) && (
            <div className="mb-1">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Google Maps • Locais e Endereços</span>
                {carregandoEnderecos && <Loader2 className="size-3 animate-spin" />}
              </div>
              {enderecos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionarItem(item)}
                  className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-secondary"
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{item.mainText}</div>
                    {item.secondaryText && (
                      <div className="truncate text-[11px] text-muted-foreground">{item.secondaryText}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {unidadesFiltradas.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Unidades Kairós
              </div>
              {unidadesFiltradas.map((unidade) => (
                <button
                  key={unidade}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionarItem({ mainText: unidade, fullText: unidade })}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{unidade}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
