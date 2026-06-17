import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';   // 👈 ESSENCIAL para o DayTooltip
import { Toaster, toast } from 'react-hot-toast';
import { useCalendar } from './hooks/useCalendar';
import { DayView } from './components/DayView';
import { MiniMonth } from './components/MiniMonth';
import { EventModal } from './components/EventModal';
import { ListView } from './components/ListView';
import { UserManagementModal } from './components/UserManagementModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { generateMonthDays } from './utils/dateHelpers';
import { WorkspaceModal } from './components/WorkspaceModal';
import {
  format, addMonths, subMonths, addYears, subYears, addDays, subDays, startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { applyDynamicTheme } from './utils/themeGenerator';

import avanteImg from './assets/avante.png';
import echoeImg from './assets/echoe.png';
import hubImg from './assets/hub.png';
import medroImg from './assets/medro.png';

// --- COMPONENTES AUXILIARES (mantidos) ---

const BirthdayCelebration = ({ name, onClose }) => (
  <div className="view-enter" style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <div className="birthday-float" style={{ fontSize: '80px', marginBottom: '20px' }}>🎂</div>
      <h1 style={{ color: 'white', fontSize: '32px', margin: '0 0 10px' }}>Parabéns, {name}! 🥳</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginBottom: '30px' }}>A equipa Kairós deseja-te um dia incrível!</p>
      <button onClick={onClose} className="btn-primary boing-effect" style={{ padding: '12px 32px' }}>Obrigado!</button>
    </div>
    <style>{`
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
      .birthday-float { animation: float 3s ease-in-out infinite; }
    `}</style>
  </div>
);

const countryCodes = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+1', flag: '🇺🇸', name: 'EUA' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+34', flag: '🇪🇸', name: 'Espanha' }
];

const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataurl = canvas.toDataURL('image/jpeg', 0.7);
      callback(dataurl);
    };
  };
};

const WhatsAppInput = ({ initialValue, onSave, userId }) => {
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (initialValue) {
      const country = countryCodes.find(c => initialValue.startsWith(c.code.replace('+', '')));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(initialValue.replace(country.code.replace('+', ''), ''));
      } else {
        setPhoneNumber(initialValue);
      }
    }
  }, [initialValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>
          <strong>Para receber alertas no WhatsApp:</strong><br />
          1. Guarda o teu número abaixo.<br />
          2. Clica no botão verde abaixo para abrir o robô.<br />
          3. Envia <strong>"Olá"</strong> para iniciar o vínculo.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          O Teu Número
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedCountry.code}
            onChange={(e) => setSelectedCountry(countryCodes.find(c => c.code === e.target.value))}
            style={{
              padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', flex: '0 0 auto'
            }}
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>

          <input
            type="tel"
            placeholder="98985..."
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            style={{
              flex: '1 1 120px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', minWidth: '0'
            }}
          />

          <button
            onClick={() => onSave(userId, `${selectedCountry.code.replace('+', '')}${phoneNumber}`)}
            className="icon-btn boing-effect"
            style={{ background: 'var(--text-accent)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', flex: '0 0 auto' }}
          >
            <span className="material-symbols-rounded">save</span>
          </button>
        </div>
      </div>

      <a
        href="https://wa.me/5591933005886"
        target="_blank"
        rel="noopener noreferrer"
        className="boing-effect"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', borderRadius: '16px',
          background: '#25D366', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '14px',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)'
        }}
      >
        <span className="material-symbols-rounded">smart_toy</span>
        Falar com Robô Kairós
      </a>
    </div>
  );
};

// NOVOS COMPONENTES DE DRAG AND DROP (corrigidos)
const DraggableEvent = ({ event, index, children }) => {
  return (
    <Draggable draggableId={event.cr4a1_agenda_kairosid} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.7 : 1,
            cursor: 'grab',
            userSelect: 'none',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
            // Previne o lag causado por transições de CSS durante o arraste
            transition: snapshot.isDragging ? 'none' : provided.draggableProps.style?.transition,
          }}
        >
          {children}
        </div>
      )}
    </Draggable>
  );
};

