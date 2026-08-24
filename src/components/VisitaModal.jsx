import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { parseRoles } from '../utils/permissions';

export const VisitaModal = ({ isOpen, onClose, onSave, currentUser, organizacoes = [], allUsers = [], hasRole, editingVisita, holidays }) => {
  const trapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const getInitialDate = () => {
    if (editingVisita?.cr4a1_data_visita) return editingVisita.cr4a1_data_visita.split('T')[0];
    return '';
  };

  const getInitialTime = () => {
    if (editingVisita?.cr4a1_dataconexao) {
      const d = new Date(editingVisita.cr4a1_dataconexao);
      if (!isNaN(d)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '08:00';
  };

  const [cliente, setCliente] = useState(editingVisita?.cr4a1_cliente || '');
  const [clienteId, setClienteId] = useState(editingVisita?.cr4a1_cliente_id || '');
  const [searchOrg, setSearchOrg] = useState(editingVisita?.cr4a1_cliente || '');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [motivo, setMotivo] = useState(editingVisita?.cr4a1_motivo || '');
  const [visitante, setVisitante] = useState(editingVisita?.cr4a1_visitante || currentUser?.cr4a1_username);
  const [dataVisita, setDataVisita] = useState(getInitialDate());
  const [horaVisita, setHoraVisita] = useState(getInitialTime());
  const [periodo, setPeriodo] = useState(editingVisita?.cr4a1_periodo_visita || 0);
  const [filialFiltro, setFilialFiltro] = useState(editingVisita?.cr4a1_filial || currentUser?.cr4a1_unidade || 'Todas');
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('Todas');

  const canAssign = hasRole('COORD COMERCIAL') || hasRole('ADMIN');
  const podeTrocarFilial = hasRole('COORD COMERCIAL') || hasRole('ADMIN');

  const unidades = ['Todas', 'São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  const usuariosComerciais = useMemo(() => {
    return allUsers.filter(u => {
      const userRoles = parseRoles(u.cr4a1_role);

      const temRolePermitida = userRoles.includes('COMERCIAL') ||
        userRoles.includes('COORD COMERCIAL') ||
        userRoles.includes('ADMIN');

      return temRolePermitida || u.cr4a1_username === currentUser?.cr4a1_username;
    });
  }, [allUsers, currentUser]);

  const unidadesDisponiveis = useMemo(() => {
    const unidades = organizacoes
      .map(org => org.cr4a1_unidade)
      .filter(Boolean);
    return [...new Set(unidades)];
  }, [organizacoes]);

  const clientesFiltrados = useMemo(() => {
    if (unidadeSelecionada === 'Todas') return organizacoes;
    return organizacoes.filter(org => org.cr4a1_unidade === unidadeSelecionada);
  }, [organizacoes, unidadeSelecionada]);

  const visitantesFiltrados = useMemo(() => {
    const baseUsuarios = allUsers.filter(u => {
      const userRoles = parseRoles(u.cr4a1_role);
      const temRolePermitida = userRoles.includes('COMERCIAL') ||
        userRoles.includes('COORD COMERCIAL') ||
        userRoles.includes('ADMIN');

      return temRolePermitida || u.cr4a1_username === currentUser?.cr4a1_username;
    });

    if (unidadeSelecionada === 'Todas') return baseUsuarios;
    return baseUsuarios.filter(u => u.cr4a1_unidade === unidadeSelecionada);
  }, [allUsers, currentUser, unidadeSelecionada]);

  const filteredOrgs = useMemo(() => {
    return organizacoes.filter(org => {
      const matchesUnit = filialFiltro === 'Todas' || !org.cr4a1_filial_origem || org.cr4a1_filial_origem === filialFiltro;
      const isDropdownMode = searchOrg === cliente;
      const matchesSearch = isDropdownMode || !searchOrg || org.cr4a1_novacoluna?.toLowerCase().includes(searchOrg.toLowerCase());
      return matchesUnit && matchesSearch;
    });
  }, [organizacoes, searchOrg, cliente, filialFiltro]);

  if (!isOpen) return null;

  const getNextBusinessDay = (startDate, intervalDays) => {
    let date = new Date(startDate);
    let daysAdded = 0;
    while (daysAdded < intervalDays) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateString = date.toISOString().split('T')[0];
      const isHoliday = holidays.some(h => h.date === dateString);
      if (!isWeekend && !isHoliday) daysAdded++;
    }
    return date;
  };

  const handleSave = () => {
    if (!cliente || !dataVisita || !motivo) {
      toast.error("Preencha cliente, data e motivo.");
      return;
    }

    const periodoString = String(parseInt(periodo, 10) || 0);

    const dataVisitaText = `${dataVisita.split('-').reverse().join('/')} ${horaVisita}`;
    const dataConexaoDate = new Date(`${dataVisita}T${horaVisita}:00`);
    const dataConexaoIso = isNaN(dataConexaoDate) ? null : dataConexaoDate.toISOString();

    const baseVisita = {
      cr4a1_visita_id: editingVisita?.cr4a1_visita_id,
      cr4a1_cliente: cliente,
      cr4a1_cliente_id: clienteId,
      cr4a1_motivo: motivo,
      cr4a1_visitante: visitante,
      cr4a1_filial: filialFiltro === 'Todas' ? currentUser?.cr4a1_unidade : filialFiltro,
      cr4a1_data_visita: dataVisita,
      cr4a1_periodo_visita: periodoString,
      cr4a1_dataconexao: dataConexaoIso,
      cr4a1_dataconexaotoday: dataVisitaText
    };

    if (editingVisita) {
      const { cr4a1_id, ...visitaLimpa } = baseVisita;
      onSave([visitaLimpa]);
    } else {
      let visitasToCreate = [baseVisita];
      let interval = parseInt(periodo, 10) || 0;

      if (interval > 0) {
        let currentDate = new Date(`${dataVisita}T12:00:00`);
        for (let i = 0; i < 5; i++) {
          currentDate = getNextBusinessDay(currentDate, interval);
          const nextDateStr = currentDate.toISOString().split('T')[0];
          const nextDataConexaoDate = new Date(`${nextDateStr}T${horaVisita}:00`);

          visitasToCreate.push({
            ...baseVisita,
            cr4a1_data_visita: nextDateStr,
            cr4a1_dataconexao: isNaN(nextDataConexaoDate) ? null : nextDataConexaoDate.toISOString(),
            cr4a1_dataconexaotoday: `${nextDateStr.split('-').reverse().join('/')} ${horaVisita}`
          });
        }
      }
      onSave(visitasToCreate);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div ref={trapRef} tabIndex={-1} className="modal-content view-enter" style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: '#f57c00' }}>location_on</span>
          {editingVisita ? 'Editar Visita' : 'Agendar Visita'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {podeTrocarFilial && (
            <div className="input-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filtrar por Filial</label>
              <select
                value={filialFiltro}
                onChange={e => setFilialFiltro(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              >
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          <div className="input-group" style={{ position: 'relative' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
              <input
                type="text"
                value={searchOrg}
                onChange={e => {
                  setSearchOrg(e.target.value);
                  setCliente(e.target.value);
                  setClienteId('');
                  setIsOpenDropdown(true);
                }}
                onFocus={() => setIsOpenDropdown(true)}
                onBlur={() => setTimeout(() => setIsOpenDropdown(false), 200)}
                placeholder="Selecione ou pesquise o cliente..."
                style={{ width: '100%', padding: '12px 40px 12px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpenDropdown(!isOpenDropdown); }}
                style={{ position: 'absolute', right: '4px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', height: '100%', padding: '0 8px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                  {isOpenDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}
                </span>
              </button>
            </div>

            {isOpenDropdown && filteredOrgs.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', maxHeight: '180px', overflowY: 'auto', zIndex: 10100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', marginTop: '4px' }}>
                {filteredOrgs.map(org => (
                  <div
                    key={org.cr4a1_id_org || org.cr4a1_echoe_organizacoesid || org.cr4a1_novacoluna}
                    onMouseDown={() => {
                      setSearchOrg(org.cr4a1_novacoluna);
                      setCliente(org.cr4a1_novacoluna);
                      setClienteId(org.cr4a1_id_org || '');
                      setIsOpenDropdown(false);
                    }}
                    style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px', transition: 'background 0.2s' }}
                    className="dropdown-item-select"
                  >
                    {org.cr4a1_novacoluna}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Motivo da Visita</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Apresentação de propostas" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data Inicial</label>
              <input type="date" value={dataVisita} onChange={e => setDataVisita(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hora</label>
              <input type="time" value={horaVisita} onChange={e => setHoraVisita(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Período (Dias Úteis)</label>
              <input type="number" min="0" value={periodo} onChange={e => setPeriodo(e.target.value)} disabled={!!editingVisita} placeholder="0 = Única" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', opacity: editingVisita ? 0.6 : 1 }} />
            </div>
          </div>

          {canAssign && (
            <div className="input-group">
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Delegar Visitante (Apenas Comerciais)</label>
              <select value={visitante} onChange={e => setVisitante(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}>
                {usuariosComerciais.map(u => (
                  <option key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <button onClick={onClose} className="btn-secondary boing-effect" style={{ padding: '12px 24px', borderRadius: '12px' }}>Cancelar</button>
          <button onClick={handleSave} className="btn-primary boing-effect" style={{ padding: '12px 24px', borderRadius: '12px', background: '#f57c00', color: 'white' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};
