import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, X } from 'lucide-react';
import { matchesSearch } from '../../utils/search';

const UNIDADES_PADRAO_KAIROS = [
  'Kairós São Luís',
  'Kairós Forquilha',
  'Kairós Barcarena',
  'Kairós Parauapebas',
  'Kairós São José dos Campos',
  'Kairós Aveiro (Portugal)'
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

const formatarEnderecoNominatim = (item) => {
  const addr = item.address || {};
  const nomePrincipal = item.name && item.name !== addr.road ? item.name : '';
  const rua = [addr.road, addr.house_number].filter(Boolean).join(', ');
  const bairro = addr.suburb || addr.neighbourhood || '';
  const cidade = addr.city || addr.town || addr.village || addr.municipality || '';
  const uf = addr.state_code || addr.state || '';
  const partes = [nomePrincipal, rua, bairro, [cidade, uf].filter(Boolean).join(' - ')].filter(Boolean);
  return partes.length > 0 ? partes.join(' • ') : item.display_name;
};

export const LocationField = ({
  value = '',
  onChange,
  allUsers = [],
  placeholder = 'Adicionar local, unidade, CEP ou endereço...'
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
    return unidadesDisponiveis.filter((u) => matchesSearch(u, termo));
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
    if (!aberto || termo.length < 3 || /^https?:\/\//i.test(termo)) {
      setEnderecos([]);
      setCarregandoEnderecos(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCarregandoEnderecos(true);
      try {
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
                label: labelCep || `CEP ${dadosCep.cep}`,
                sub: `CEP ${dadosCep.cep}${dadosCep.complemento ? ` (${dadosCep.complemento})` : ''}`
              }]);
              setCarregandoEnderecos(false);
              return;
            }
          }
        }

        // Busca principal com Photon (Komoot) — tolerante a erros de digitação, acentos e abreviações
        let resultados = [];
        try {
          const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(termo)}&limit=8&lat=-2.53&lon=-44.30`;
          const resPhoton = await fetch(urlPhoton, { signal: controller.signal });
          if (resPhoton.ok) {
            const dataPhoton = await resPhoton.json();
            const features = Array.isArray(dataPhoton?.features) ? dataPhoton.features : [];
            const ordenadas = [
              ...features.filter((f) => ['BR', 'PT'].includes(f.properties?.countrycode)),
              ...features.filter((f) => !['BR', 'PT'].includes(f.properties?.countrycode))
            ];
            const vistos = new Set();
            for (const f of ordenadas) {
              const { label, sub } = formatarFeaturePhoton(f);
              if (!label || vistos.has(label.toLowerCase())) continue;
              vistos.add(label.toLowerCase());
              resultados.push({
                id: `ph-${f.properties?.osm_type || 'n'}-${f.properties?.osm_id || resultados.length}`,
                label,
                sub: sub || label
              });
              if (resultados.length >= 6) break;
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }

        // Fallback para Nominatim se o Photon não retornar nada
        if (resultados.length === 0 && !controller.signal.aborted) {
          const urlNom = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br,pt&q=${encodeURIComponent(termo)}`;
          const resNom = await fetch(urlNom, {
            signal: controller.signal,
            headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
          });
          if (resNom.ok) {
            const dataNom = await resNom.json();
            if (Array.isArray(dataNom)) {
              resultados = dataNom.map((item) => ({
                id: `nom-${item.place_id}`,
                label: formatarEnderecoNominatim(item),
                sub: item.display_name
              }));
            }
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
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, aberto]);

  const selecionar = (texto) => {
    onChange(texto);
    setAberto(false);
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
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          {unidadesFiltradas.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Unidades Kairós
              </div>
              {unidadesFiltradas.map((unidade) => (
                <button
                  key={unidade}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionar(unidade)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{unidade}</span>
                </button>
              ))}
            </div>
          )}

          {(carregandoEnderecos || enderecos.length > 0) && (
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Endereços encontrados</span>
                {carregandoEnderecos && <Loader2 className="size-3 animate-spin" />}
              </div>
              {enderecos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionar(item.label)}
                  className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-secondary"
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{item.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