const DroppableDay = ({ dateStr, children, isToday, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <Droppable droppableId={dateStr}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`calendar-day-card ${snapshot.isDraggingOver ? 'drop-over' : ''} ${isToday ? 'today' : ''}`}
          style={{
            overflow: 'hidden',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            opacity: 1,
          }}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Função para ignorar o login real durante o desenvolvimento em localhost
  const handleDevLogin = () => {
    // Define valores padrão que o teu useCalendar provavelmente espera
    localStorage.setItem('kairos_logged_user', 'admin'); 
    localStorage.setItem('kairos_user_role', 'ADMIN');
    window.location.reload(); // Recarrega para o hook ler os novos dados
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    const result = await onLogin(username, password);
    if (!result.success) {
      toast.error(result.reason === 'connection_error' ? 'Erro de conexão.' : 'Utilizador ou senha inválidos.', { style: { borderRadius: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '12px 24px' } });
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)' }}>
      <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'var(--bg-primary)', borderRadius: '16px', boxShadow: 'var(--shadow-hover)', width: '350px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-title)', marginBottom: '30px', fontWeight: '600' }}>Kairós Agenda</h2>
        <input type="text" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '25px', borderRadius: '8px', border: '1px solid var(--border-strong)', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }} />
        <button type="submit" disabled={isAuthenticating} className="boing-effect" style={{ width: '100%', padding: '12px', background: 'var(--text-accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          {isAuthenticating ? 'A validar...' : 'Entrar'}
        </button>

        {window.location.hostname === 'localhost' && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Modo Desenvolvimento</p>
            <button 
              type="button" 
              onClick={handleDevLogin}
              style={{ background: 'none', border: '1px solid var(--text-accent)', color: 'var(--text-accent)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
            >
              Ignorar Login (Localhost)
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const materialColors = [
  { id: 'blue', hex: '#1a73e8', label: 'Azul Google' },
  { id: 'cyan', hex: '#00acc1', label: 'Ciano' },
  { id: 'teal', hex: '#00897b', label: 'Verde Mar' },
  { id: 'green', hex: '#388e3c', label: 'Verde Sálvia' },
  { id: 'amber', hex: '#ffb300', label: 'Amarelo Ouro' },
  { id: 'orange', hex: '#f57c00', label: 'Laranja Outono' },
  { id: 'coral', hex: '#f4511e', label: 'Coral' },
  { id: 'rose', hex: '#d81b60', label: 'Rosa Escuro' },
  { id: 'purple', hex: '#673ab7', label: 'Lavanda' },
  { id: 'indigo', hex: '#3949ab', label: 'Índigo' },
  { id: 'graphite', hex: '#5f6368', label: 'Grafite' },
  { id: 'red', hex: '#d32f2f', label: 'Vermelho' },
  { id: 'pink', hex: '#c2185b', label: 'Rosa' },
  { id: 'lime', hex: '#afb42b', label: 'Lima' },
  { id: 'light-blue', hex: '#0288d1', label: 'Azul Claro' },
  { id: 'deep-orange', hex: '#e64a19', label: 'Laranja Profundo' },
  { id: 'brown', hex: '#5d4037', label: 'Marrom' },
  { id: 'blue-grey', hex: '#455a64', label: 'Cinza Azulado' },
  { id: 'violet', hex: '#7b1fa2', label: 'Violeta' },
  { id: 'emerald', hex: '#2e7d32', label: 'Esmeralda' },
  { id: 'sky', hex: '#03a9f4', label: 'Céu' },
  { id: 'gold', hex: '#fbc02d', label: 'Ouro' }
];

const OnboardingModal = ({ user, onSaveUnit }) => {
  const [selectedUnit, setSelectedUnit] = React.useState('');
  const units = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  return (
    <div className="modal-overlay" style={{ zIndex: 20000, backgroundColor: 'var(--bg-page)' }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', borderRadius: '32px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '48px' }}>🏢</span>
        <h2 style={{ margin: '20px 0 10px', color: 'var(--text-title)' }}>Bem-vindo à Kairós!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px' }}>Seleciona a tua unidade para configurares o teu perfil:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {units.map(unit => (
            <button key={unit} onClick={() => setSelectedUnit(unit)} className="boing-effect" style={{ padding: '14px', borderRadius: '12px', border: selectedUnit === unit ? '2px solid var(--text-accent)' : '1px solid var(--border-color)', background: selectedUnit === unit ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: selectedUnit === unit ? '700' : '500' }}>{unit}</button>
          ))}
        </div>
        <button disabled={!selectedUnit} onClick={() => onSaveUnit(selectedUnit)} className="btn-primary boing-effect" style={{ width: '100%', padding: '16px', opacity: selectedUnit ? 1 : 0.5 }}>Confirmar e Entrar</button>
      </div>
    </div>
  );
};

// --- COMPONENTE DE VISITAS ---
const VisitaModal = ({ isOpen, onClose, onSave, currentUser, organizacoes = [], allUsers = [], hasRole, editingVisita, holidays }) => {
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
      const userRoles = u.cr4a1_role ? u.cr4a1_role.split(',').map(r => r.trim()) : [];

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
      const userRoles = u.cr4a1_role ? u.cr4a1_role.split(',').map(r => r.trim()) : [];
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
      <div className="modal-content view-enter" style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
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

// --- MODAL DE GESTÃO DE FILIAL TEMPORÁRIA ---
const FilialTemporariaModal = ({ isOpen, onClose, allUsers, onSave, mostrarTodos = false }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [unidade, setUnidade] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const units = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  const usuariosDisponiveis = useMemo(() => {
    if (mostrarTodos) return allUsers;
    return allUsers.filter(u => {
      const userRoles = u.cr4a1_role ? u.cr4a1_role.split(',').map(r => r.trim()) : [];
      return userRoles.includes('COMERCIAL');
    });
  }, [allUsers, mostrarTodos]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!selectedUser || !unidade || !inicio || !fim) {
      toast.error("Preencha todos os campos do período temporário.");
      return;
    }
    const loadingToast = toast.loading("A aplicar transferência temporária...");
    const res = await onSave(selectedUser, { unidade, inicio, fim });
    if (res.success) {
      toast.success("Filial temporária aplicada e agendada no sistema!", { id: loadingToast });
      onClose();
    } else {
      toast.error("Erro ao sincronizar dados. Tente novamente.", { id: loadingToast });
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10500, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content view-enter" style={{ width: '90%', maxWidth: '450px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>swap_horiz</span>
          Filial Temporária {mostrarTodos ? '(Todos)' : '(Comercial)'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Selecionar {mostrarTodos ? 'Funcionário' : 'Comercial'}
            </label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">Selecione um profissional...</option>
              {usuariosDisponiveis.map(u => (
                <option key={u.cr4a1_usuarios_agendaid} value={u.cr4a1_usuarios_agendaid}>
                  {u.cr4a1_nome_exibicao || u.cr4a1_username} ({u.cr4a1_unidade || 'Sem unidade'})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filial de Destino Temporário</label>
            <select value={unidade} onChange={e => setUnidade(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <option value="">Selecione a nova filial...</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data Início</label>
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data Fim</label>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={onClose} className="btn-secondary boing-effect" style={{ padding: '12px 20px', borderRadius: '12px' }}>Cancelar</button>
          <button onClick={handleApply} className="btn-primary boing-effect" style={{ padding: '12px 20px', borderRadius: '12px' }}>Aplicar Viagem</button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE LISTAGEM DE VISITAS DO DIA ---
const DayVisitasModal = ({ isOpen, onClose, visitas, onEditVisita, allUsers = [] }) => {
  if (!isOpen || !visitas || visitas.length === 0) return null;

  const getUserName = (login) => {
    const user = allUsers.find(u => u.cr4a1_username === login);
    return user?.cr4a1_nome_exibicao || login;
  };

  const getVisitaTime = (v) => {
    if (v.originalData?.cr4a1_dataconexao) {
      const d = new Date(v.originalData.cr4a1_dataconexao);
      if (!isNaN(d)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return v.cr4a1_hora_inicio || '08:00';
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10600, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content view-enter" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-title)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: '#f57c00' }}>view_agenda</span>
            Visitas do Dia
          </h3>
          <button onClick={onClose} className="icon-btn" style={{ color: 'var(--text-primary)' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
          {visitas.map((v, idx) => (
            <div
              key={v.cr4a1_agenda_kairosid || idx}
              onClick={() => {
                onEditVisita(v);
                onClose();
              }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              className="boing-effect"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: '700', color: 'var(--text-title)', fontSize: '15px' }}>
                  {v.cr4a1_titulo.replace('📍 Visita: ', '')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff3e0', color: '#f57c00', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>schedule</span>
                  {getVisitaTime(v)}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>person</span>
                {getUserName(v.cr4a1_user_login)}
              </div>

              {(v.originalData?.cr4a1_motivo || v.originalData?.cr4a1_filial) && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  {v.originalData?.cr4a1_motivo && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Motivo:</strong> {v.originalData.cr4a1_motivo}
                    </div>
                  )}
                  {v.originalData?.cr4a1_filial && (
                    <div>
                      <strong>Unidade:</strong> {v.originalData.cr4a1_filial}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DE TOOLTIP PARA A VISUALIZAÇÃO MENSAL ---
const DayTooltip = ({ dayData, allUsers, onEditEvent, onMouseEnter, onMouseLeave }) => {
  if (!dayData) return null;
  const { dateStr, events, rect } = dayData;
  if (!rect) return null;

  const userColorMap = allUsers.reduce((acc, curr) => {
    acc[curr.cr4a1_username] = curr.cr4a1_cor || '#ccc';
    return acc;
  }, {});

  const style = {
    position: 'fixed',
    left: Math.min(rect.left + rect.width / 2, window.innerWidth - 300),
    top: rect.bottom + 8,
    transform: 'translateX(-50%)',
    zIndex: 99999,
    pointerEvents: 'auto',
    animation: 'fadeInDown 0.2s ease-out',
  };

  return ReactDOM.createPortal(
    <div
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        maxWidth: '280px',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
          {format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((ev, idx) => (
            <div
              key={idx}
              onClick={() => onEditEvent(ev)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px',
                borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <div style={{
                minWidth: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: userColorMap[ev.cr4a1_user_login] || '#ccc', marginTop: '5px'
              }} />
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                <span style={{ fontWeight: '700', color: userColorMap[ev.cr4a1_user_login] || '#7f8c8d' }}>
                  {ev.cr4a1_user_login}:
                </span> {ev.cr4a1_titulo}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- COMPONENTE PRINCIPAL ---

function App() {
  const {
    view, setView, currentDate, setCurrentDate, holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser, allUsers, eventTypes, addEventType, deleteEventType, login, logout, loading, isValidatingSession, updateUserColor, filters, setFilters, filteredEvents, moveEvent,
    updateWhatsApp, addWorkspace, updateWorkspace, updateUnit, updateProfile,
    workspaces, activeWorkspaces, toggleWorkspaceFilter,
    organizacoes = [], visitas = [], addVisitas, updateVisitas, atualizarFilialTemporaria
  } = useCalendar();

  const roles = useMemo(() => Array.isArray(userRole) ? userRole : (typeof userRole === 'string' ? userRole.split(',').map(r => r.trim()) : []), [userRole]);
  const hasRole = (role) => roles.includes('ADMIN') || roles.includes(role);

  const viewsConfig = useMemo(() => [
    { id: 'year', label: 'Ano', icon: 'calendar_view_month' },
    { id: 'month', label: 'Mês', icon: 'calendar_month' },
    { id: 'week', label: 'Semana', icon: 'view_week' },
    { id: '3days', label: '3 Dias', icon: 'view_timeline' },
    { id: 'day', label: 'Dia', icon: 'view_day' }
  ], []);

  const handleDragStart = (start) => {
    if (start.draggableId.startsWith('member_')) {
      setIsDraggingMember(true);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination || source.droppableId === destination.droppableId) {
      setIsDraggingMember(false);
      return;
    }

    const newDateStr = destination.droppableId;

    if (draggableId.startsWith('member_')) {
      const memberUsername = draggableId.substring(7);
      
      const canAssign = hasRole('ADMIN') || hasRole('COORD');
      if (!canAssign) {
        toast.error("Apenas ADMIN ou COORD podem atribuir eventos desta forma.");
        return;
      }

      // Prepara os dados do modal ANTES de abrir
      if (devWorkspace) setPreselectedWorkspaceId(devWorkspace.cr4a1_calendarios_workspacesid);
      setPreselectedTargetUser(memberUsername);
      setEditingEvent(null);

      const targetDate = new Date(newDateStr + 'T12:00:00');
      setCurrentDate(targetDate);
      
      // Reseta o estado de arraste imediatamente
      setIsDraggingMember(false);

      // Timeout ligeiramente maior para garantir que o DND finalize a remoção do Portal
      setTimeout(() => {
        setIsModalOpen(true);
      }, 150); 
      return;
    }

    setIsDraggingMember(false);
    const allEvents = getDisplayEvents();
    const draggedEvent = allEvents.find(ev => ev.cr4a1_agenda_kairosid === draggableId);
    if (!draggedEvent) return;

    if (draggedEvent.isVisitaPrincipal && draggedEvent.originalData) {
      const originalTime = draggedEvent.originalData.cr4a1_dataconexao
        ? (() => { const d = new Date(draggedEvent.originalData.cr4a1_dataconexao); return isNaN(d) ? '08:00' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })()
        : '08:00';

      const newConexaoDate = new Date(`${newDateStr}T${originalTime}:00`);

      const updatedVisita = {
        ...draggedEvent.originalData,
        cr4a1_data_visita: newDateStr,
        cr4a1_dataconexao: isNaN(newConexaoDate) ? null : newConexaoDate.toISOString(),
        cr4a1_dataconexaotoday: `${newDateStr.split('-').reverse().join('/')} ${originalTime}`
      };

      try {
        await updateVisitas(updatedVisita);
        toast.success('Visita reagendada!');
      } catch (err) {
        toast.error('Erro ao reagendar visita.');
      }
      return;
    }

    if (!draggedEvent.isVisitaPrincipal && !draggedEvent.isIntervalo) {
      moveEvent(draggableId, newDateStr);
      return;
    }
  };

  const notifiedRef = useRef(new Set());
  const [appMode, setAppMode] = useState('calendar');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingVisita, setEditingVisita] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [preselectedTargetUser, setPreselectedTargetUser] = useState('');
  const [preselectedWorkspaceId, setPreselectedWorkspaceId] = useState('');
  const [isDraggingMember, setIsDraggingMember] = useState(false);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dayViewMode, setDayViewMode] = useState('timeline');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kairos_accent_color') || '#1a73e8');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [isFilialTemporariaOpen, setIsFilialTemporariaOpen] = useState(false);

  const [dayVisitasModalOpen, setDayVisitasModalOpen] = useState(false);
  const [selectedDayVisitas, setSelectedDayVisitas] = useState([]);

  // --- ESTADO DO TOOLTIP ---
  const [dayTooltip, setDayTooltip] = useState(null); // { dateStr, events, rect }
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const tooltipTimer = useRef(null);

  const handleDayMouseEnter = (dateStr, events, rect) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setDayTooltip({ dateStr, events, rect });
  };

  const handleDayMouseLeave = () => {
    tooltipTimer.current = setTimeout(() => {
      if (!isTooltipHovered) {
        setDayTooltip(null);
      }
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setIsTooltipHovered(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipHovered(false);
    tooltipTimer.current = setTimeout(() => {
      setDayTooltip(null);
    }, 200);
  };

  const handleEditWorkspaceClick = (ws) => {
    setEditingWorkspace(ws);
    setIsWorkspaceModalOpen(true);
  };
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isPowerAppsFabOpen, setIsPowerAppsFabOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showBirthday, setShowBirthday] = useState(false);

  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState(() => localStorage.getItem('kairos_default_workspace'));
  const [isScrolled, setIsScrolled] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [listViewMode, setListViewMode] = useState('grid');

  const currentUser = allUsers.find(u => u.cr4a1_username === user);

  const taskEvents = useMemo(() => {
    const devWorkspace = workspaces.find(ws => ws.cr4a1_nome === "Desenvolvimento e Inovação");
    if (!devWorkspace) return [];
    return events.filter(e => e.cr4a1_workspace_id === devWorkspace.cr4a1_calendarios_workspacesid);
  }, [events, workspaces]);

  const devWorkspace = useMemo(() => workspaces.find(ws => ws.cr4a1_nome === "Desenvolvimento e Inovação"), [workspaces]);
  
  const isDevWorkspaceActive = useMemo(() => {
    if (!devWorkspace) return false;
    return activeWorkspaces.includes(devWorkspace.cr4a1_calendarios_workspacesid) || 
           (activeWorkspaces.length === 0 && defaultWorkspaceId === devWorkspace.cr4a1_calendarios_workspacesid);
  }, [devWorkspace, activeWorkspaces, defaultWorkspaceId]);

  const devWorkspaceMembers = useMemo(() => {
    if (!devWorkspace) return [];
    const logins = new Set();
    if (devWorkspace.cr4a1_criador_login) logins.add(devWorkspace.cr4a1_criador_login);
    if (devWorkspace.cr4a1_membros_logins) {
      devWorkspace.cr4a1_membros_logins.split(',').forEach(m => {
        const trimmed = m.trim();
        if (trimmed) logins.add(trimmed);
      });
    }
    return allUsers.filter(u => logins.has(u.cr4a1_username));
  }, [devWorkspace, allUsers]);

  const mappedVisitas = useMemo(() => {
    if (!visitas || visitas.length === 0) return [];

    const visitasFiltradas = (hasRole('ADMIN') || hasRole('COORD COMERCIAL'))
      ? visitas
      : visitas.filter(v => v.cr4a1_visitante === currentUser?.cr4a1_username);

    const sorted = [...visitasFiltradas].sort((a, b) =>
      (a.cr4a1_data_visita || '').localeCompare(b.cr4a1_data_visita || '')
    );

    const resultado = [];

    for (let i = 0; i < sorted.length; i++) {
      const visita = sorted[i];
      const dataVisita = visita.cr4a1_data_visita?.split('T')[0];
      if (!dataVisita) continue;

      const usuario = allUsers.find(u => u.cr4a1_username === visita.cr4a1_visitante);
      const corUsuario = usuario?.cr4a1_cor || '#f57c00';

      resultado.push({
        cr4a1_agenda_kairosid: visita.cr4a1_visita_id,
        cr4a1_titulo: `📍 Visita: ${visita.cr4a1_cliente}`,
        cr4a1_data_inicio: dataVisita,
        cr4a1_data_fim: dataVisita,
        cr4a1_hora_inicio: '08:00',
        cr4a1_cor: corUsuario,
        cr4a1_user_login: visita.cr4a1_visitante,
        cr4a1_dia_inteiro: true,
        isVisitaPrincipal: true,
        isVisita: true,
        originalData: visita,
      });

      const proximaData = i + 1 < sorted.length
        ? sorted[i + 1].cr4a1_data_visita?.split('T')[0]
        : null;

      if (proximaData) {
        let current = new Date(dataVisita + 'T12:00:00');
        const end = new Date(proximaData + 'T12:00:00');
        current.setDate(current.getDate() + 1);

        while (current < end) {
          const dateStr = format(current, 'yyyy-MM-dd');
          resultado.push({
            cr4a1_agenda_kairosid: `intervalo_${dateStr}`,
            cr4a1_titulo: 'Período entre visitas',
            cr4a1_data_inicio: dateStr,
            cr4a1_data_fim: dateStr,
            cr4a1_hora_inicio: '00:00',
            cr4a1_cor: corUsuario,
            cr4a1_user_login: visita.cr4a1_visitante,
            cr4a1_dia_inteiro: true,
            isIntervalo: true,
          });
          current.setDate(current.getDate() + 1);
        }
      }
    }
    return resultado;
  }, [visitas, currentUser, allUsers, roles]);

  const getDisplayEvents = () => {
    if (appMode === 'visitas') return mappedVisitas;
    if (activeWorkspaces.length > 0) return filteredEvents;
    if (defaultWorkspaceId) {
      return filteredEvents.filter(e => e.cr4a1_workspace_id === defaultWorkspaceId);
    }
    return filteredEvents;
  };

  const handleGetEventsForDay = (day) => {
    const targetDate = format(day, 'yyyy-MM-dd');
    return getDisplayEvents().filter(event => {
      const startDate = event.cr4a1_data_inicio?.split('T')[0];
      const endDate = event.cr4a1_data_fim?.split('T')[0] || startDate;
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const handleSaveVisitaData = async (visitasArray) => {
    const loadingToast = toast.loading("A processar agendamento no Dataverse...");
    try {
      if (editingVisita) {
        await updateVisitas(visitasArray[0]);
        toast.success("Visita comercial atualizada com sucesso!", { id: loadingToast });
      } else {
        await addVisitas(visitasArray);
        toast.success(`${visitasArray.length} visita(s) agendada(s) com sucesso!`, { id: loadingToast });
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao registar agendamento. Verifique a ligação.", { id: loadingToast });
    }
  };

  const handleToggleSubtask = async (task, index) => {
    try {
      const subtasks = task.cr4a1_subtasks ? (typeof task.cr4a1_subtasks === 'string' ? JSON.parse(task.cr4a1_subtasks) : task.cr4a1_subtasks) : [];
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[index].completed = !updatedSubtasks[index].completed;

      const cleanStartDate = task.cr4a1_data_inicio ? task.cr4a1_data_inicio.split('T')[0] : '';
      const cleanEndDate = task.cr4a1_data_fim ? task.cr4a1_data_fim.split('T')[0] : cleanStartDate;

      await updateEvent({
        ...task,
        cr4a1_subtasks: JSON.stringify(updatedSubtasks),
        title: task.cr4a1_titulo,
        details: task.cr4a1_detalhes || task.cr4a1_descricao || '',
        startDate: cleanStartDate,
        endDate: cleanEndDate,
        startHour: task.cr4a1_hora_inicio || '08:00',
        endHour: task.cr4a1_hora_fim || '09:00',
        allDay: task.cr4a1_dia_inteiro,
        targetUser: task.cr4a1_user_login,
        workspaceId: task.cr4a1_workspace_id
      });

      if (updatedSubtasks[index].completed) {
        toast.success(`Check! ${updatedSubtasks[index].text} concluído.`, { icon: '✅' });
      }
    } catch (error) {
      toast.error("Erro ao atualizar subtarefa.");
      console.error(error);
    }
  };

  const minSwipeDistance = 50;

  useEffect(() => {
    if (user && allUsers.length > 0) {
      if (currentUser?.cr4a1_aniversario) {
        const today = format(new Date(), 'MM-dd');
        const birthday = currentUser.cr4a1_aniversario.substring(5, 10);
        const sessionCelebrated = sessionStorage.getItem('kairos_birthday_celebrated');
        if (today === birthday && !sessionCelebrated) {
          setShowBirthday(true);
          sessionStorage.setItem('kairos_birthday_celebrated', 'true');
        }
      }
    }
  }, [user, allUsers, currentUser]);

  useEffect(() => {
    const checkNotifications = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const milestones = [30, 15, 5, 0];
      events.forEach(event => {
        if (event.cr4a1_dia_inteiro || !event.cr4a1_hora_inicio) return;
        const [year, month, day] = event.cr4a1_data_inicio.split('T')[0].split('-').map(Number);
        const [hours, minutes] = event.cr4a1_hora_inicio.split(':').map(Number);
        const eventDate = new Date(year, month - 1, day, hours, minutes, 0);
        const diffMs = eventDate - now;
        const diffMin = Math.floor(diffMs / 60000);

        if (milestones.includes(diffMin)) {
          const notificationKey = `${event.cr4a1_agenda_kairosid}_${diffMin}`;
          if (!notifiedRef.current.has(notificationKey)) {
            const title = `📌 ${event.cr4a1_titulo}`;
            const options = {
              body: diffMin === 0 ? "A começar agora!" : `Em ${diffMin} minutes.`,
              icon: '/icon-512.jpg',
              tag: event.cr4a1_agenda_kairosid,
              badge: '/icon-512.jpg',
              vibrate: [200, 100, 200],
              requireInteraction: diffMin <= 5
            };
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
              });
            } else {
              new Notification(title, options);
            }
            notifiedRef.current.add(notificationKey);
          }
        }
      });
      if (notifiedRef.current.size > 50) notifiedRef.current.clear();
    };
    const timer = setInterval(checkNotifications, 30000);
    return () => clearInterval(timer);
  }, [events]);

  useEffect(() => {
    applyDynamicTheme(accentColor, theme === 'dark');
    localStorage.setItem('kairos_accent_color', accentColor);
    localStorage.setItem('theme', theme);
  }, [accentColor, theme]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-accent', accentColor);
    localStorage.setItem('kairos_accent_color', accentColor);
  }, [accentColor]);

  if (isValidatingSession) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)', gap: '16px' }}>
      <span style={{ fontSize: '48px' }}>📅</span><p style={{ color: 'var(--text-secondary)' }}>A verificar sessão...</p>
    </div>
  );

  if (!user) return <LoginScreen onLogin={login} />;

  if (currentUser && !currentUser.cr4a1_unidade) {
    return <OnboardingModal user={user} onSaveUnit={(unit) => updateUnit(currentUser.cr4a1_usuarios_agendaid, unit)} />;
  }

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe && touchStart < 60) setIsSidebarOpen(true);
    if (isLeftSwipe && isSidebarOpen) setIsSidebarOpen(false);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Este navegador não suporta notificações.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notificações ativadas!', { icon: '🔔' });
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Kairós Agenda', {
            body: 'As notificações estão a funcionar perfeitamente!',
            icon: '/icon-512.jpg'
          });
        });
      }
    } else {
      toast.error('As notificações foram bloqueadas.');
    }
  };

  const handleSaveEvent = async (data) => {
    try {
      if (data.cr4a1_event_id) await updateEvent(data);
      else await addEvent(data);
      toast.success("Guardado com sucesso!");
      setIsModalOpen(false);
    } catch (err) { toast.error("Falha ao guardar."); throw err; }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.cr4a1_agenda_kairosid, eventToDelete.cr4a1_user_login);
      toast.success("Eliminado."); setIsDeleteModalOpen(false); setEventToDelete(null);
    } catch (err) { toast.error("Falha ao eliminar."); }
  };

  const handleEditClick = (event) => {
    if (event.isVisitaPrincipal) {
      if (hasRole('ADMIN') || hasRole('COMERCIAL') || hasRole('COORD COMERCIAL')) {
        setEditingVisita(event.originalData);
        setIsVisitaModalOpen(true);
      }
      return;
    }

    if (event.isIntervalo) return;

    if (hasRole('SECRETARIA') || hasRole('COORD') || hasRole('ADMIN') || event.cr4a1_user_login === user) {
      setEditingEvent(event); setIsModalOpen(true);
    } else {
      toast.error("Acesso Negado.", { icon: '🚫' });
    }
  };

  const handleDayClick = (dateStr, events) => {
    setSelectedDayVisitas(events);
    setDayVisitasModalOpen(true);
  };

  const getEventColor = (event) => event.cr4a1_cor || (allUsers.find(u => u.cr4a1_username === event.cr4a1_user_login)?.cr4a1_cor || '#3498db');

  const handleNavigate = (direction) => {
    const isNext = direction === 'next';
    if (view === 'year') setCurrentDate(isNext ? addYears(currentDate, 1) : subYears(currentDate, 1));
    else if (view === 'week') setCurrentDate(isNext ? addDays(currentDate, 7) : subDays(currentDate, 7));
    else if (view === '3days') setCurrentDate(isNext ? addDays(currentDate, 3) : subDays(currentDate, 3));
    else if (view === 'day') setCurrentDate(isNext ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else setCurrentDate(isNext ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleSetDefaultWorkspace = (id) => {
    setDefaultWorkspaceId(id);
    localStorage.setItem('kairos_default_workspace', id);
    toast.success("Workspace padrão atualizado!", { icon: '⭐' });
  };

  const getWorkspaceBorderStyle = () => {
    if (appMode === 'visitas') return { border: '1px solid var(--border-color)', overflow: 'visible' };

    const activeWSColors = workspaces
      .filter(ws => activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid))
      .map(ws => ws.cr4a1_cor_hex || '#3498db');

    if (activeWSColors.length === 0 && defaultWorkspaceId) {
      const defWS = workspaces.find(w => w.cr4a1_calendarios_workspacesid === defaultWorkspaceId);
      if (defWS) activeWSColors.push(defWS.cr4a1_cor_hex || '#3498db');
    }

    if (activeWSColors.length === 1) {
      return { border: `1px solid ${activeWSColors[0]}`, overflow: 'visible' };
    } else if (activeWSColors.length > 1) {
      return {
        padding: '1.5px',
        background: `linear-gradient(135deg, ${activeWSColors.join(', ')})`,
        borderRadius: '16px',
        overflow: 'visible'
      };
    }
    return { border: '1px solid var(--border-color)', overflow: 'visible' };
  };

  const wsBorderStyle = getWorkspaceBorderStyle();

  const toggleFilter = (type, value) => {
    setFilters(prev => {
      const currentList = [...prev[type]];
      const index = currentList.indexOf(value);
      if (index > -1) currentList.splice(index, 1);
      else currentList.push(value);
      return { ...prev, [type]: currentList };
    });
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}
      >
        <Toaster position="bottom-center" />

        {showBirthday && <BirthdayCelebration name={currentUser?.cr4a1_nome_exibicao || user} onClose={() => setShowBirthday(false)} />}

        {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, backdropFilter: 'blur(4px)', transition: 'opacity 0.3s' }} />
        )}

        {/* SIDEBAR ESQUERDA (MENU) */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', width: '320px', maxWidth: '85vw', backgroundColor: 'var(--bg-primary)', zIndex: 3100,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRight: '1px solid var(--border-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          borderTopRightRadius: '24px', borderBottomRightRadius: '24px', boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none'
        }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h1 className="logo" style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)' }}>calendar_month</span> Kairós
              </h1>
              <button onClick={() => setIsSidebarOpen(false)} className="icon-btn" style={{ color: 'var(--text-primary)' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Modo de Visualização</div>
              <button onClick={() => { setAppMode('calendar'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                backgroundColor: appMode === 'calendar' ? 'var(--bg-tertiary)' : 'transparent',
                color: appMode === 'calendar' ? 'var(--text-accent)' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded">calendar_month</span> Agenda
              </button>

              {(hasRole('DIRETORIA') || hasRole('ADMIN') || hasRole('COORD') || hasRole('SECRETARIA') || hasRole('RH')) && (
                <button onClick={() => { setAppMode('tasks'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                  justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  backgroundColor: appMode === 'tasks' ? 'var(--bg-tertiary)' : 'transparent',
                  color: appMode === 'tasks' ? 'var(--text-accent)' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded">assignment</span> Tarefas
                </button>
              )}

              {(hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN')) && (
                <button onClick={() => { setAppMode('visitas'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                  justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  backgroundColor: appMode === 'visitas' ? '#fff3e0' : 'transparent',
                  color: appMode === 'visitas' ? '#f57c00' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded">location_on</span> Visitas
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Vistas do Calendário</div>
              {viewsConfig.map(v => (
                <button key={v.id} onClick={() => { setView(v.id); setIsSidebarOpen(false); if (appMode === 'tasks') setAppMode('calendar'); }} className="nav-pill boing-effect" style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                  fontWeight: (view === v.id && appMode !== 'tasks') ? '700' : '500', backgroundColor: (view === v.id && appMode !== 'tasks') ? 'var(--bg-tertiary)' : 'transparent', color: (view === v.id && appMode !== 'tasks') ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)', transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{v.icon}</span> {v.label}
                </button>
              ))}
              <button onClick={() => { setView('list'); setIsSidebarOpen(false); if (appMode === 'tasks') setAppMode('calendar'); }} className="nav-pill boing-effect" style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                fontWeight: (view === 'list' && appMode !== 'tasks') ? '700' : '500', backgroundColor: (view === 'list' && appMode !== 'tasks') ? 'var(--bg-tertiary)' : 'transparent', color: (view === 'list' && appMode !== 'tasks') ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)', transition: 'all 0.2s'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>view_agenda</span> Fichas
              </button>
            </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Cor do Tema</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {materialColors.map(c => (
                  <div key={c.id} onClick={() => setAccentColor(c.hex)} className="boing-effect" style={{
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: c.hex, cursor: 'pointer', margin: 'auto',
                    border: accentColor === c.hex ? '3px solid var(--bg-primary)' : 'none',
                    boxShadow: accentColor === c.hex ? `0 0 0 2px ${c.hex}` : '0 2px 5px rgba(0,0,0,0.1)',
                    transform: accentColor === c.hex ? 'scale(1.15)' : 'scale(1)'
                  }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {appMode !== 'visitas' && (
              <>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
                  <input placeholder="Procurar evento..." value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Workspaces</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {workspaces.map(ws => (
                      <div key={ws.cr4a1_calendarios_workspacesid} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: '8px 10px', borderRadius: '12px',
                          backgroundColor: activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid) ? 'var(--bg-tertiary)' : 'transparent',
                        }}>
                          <input
                            type="checkbox"
                            checked={activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid)}
                            onChange={() => toggleWorkspaceFilter(ws.cr4a1_calendarios_workspacesid)}
                            style={{ accentColor: ws.cr4a1_cor_hex || 'var(--text-accent)', width: '18px', height: '18px' }}
                          />
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ws.cr4a1_cor_hex || '#3498db' }}></div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{ws.cr4a1_nome}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{ws.cr4a1_tipo_workspace}</span>
                          </div>
                        </label>
                        {(ws.cr4a1_criador_login === user || hasRole('ADMIN')) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditWorkspaceClick(ws); }}
                            className="icon-btn boing-effect"
                            title="Editar Workspace"
                            style={{ color: 'var(--text-secondary)', background: 'transparent', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleSetDefaultWorkspace(ws.cr4a1_calendarios_workspacesid)}
                          className="icon-btn boing-effect"
                          title="Definir como padrão"
                          style={{ color: defaultWorkspaceId === ws.cr4a1_calendarios_workspacesid ? 'var(--text-accent)' : 'var(--border-color)', background: 'transparent' }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                            {defaultWorkspaceId === ws.cr4a1_calendarios_workspacesid ? 'star' : 'star_outline'}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Colegas de Equipa</div>
                  <input
                    placeholder="Procurar colega..."
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '16px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                    {allUsers.filter(u => {
                      const matchesSearch = u.cr4a1_username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (u.cr4a1_nome_exibicao && u.cr4a1_nome_exibicao.toLowerCase().includes(userSearchTerm.toLowerCase()));

                      if (hasRole('COMUM') && !hasRole('ADMIN')) return matchesSearch && u.cr4a1_unidade === currentUser.cr4a1_unidade;
                      return matchesSearch;
                    }).map(u => (
                      <label key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', padding: '4px 0' }}>
                        <input
                          type="checkbox"
                          checked={filters.users.includes(u.cr4a1_username)}
                          onChange={() => toggleFilter('users', u.cr4a1_username)}
                          style={{ accentColor: u.cr4a1_cor || 'var(--text-accent)' }}
                        />

                        {u.cr4a1_foto ? (
                          <img
                            src={u.cr4a1_foto}
                            alt={u.cr4a1_username}
                            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }}
                          />
                        ) : (
                          <div
                            style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: u.cr4a1_cor || '#3498db', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: '700' }}
                          >
                            {u.cr4a1_username?.[0]?.toUpperCase()}
                          </div>
                        )}

                        <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.cr4a1_nome_exibicao || u.cr4a1_username}
                        </span>

                        <span style={{ fontSize: '10px', opacity: 0.6, backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                          {u.cr4a1_unidade}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Tipos de Eventos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {eventTypes.map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                        <input type="checkbox" checked={filters.types.includes(t.name)} onChange={() => toggleFilter('types', t.name)} style={{ accentColor: 'var(--text-accent)', width: '18px', height: '18px' }} />
                        <span>{t.emoji} {t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {(filters.text || filters.users.length > 0 || filters.types.length > 0) && (
                  <button onClick={() => setFilters({ text: '', users: [], types: [] })} className="btn-secondary boing-effect" style={{ width: '100%', borderRadius: '16px' }}>Limpar Filtros</button>
                )}
              </>
            )}
          </div>
        </div>

        {/* HEADER FLEXÍVEL E INTELIGENTE */}
        <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>

          <div className="header-left">
            <button onClick={() => setIsSidebarOpen(true)} className="icon-btn boing-effect" style={{ color: 'var(--text-primary)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>menu</span>
            </button>
            <h1 className="logo boing-effect" onClick={() => { setView('month'); setCurrentDate(new Date()); setAppMode('calendar'); }} style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)', fontSize: '28px' }}>
                {appMode === 'visitas' ? 'location_on' : 'calendar_month'}
              </span>
              <span className="nav-label-collapse">{appMode === 'visitas' ? 'Visitas' : 'Kairós'}</span>
            </h1>

            <div className="segmented-views" style={{
              display: 'inline-flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '100px', padding: '4px', alignItems: 'center', gap: '2px', boxSizing: 'border-box'
            }}>
              {viewsConfig.map(v => {
                const isActive = view === v.id && appMode !== 'tasks';
                return (
                  <button
                    key={v.id}
                    onClick={() => { setView(v.id); if (appMode === 'tasks') setAppMode('calendar'); }}
                    className={`boing-effect ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '100px', border: 'none',
                      background: isActive ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '13px', fontWeight: isActive ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: isActive ? '#ffffff' : 'inherit' }}>{v.icon}</span>
                    <span className="nav-label-collapse">{v.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { setView('list'); if (appMode === 'tasks') setAppMode('calendar'); }}
              className={`boing-effect ${view === 'list' && appMode !== 'tasks' ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '100px',
                border: (view === 'list' && appMode !== 'tasks') ? `1px solid ${appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)'}` : '1px solid var(--border-color)',
                background: (view === 'list' && appMode !== 'tasks') ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: (view === 'list' && appMode !== 'tasks') ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>view_agenda</span>
              <span className="nav-label-collapse">Fichas</span>
            </button>

            {((appMode === 'visitas' && (hasRole('COORD COMERCIAL') || hasRole('ADMIN'))) ||
              (appMode === 'calendar' && (hasRole('RH') || hasRole('ADMIN')))) && (
                <button
                  onClick={() => setIsFilialTemporariaOpen(true)}
                  className="btn-secondary boing-effect filial-temp-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '100px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <span className="material-symbols-rounded filial-temp-icon" style={{ fontSize: '18px', color: appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)' }}>swap_horiz</span>
                  <span className="filial-temp-text">Filial Temporária</span>
                </button>
              )}
          </div>

          <div className="header-profile">
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className="boing-effect"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', borderRadius: '32px', padding: '4px 12px 4px 4px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '500' }}
            >
              {currentUser?.cr4a1_foto ? (
                <img src={currentUser.cr4a1_foto} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
              ) : (
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--text-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                  {user?.[0]?.toUpperCase()}
                </span>
              )}
              <span className="profile-name" style={{ color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                {currentUser?.cr4a1_nome_exibicao || user}
              </span>
            </div>
            <button onClick={logout} className="icon-btn boing-effect" title="Sair do sistema" style={{ color: '#e74c3c' }}>
              <span className="material-symbols-rounded">logout</span>
            </button>
          </div>

          <div className="header-bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => handleNavigate('prev')} className="icon-btn boing-effect">
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="nav-pill boing-effect"><span>Hoje</span></button>
              <button onClick={() => handleNavigate('next')} className="icon-btn boing-effect">
                <span className="material-symbols-rounded">chevron_right</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', color: 'var(--text-title)', fontWeight: '400', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {format(currentDate, view === 'day' ? "EEEE, d 'de' MMMM" : 'MMMM', { locale: ptBR })}
              </span>
              <span onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)} style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {format(currentDate, 'yyyy')} <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_drop_down</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={requestNotificationPermission} className="icon-btn boing-effect" title="Ativar Notificações">
                <span className="material-symbols-rounded">notifications</span>
              </button>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="icon-btn boing-effect">
                <span className="material-symbols-rounded">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
              </button>
              {(hasRole('ADMIN') || hasRole('SECRETARIA')) && (
                <button onClick={() => setIsUserManagementModalOpen(true)} className="icon-btn boing-effect" title="Gerir Utilizadores">
                  <span className="material-symbols-rounded">group</span>
                </button>
              )}
            </div>

            {appMode !== 'tasks' && view === 'day' && (
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-color)' }}>
                <button onClick={() => setDayViewMode('timeline')} className="boing-effect" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'timeline' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'timeline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Linhas</button>
                <button onClick={() => setDayViewMode('cards')} className="boing-effect" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '18px', border: 'none', background: dayViewMode === 'cards' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'cards' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Cartões</button>
              </div>
            )}

            {isYearSelectorOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', zIndex: 2000, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', width: '280px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Array.from({ length: 16 }, (_, i) => {
                  const year = currentDate.getFullYear() - 7 + i;
                  return <button key={year} onClick={() => { setCurrentDate(new Date(year, currentDate.getMonth(), 1)); setIsYearSelectorOpen(false); }} className="nav-pill boing-effect" style={{ padding: '10px 0', borderRadius: '8px', border: 'none', backgroundColor: year === currentDate.getFullYear() ? 'var(--text-accent)' : 'transparent', color: year === currentDate.getFullYear() ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}>{year}</button>;
                })}
              </div>
            )}
          </div>
        </header>

        <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'visible', justifyContent: 'center' }}>
          {/* BARRA LATERAL ESQUERDA DE PARTICIPANTES (HOVER EXPANDE) */}
          {isDevWorkspaceActive && appMode !== 'visitas' && (
            <aside className={`left-avatar-sidebar desktop-only ${isDraggingMember ? 'dragging-active' : ''}`}>
              <div className="sidebar-collapsed-indicator">
                <span className="material-symbols-rounded" style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>groups</span>
              </div>
              <Droppable droppableId="sidebar-members" isDropDisabled={true}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="sidebar-expanded-content"
                  >
                    {devWorkspaceMembers.map((member, idx) => (
                      <Draggable
                        key={member.cr4a1_username}
                        draggableId={`member_${member.cr4a1_username}`}
                        index={idx}
                      >
                        {(provided, snapshot) => (
                          <React.Fragment>
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="boing-effect"
                              style={{
                                ...provided.draggableProps.style,
                                cursor: 'grab',
                                userSelect: 'none',
                                // Em vez de display: none, usamos opacity 0 para não quebrar a biblioteca
                                opacity: snapshot.isDragging ? 0 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                pointerEvents: snapshot.isDragging ? 'none' : 'auto',
                              }}
                              title={member.cr4a1_nome_exibicao || member.cr4a1_username}
                            >
                              {member.cr4a1_foto ? (
                                <img
                                  src={member.cr4a1_foto}
                                  alt={member.cr4a1_username}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--text-accent)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: member.cr4a1_cor || 'var(--text-accent)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    border: '2px solid var(--text-accent)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {member.cr4a1_username?.[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            {snapshot.isDragging && ReactDOM.createPortal(
                              <div
                                style={{
                                  ...provided.draggableProps.style,
                                  cursor: 'grabbing',
                                  userSelect: 'none',
                                  opacity: 0.8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '40px',
                                  height: '40px',
                                  zIndex: 99999,
                                  transition: 'none',
                                  pointerEvents: 'none', // Evita que o clone capture o mouse
                                  borderRadius: '50%',
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                                }}
                              >
                                {member.cr4a1_foto ? (
                                  <img
                                    src={member.cr4a1_foto}
                                    alt={member.cr4a1_username}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--text-accent)' }}
                                  />
                                ) : (
                                  <div
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: member.cr4a1_cor || 'var(--text-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '700', border: '2px solid var(--text-accent)' }}
                                  >
                                    {member.cr4a1_username?.[0]?.toUpperCase()}
                                  </div>
                                )}
                              </div>,
                              document.body
                            )}
                          </React.Fragment>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </aside>
          )}

          <main className="main-container" style={{ 
            flex: 1, 
            padding: appMode === 'tasks' ? '24px' : (['day', '3days', 'week'].includes(view) ? '0' : '24px'), 
            paddingBottom: '80px', 
            overflow: 'visible', 
            marginLeft: (isDevWorkspaceActive && appMode !== 'visitas') ? '24px' : '0',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>

            <div key={appMode} className="view-enter" style={{ width: '100%', height: '100%' }}>
              {appMode === 'tasks' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
                  <header style={{ marginBottom: '10px' }}>
                    <h2 style={{ color: 'var(--text-title)', fontSize: '26px', fontWeight: '800' }}>Desenvolvimento e Inovação</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Gestão de sprints e pedidos técnicos</p>
                  </header>

                  {taskEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>inventory_2</span>
                      <p>Nenhuma tarefa pendente neste workspace.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      {taskEvents.map(task => {
                        const subtasks = task.cr4a1_subtasks ? (typeof task.cr4a1_subtasks === 'string' ? JSON.parse(task.cr4a1_subtasks) : task.cr4a1_subtasks) : [];
                        const completedCount = subtasks.filter(s => s.completed).length;
                        const totalSubtasks = subtasks.length;
                        const percentage = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

                        const now = new Date();
                        now.setHours(0, 0, 0, 0);

                        const deadlineDateStr = task.cr4a1_data_fim || task.cr4a1_data_inicio;
                        const deadline = new Date(deadlineDateStr);
                        deadline.setHours(0, 0, 0, 0);

                        const isDelayed = now > deadline && percentage < 100;

                        return (
                          <div
                            key={task.cr4a1_agenda_kairosid}
                            style={{
                              background: 'var(--bg-primary)', padding: '24px', borderRadius: '24px',
                              border: `1px solid ${isDelayed ? '#ff4d4d44' : 'var(--border-color)'}`,
                              boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                                    background: isDelayed ? '#fee2e2' : (percentage === 100 ? '#dcfce7' : '#e0f2fe'),
                                    color: isDelayed ? '#ef4444' : (percentage === 100 ? '#22c55e' : '#0ea5e9')
                                  }}>
                                    {isDelayed ? 'ATRASADO' : (percentage === 100 ? 'CONCLUÍDO' : 'EM DIA')}
                                  </span>
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Prazo: {format(deadline, "dd 'de' MMM", { locale: ptBR })}
                                  </span>
                                </div>
                                <h3 style={{ fontSize: '20px', margin: 0, color: 'var(--text-title)' }}>{task.cr4a1_titulo}</h3>
                              </div>

                              <div style={{ position: 'relative', width: '54px', height: '54px', flexShrink: 0 }}>
                                <svg width="54" height="54" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="var(--text-accent)" strokeWidth="3"
                                    strokeDasharray={`${percentage}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                                  <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--text-primary)">{percentage}%</text>
                                </svg>
                              </div>
                            </div>

                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                              {task.cr4a1_descricao || task.cr4a1_detalhes || 'Sem descrição adicional.'}
                            </p>

                            {totalSubtasks > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                {subtasks.map((s, i) => (
                                  <div
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); handleToggleSubtask(task, i); }}
                                    className="boing-effect"
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', opacity: s.completed ? 0.5 : 1 }}
                                  >
                                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: s.completed ? 'var(--text-accent)' : 'var(--text-secondary)' }}>
                                      {s.completed ? 'check_circle' : 'radio_button_unchecked'}
                                    </span>
                                    <span style={{ textDecoration: s.completed ? 'line-through' : 'none', color: 'var(--text-primary)' }}>{s.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button onClick={() => handleEditClick(task)} className="btn-secondary boing-effect" style={{ width: '100%', borderRadius: '14px', padding: '12px', fontWeight: '600' }}>
                              Ver Detalhes Completos
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {view === 'year' && (
                    <div
                      className={`mini-month-grid ${appMode === 'visitas' ? 'visitas' : ''}`}
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthDate = new Date(currentDate.getFullYear(), i, 1);
                        const activeWSForGradient = workspaces.filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid));
                        return (
                          <div key={i} className="mini-month-container" style={{
                            ...(appMode !== 'visitas' && activeWSForGradient.length > 1 ? { background: `linear-gradient(135deg, ${activeWSForGradient.map(w => w.cr4a1_cor_hex || '#3498db').join(', ')})`, padding: '1.5px', borderRadius: '16px' } : {}),
                            overflow: 'visible',
                            minHeight: appMode === 'visitas' ? '600px' : 'auto',
                            height: appMode === 'visitas' ? '100%' : 'auto',
                          }}>
                            <div style={{
                              ...(appMode !== 'visitas' && activeWSForGradient.length <= 1 ? wsBorderStyle : { border: 'none' }),
                              borderRadius: '14px',
                              background: 'var(--bg-primary)',
                              height: '100%',
                              overflow: 'visible',
                              position: 'relative'
                            }}>
                              <MiniMonth
                                monthDate={monthDate}
                                getEventsForDay={handleGetEventsForDay}
                                holidays={holidays}
                                allUsers={allUsers}
                                onEditEvent={handleEditClick}
                                isDetailed={appMode === 'visitas'}

                                onDayClick={(dateStr) => {
                                  const [year, month, day] = dateStr.split('-');
                                  const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                                  if (appMode === 'visitas') {
                                    const eventosDoDia = handleGetEventsForDay(targetDate);
                                    const visitasDoDia = eventosDoDia.filter(e => e.isVisitaPrincipal);

                                    if (visitasDoDia.length > 0) {
                                      handleDayClick(dateStr, visitasDoDia);
                                      return;
                                    }
                                  }

                                  setCurrentDate(targetDate);
                                  setView('month');
                                }}

                                onSelectMonth={(d) => {
                                  setCurrentDate(d);
                                  setView('month');
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {view === 'month' && (
                    <div className="responsive-grid-container" style={{ overflow: 'visible', opacity: 1 }}>
                      <div style={{
                        ...(appMode !== 'visitas' && activeWorkspaces.length > 1 ? { background: `linear-gradient(135deg, ${workspaces.filter(w => activeWorkspaces.includes(w.cr4a1_calendarios_workspacesid)).map(w => w.cr4a1_cor_hex || '#3498db').join(', ')})`, padding: '1.5px', borderRadius: '24px' } : {}),
                        overflow: 'visible',
                        opacity: 1
                      }}>
                        <div
                          className="calendar-month-grid"
                          style={{
                            ...(appMode !== 'visitas' && activeWorkspaces.length <= 1 ? wsBorderStyle : { border: 'none' }),
                            background: 'var(--bg-primary)',
                            borderRadius: '22px',
                            overflow: 'visible',
                            opacity: 1,
                            gridTemplateRows: appMode === 'visitas' ? 'repeat(auto-fill, minmax(120px, 1fr))' : undefined,
                          }}
                        >
                          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <b key={i} style={{ textAlign: 'center', color: (i === 0 || i === 6) ? '#e74c3c' : 'var(--text-secondary)', fontWeight: '600', padding: '10px 0', fontSize: '12px' }}>{d}</b>)}
                          {generateMonthDays(currentDate).map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                            const dayEvents = handleGetEventsForDay(day);
                            return (
                              <DroppableDay
                                key={day.toString()}
                                dateStr={dateStr}
                                isToday={isToday}
                                onClick={() => {
                                  if (appMode === 'visitas') {
                                    const visitasDoDia = dayEvents.filter(e => e.isVisitaPrincipal);
                                    if (visitasDoDia.length > 0) {
                                      handleDayClick(dateStr, visitasDoDia);
                                    }
                                  } else {
                                    setCurrentDate(day);
                                    setView('day');
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  if (dayEvents.length > 0 && appMode !== 'visitas') {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    handleDayMouseEnter(dateStr, dayEvents, rect);
                                  }
                                }}
                                onMouseLeave={handleDayMouseLeave}
                              >
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isToday ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'transparent', color: isToday ? 'white' : 'var(--text-primary)', fontWeight: isToday ? '700' : '500', fontSize: '12px', marginBottom: '4px', flexShrink: 0 }}>{format(day, 'd')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'hidden', padding: '0 2px', minWidth: 0, width: '100%' }}>
                                  {dayEvents.filter(e => !e.isIntervalo).map((e, idx) => {
                                    const eventColor = e.cr4a1_cor || getEventColor(e);
                                    let badgeStyle = {
                                      borderRadius: '4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      width: '100%', boxSizing: 'border-box', fontSize: '11px', fontWeight: '600', padding: '2px 4px',
                                      color: '#fff', background: eventColor, opacity: 1, border: '1px solid rgba(255,255,255,0.2)',
                                    };
                                    if (appMode === 'visitas' && e.isVisitaPrincipal) {
                                      badgeStyle.fontWeight = 'bold';
                                      badgeStyle.padding = '3px 5px';
                                    } else if (appMode !== 'visitas') {
                                      badgeStyle.opacity = e.cr4a1_privado ? 0.7 : 1;
                                    }
                                    return (
                                      <DraggableEvent key={e.cr4a1_agenda_kairosid} event={e} index={idx}>
                                        <div
                                          className="event-badge boing-effect"
                                          onClick={(ev) => { ev.stopPropagation(); handleEditClick(e); }}
                                          style={badgeStyle}
                                        >
                                          {!e.cr4a1_dia_inteiro && <span style={{ fontWeight: '700', marginRight: '3px' }}>{e.cr4a1_hora_inicio}</span>}
                                          {e.cr4a1_privado ? '🔒 ' : ''}{e.cr4a1_titulo}
                                        </div>
                                      </DraggableEvent>
                                    );
                                  })}
                                </div>
                              </DroppableDay>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {view === 'list' && <ListView events={getDisplayEvents()} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleEditClick} onDelete={(e) => { setEventToDelete(e); setIsDeleteModalOpen(true); }} workspaces={appMode === 'visitas' ? [] : workspaces} viewMode={listViewMode} onViewModeChange={setListViewMode} />}

                  {['day', '3days', 'week'].includes(view) && (
                    <DayView selectedDate={currentDate} viewType={view} getEventsForDay={handleGetEventsForDay} holidays={holidays} allUsers={allUsers} onEdit={handleEditClick} dayViewMode={dayViewMode} />
                  )}
                </>
              )}
            </div>
          </main>

          {/* BARRA POWERAPPS LATERAL DIREITA FIXA (DESKTOP) */}
          <aside className="powerapps-sidebar desktop-only">
            <div className="sidebar-collapsed-indicator">
              <span className="powerapps-title">PowerApps</span>
            </div>
            <div className="sidebar-expanded-content">
              {/* Cole o link dentro do href="" abaixo */}
              <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/9c6e8435-69c1-457f-94d0-f90579d82fab?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=0330f7bd-de70-4545-b029-61b7052c847e&sourcetime=1781612868074&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" title="Avante">
                <img src={avanteImg} alt="Avante" className="powerapp-icon" />
              </a>
              <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/b8c3032e-74e3-4c5d-9290-38cd53936644?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=a95eae44-d827-4365-b370-399d11f57484&sourcetime=1781641491290&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" title="Echoe">
                <img src={echoeImg} alt="Echoe" className="powerapp-icon" />
              </a>
              <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/501635ac-110f-415e-a9ec-ed6c70af9a54?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=7b9d36b0-aff6-477b-bf3c-49be3ed5b1db&sourcetime=1781632369050&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" title="Hub">
                <img src={hubImg} alt="Hub" className="powerapp-icon" />
              </a>
              <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/8571c626-fa75-4049-8b65-64d965ee8293?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=59adb198-18c2-4d83-8d5a-4bc8f219ee9a&sourcetime=1781693282907&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" title="Medro">
                <img src={medroImg} alt="Medro" className="powerapp-icon" />
              </a>
            </div>
          </aside>

          {/* BARRA LATERAL DIREITA FIXA (DESKTOP) */}
          <aside className="right-menu-sidebar desktop-only">
            <div className="sidebar-expanded-content">
              <button onClick={() => setAppMode('calendar')} className={`boing-effect ${appMode === 'calendar' ? 'active' : ''}`} title="Agenda" style={{
                width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: appMode === 'calendar' ? 'var(--bg-tertiary)' : 'transparent', color: appMode === 'calendar' ? 'var(--text-accent)' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>calendar_month</span>
              </button>

              {(hasRole('DIRETORIA') || hasRole('ADMIN') || hasRole('COORD') || hasRole('SECRETARIA') || hasRole('RH')) && (
                <button onClick={() => setAppMode('tasks')} className={`boing-effect ${appMode === 'tasks' ? 'active' : ''}`} title="Tarefas" style={{
                  width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: appMode === 'tasks' ? 'var(--bg-tertiary)' : 'transparent', color: appMode === 'tasks' ? 'var(--text-accent)' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>assignment</span>
                </button>
              )}

              {(hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN')) && (
                <button onClick={() => setAppMode('visitas')} className={`boing-effect ${appMode === 'visitas' ? 'active' : ''}`} title="Visitas Comerciais" style={{
                  width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: appMode === 'visitas' ? '#fff3e0' : 'transparent', color: appMode === 'visitas' ? '#f57c00' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>location_on</span>
                </button>
              )}
            </div>
          </aside>
        </div>

        {/* MODAIS E COMPONENTES FIXOS */}
        <div style={{ position: 'relative', zIndex: 9999 }}>
          {isFilialTemporariaOpen && (
            <FilialTemporariaModal
              isOpen={isFilialTemporariaOpen}
              onClose={() => setIsFilialTemporariaOpen(false)}
              allUsers={allUsers}
              onSave={atualizarFilialTemporaria}
              mostrarTodos={hasRole('ADMIN') || hasRole('RH')}
            />
          )}
          {isModalOpen && (
            <EventModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setPreselectedTargetUser('');
                setPreselectedWorkspaceId('');
              }}
              onSave={handleSaveEvent}
              initialDate={currentDate.toISOString()}
              editingEvent={editingEvent}
              userRole={userRole}
              allUsers={allUsers}
              eventTypes={eventTypes}
              viewedUser={viewedUser}
              workspaces={workspaces}
              preselectedTargetUser={preselectedTargetUser}
              preselectedWorkspaceId={preselectedWorkspaceId}
            />
          )}
          {isVisitaModalOpen && <VisitaModal isOpen={isVisitaModalOpen} onClose={() => { setIsVisitaModalOpen(false); setEditingVisita(null); }} onSave={handleSaveVisitaData} currentUser={currentUser} organizacoes={organizacoes} allUsers={allUsers} hasRole={hasRole} editingVisita={editingVisita} holidays={holidays} />}
          {isUserManagementModalOpen && <UserManagementModal isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)} allUsers={allUsers} updateUserColor={updateUserColor} eventTypes={eventTypes} addEventType={addEventType} deleteEventType={deleteEventType} />}
          {isDeleteModalOpen && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} eventTitle={eventToDelete?.cr4a1_titulo} />}
          {isWorkspaceModalOpen && (
            <WorkspaceModal
              isOpen={isWorkspaceModalOpen}
              onClose={() => { setIsWorkspaceModalOpen(false); setEditingWorkspace(null); }}
              onSave={editingWorkspace ? (data) => updateWorkspace(editingWorkspace.cr4a1_calendarios_workspacesid, data) : addWorkspace}
              allUsers={allUsers}
              userRole={userRole}
              editingWorkspace={editingWorkspace}
            />
          )}
          {isProfileModalOpen && (
            <div className="modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="modal-content profile-modal" style={{ maxWidth: '450px', width: '100%', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', padding: '28px', borderRadius: '32px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-title)' }}>O Meu Perfil</h2>
                  <button onClick={() => setIsProfileModalOpen(false)} className="icon-btn boing-effect">✕</button>
                </div>
                {currentUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      {currentUser.cr4a1_foto ? (
                        <img src={currentUser.cr4a1_foto} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--text-accent)' }} />
                      ) : (
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--text-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', margin: '0 auto' }}>
                          {user?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <br />
                      <button onClick={() => document.getElementById('p-up').click()} className="btn-secondary boing-effect" style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px' }}>Mudar Foto</button>
                      <input
                        type="file"
                        id="p-up"
                        hidden
                        accept="image/*"
                        onChange={(e) => compressImage(e.target.files[0], (res) => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                          nomeExibicao: document.getElementById('n-up')?.value || currentUser.cr4a1_nome_exibicao,
                          aniversario: document.getElementById('b-up')?.value || currentUser.cr4a1_aniversario,
                          foto: res
                        }))}
                      />
                    </div>

                    <div className="input-group">
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Nome de Exibição</label>
                      <input
                        type="text"
                        defaultValue={currentUser.cr4a1_nome_exibicao || user}
                        id="n-up"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>

                    <div className="input-group">
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Aniversário</label>
                      <input
                        type="date"
                        defaultValue={currentUser.cr4a1_aniversario ? currentUser.cr4a1_aniversario.split('T')[0] : ''}
                        id="b-up"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>

                    <button
                      onClick={() => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                        nomeExibicao: document.getElementById('n-up').value,
                        aniversario: document.getElementById('b-up').value,
                        foto: currentUser.cr4a1_foto
                      })}
                      className="btn-primary boing-effect"
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '600', marginTop: '4px' }}
                    >
                      Salvar Dados do Perfil
                    </button>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

                    <WhatsAppInput userId={currentUser.cr4a1_usuarios_agendaid} initialValue={currentUser.cr4a1_whatsapp} onSave={updateWhatsApp} />
                  </div>
                )}
              </div>
            </div>
          )}

          {dayVisitasModalOpen && (
            <DayVisitasModal
              isOpen={dayVisitasModalOpen}
              onClose={() => setDayVisitasModalOpen(false)}
              visitas={selectedDayVisitas}
              allUsers={allUsers}
              onEditVisita={(v) => {
                if (v.originalData) {
                  setEditingVisita(v.originalData);
                  setIsVisitaModalOpen(true);
                } else {
                  handleEditClick(v);
                }
              }}
            />
          )}

          {/* Renderiza o tooltip da visão mensal */}
          {dayTooltip && (
            <DayTooltip
              dayData={dayTooltip}
              allUsers={allUsers}
              onEditEvent={handleEditClick}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            />
          )}
        </div>

        {/* FAB */}
        {(hasRole('ADMIN') || hasRole('SECRETARIA') || hasRole('DIRETORIA') || hasRole('COORD') || hasRole('COMUM') || hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('RH')) && (
          <div style={{ position: 'fixed', bottom: appMode === 'tasks' ? '80px' : '24px', right: '24px', zIndex: 500 }}>
            {isFabMenuOpen && (
              <div style={{ position: 'absolute', bottom: '80px', right: '0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', minWidth: '180px' }}>

                {appMode !== 'visitas' && (
                  <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Evento</span>
                    <button onClick={() => { setEditingEvent(null); setIsModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <span className="material-symbols-rounded">calendar_add_on</span>
                    </button>
                  </div>
                )}

                {(hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN')) && (
                  <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Visita</span>
                    <button onClick={() => { setEditingVisita(null); setIsVisitaModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: '#f57c00', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <span className="material-symbols-rounded">location_on</span>
                    </button>
                  </div>
                )}

                {(hasRole('ADMIN') || hasRole('RH')) && appMode !== 'visitas' && (
                  <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Workspace</span>
                    <button onClick={() => { setEditingWorkspace(null); setIsWorkspaceModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <span className="material-symbols-rounded">workspaces</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className="fab-btn boing-effect" onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} style={{ width: '60px', height: '60px', borderRadius: '20px', background: isFabMenuOpen ? 'var(--bg-secondary)' : (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)'), color: isFabMenuOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '32px', transform: isFabMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>{isFabMenuOpen ? 'close' : 'add'}</span>
            </button>
          </div>
        )}

        {/* POWERAPPS FAB (MOBILE ONLY) */}
        <div className="mobile-only" style={{ position: 'fixed', bottom: '32px', left: '32px', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
          {isPowerAppsFabOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', marginBottom: '8px', marginLeft: '6px' }}>
              <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px', animationDelay: '0s' }}>
                <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/8571c626-fa75-4049-8b65-64d965ee8293?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=59adb198-18c2-4d83-8d5a-4bc8f219ee9a&sourcetime=1781693282907&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" className="boing-effect" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                  <img src={medroImg} alt="Medro" className="powerapp-icon" style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', borderRadius: '16px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </a>
                <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Medro</span>
              </div>
              <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px', animationDelay: '0.05s' }}>
                <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/501635ac-110f-415e-a9ec-ed6c70af9a54?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=7b9d36b0-aff6-477b-bf3c-49be3ed5b1db&sourcetime=1781632369050&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" className="boing-effect" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                  <img src={hubImg} alt="Hub" className="powerapp-icon" style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', borderRadius: '16px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </a>
                <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Hub</span>
              </div>
              <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px', animationDelay: '0.1s' }}>
                <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/b8c3032e-74e3-4c5d-9290-38cd53936644?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=a95eae44-d827-4365-b370-399d11f57484&sourcetime=1781641491290&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" className="boing-effect" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                  <img src={echoeImg} alt="Echoe" className="powerapp-icon" style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', borderRadius: '16px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </a>
                <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Echoe</span>
              </div>
              <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px', animationDelay: '0.15s' }}>
                <a href="https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/9c6e8435-69c1-457f-94d0-f90579d82fab?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=0330f7bd-de70-4545-b029-61b7052c847e&sourcetime=1781612868074&source=portal&hidenavbar=true" target="_blank" rel="noopener noreferrer" className="boing-effect" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                  <img src={avanteImg} alt="Avante" className="powerapp-icon" style={{ width: '48px', height: '48px', background: 'var(--bg-primary)', borderRadius: '16px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </a>
                <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Avante</span>
              </div>
            </div>
          )}
          <button className="fab-btn boing-effect" onClick={() => setIsPowerAppsFabOpen(!isPowerAppsFabOpen)} style={{ width: '60px', height: '60px', borderRadius: '20px', background: isPowerAppsFabOpen ? 'var(--bg-secondary)' : 'var(--text-accent)', color: isPowerAppsFabOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '32px', transform: isPowerAppsFabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>{isPowerAppsFabOpen ? 'close' : 'apps'}</span>
          </button>
        </div>
      </div>

      {/* BLOCO DE ESTILOS CSS INJETADO */}
      <style>{`
        @keyframes viewSlideIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .view-enter { animation: viewSlideIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        
        .dropdown-item-select:hover {
            background-color: var(--bg-secondary) !important;
        }

        @media (max-width: 1024px) { .desktop-only { display: none !important; } .mobile-only { display: flex !important; } }
        @media (min-width: 1025px) { .mobile-only { display: none !important; } .desktop-only { display: flex !important; } }
        
        .boing-effect {
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .boing-effect:active {
            transform: scale(0.85) !important;
            transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .app-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 16px;
            padding: 16px 24px;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 2000;
            transition: padding 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), gap 0.4s;
        }
        
        .app-header.scrolled {
            padding: 10px 24px;
            gap: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.06);
            background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.98);
            backdrop-filter: blur(12px);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            order: 1;
            flex-wrap: nowrap;
        }

        .header-profile {
            display: flex;
            align-items: center;
            gap: 8px;
            order: 2;
            margin-left: auto;
            transition: all 0.4s ease;
        }

        .header-bottom {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            order: 3;
            flex-basis: 100%; 
            flex-wrap: wrap;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .app-header.scrolled .header-bottom {
            order: 2; 
            flex-basis: auto; 
            margin-left: 16px;
            margin-right: auto;
            justify-content: flex-start;
        }
        .app-header.scrolled .header-profile {
            order: 3;
            margin-left: 0;
        }

        .nav-label-collapse {
            display: inline-block;
            transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease;
            max-width: 150px;
            opacity: 1;
            overflow: hidden;
            white-space: nowrap;
        }
        
        .app-header.scrolled .nav-label-collapse {
            max-width: 0px;
            opacity: 0;
            margin: 0;
            padding: 0;
        }

        /* Centraliza e limita a largura do conteúdo principal */
        .main-container {
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            padding-left: 24px;
            padding-right: 24px;
            box-sizing: border-box;
        }

        /* Barra lateral direita – fixa, mas sem empurrar o conteúdo */
        .right-menu-sidebar {
            position: fixed;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            width: 56px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 28px 0 0 28px;
            display: flex;
            flexDirection: column;
            align-items: center;
            padding: 16px 0;
            gap: 16px;
            box-shadow: -4px 0 24px rgba(0,0,0,0.06);
            z-index: 1000;
        }

        /* Garantir que a grade anual ocupe bem o espaço */
        .mini-month-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            width: 100%;
            box-sizing: border-box;
        }

        /* Quando no modo visitas, dois cartões grandes */
        .mini-month-grid.visitas {
            grid-template-columns: repeat(2, 1fr);
        }

        /* Ajusta margem do main por causa da sidebar fixa */
        @media (min-width: 1025px) {
            .main-container {
                margin-right: 80px; /* espaço para a barra lateral direita */
            }
        }

        /* COMPORTAMENTO MOBILE OTIMIZADO */
        @media (max-width: 900px) {
            .app-header {
                display: flex !important;
                flex-direction: column !important;
                padding: 12px 16px !important;
                gap: 12px !important;
                background: var(--bg-primary) !important;
                border-bottom: 1px solid var(--border-color) !important;
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02) !important;
                backdrop-filter: blur(12px) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                position: sticky !important;
                top: 0 !important;
            }
            .app-header.scrolled {
                padding: 8px 12px !important;
                gap: 8px !important;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06) !important;
            }
            [data-theme='dark'] .app-header {
                background: rgba(30, 30, 30, 0.8) !important;
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15) !important;
            }

            .mini-month-grid {
                grid-template-columns: 1fr !important;
            }

            .header-profile {
                order: 0 !important;
                width: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 8px !important;
                position: static !important;   
                margin: 0 0 4px 0 !important;  
            }
            .header-profile .profile-name {
                display: none !important;
            }
            .header-profile > div {
                padding: 2px !important;
                border-radius: 50% !important;
                background: var(--bg-secondary) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border: 1px solid var(--border-color) !important;
                height: 36px !important;
                width: 36px !important;
                box-sizing: border-box !important;
                cursor: pointer !important;
            }
            .header-profile > div img {
                width: 30px !important;
                height: 30px !important;
            }
            .header-profile .icon-btn {
                height: 36px !important;
                width: 36px !important;
            }

            .filial-temp-btn {
                position: absolute !important;
                top: 12px !important;
                right: 120px !important;
                z-index: 15 !important;
                white-space: nowrap !important;
                padding: 8px 12px !important;
                font-size: 13px !important;
            }
            .filial-temp-btn .filial-temp-icon,
            .filial-temp-btn .filial-temp-text {
                display: none !important;
            }
            .filial-temp-btn::before {
                content: "🔄";
                font-size: 18px;
            }

            .header-left {
                order: 1 !important;
                display: flex !important;
                flex-wrap: nowrap !important;
                align-items: center !important;
                width: 100% !important;
                gap: 8px !important;
                justify-content: flex-start !important;
            }

            .header-left > button:first-of-type {
                order: 1 !important;
                flex: 0 0 auto !important;
            }

            .header-left .logo {
                order: 2 !important;
                gap: 4px !important;
                flex: 0 0 auto !important;
            }
            .header-left .logo .nav-label-collapse {
                display: none !important;
            }

            .segmented-views {
                order: 3 !important;
                flex: 1 1 0% !important;
                min-width: 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                background: var(--bg-secondary) !important;
                border-radius: 16px !important;
                padding: 4px !important;
                border: 1px solid var(--border-color) !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }
            .segmented-views button {
                flex: 1 1 0% !important;
                min-width: 0 !important;
                justify-content: center !important;
                padding: 6px 2px !important;
                height: 30px !important;
                border-radius: 12px !important;
                font-size: 11px !important;
                border: none !important;
                background: transparent !important;
                color: var(--text-secondary) !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            .segmented-views button.active {
                background: var(--text-accent) !important;
                color: white !important;
                font-weight: 700 !important;
                box-shadow: 0 2px 8px rgba(var(--text-accent-rgb), 0.25) !important;
            }
            .segmented-views .nav-label-collapse {
                display: none !important;
            }

            .header-left > button:last-of-type {
                order: 4 !important;
                flex: 0 0 auto !important;
                height: 38px !important;
                width: 38px !important;
                padding: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 12px !important;
                border: 1px solid var(--border-color) !important;
                background: var(--bg-secondary) !important;
                color: var(--text-primary) !important;
                margin-left: 8px !important;
                box-sizing: border-box !important;
            }
            .header-left > button:last-of-type.active {
                border-color: var(--text-accent) !important;
                background: var(--bg-tertiary) !important;
                color: var(--text-accent) !important;
                box-shadow: 0 2px 8px rgba(var(--text-accent-rgb), 0.15) !important;
            }
            .header-left > button:last-of-type .nav-label-collapse {
                display: none !important;
            }

            .header-bottom {
                order: 2 !important;
                display: grid !important;
                grid-template-columns: 1fr auto !important;
                grid-template-rows: auto auto !important;
                gap: 10px 8px !important;
                align-items: center !important;
                width: 100% !important;
                margin-top: 4px !important;
                position: relative !important;
                flex-basis: auto !important;
            }
            .app-header.scrolled .header-bottom {
                order: 2 !important;
                flex-basis: auto !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }

            .header-bottom > div:nth-child(2) {
                grid-row: 1 !important;
                grid-column: 1 !important;
                justify-self: start !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .header-bottom > div:nth-child(2) span {
                font-size: 16px !important;
                font-weight: 700 !important;
                color: var(--text-title) !important;
                text-transform: capitalize !important;
            }
            .header-bottom > div:nth-child(2) span:first-of-type {
                max-width: 120px !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }

            .header-bottom > div:nth-child(1) {
                grid-row: 1 !important;
                grid-column: 2 !important;
                justify-self: end !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .header-bottom > div:nth-child(1) .icon-btn {
                height: 36px !important;
                width: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: var(--bg-secondary) !important;
                border: 1px solid var(--border-color) !important;
            }
            .header-bottom > div:nth-child(1) .nav-pill {
                height: 36px !important;
                padding: 0 12px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                background: var(--bg-secondary) !important;
                color: var(--text-primary) !important;
                border: 1px solid var(--border-color) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .header-bottom > div:nth-child(3) {
                grid-row: 2 !important;
                grid-column: 1 / span 2 !important;
                justify-self: end !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            .header-bottom > div:nth-child(3) .icon-btn {
                height: 36px !important;
                width: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: var(--bg-secondary) !important;
                border: 1px solid var(--border-color) !important;
            }

            .header-bottom > div:nth-child(4) {
                grid-row: 2 !important;
                grid-column: 1 !important;
                justify-self: start !important;
            }

            .header-bottom:has(> div:nth-child(4)) > div:nth-child(3) {
                grid-column: 2 !important;
            }
        }

        .calendar-day-card.drop-over {
            background-color: var(--bg-tertiary) !important;
            box-shadow: inset 0 0 0 2px var(--text-accent);
            transition: background-color 0.15s, box-shadow 0.15s;
        }

        @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }

        @keyframes fadeInDown {
            from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateX(-50%) translateY(8px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @media (max-width: 900px) {
            .mini-month-grid {
                grid-template-columns: 1fr !important;
            }
        }
      `}</style>
    </DragDropContext>
  );
}

export default App;