import { notificarEventoProximo, notificarCompartilhamento, notificarMencoes } from './utils/alertas';
import { NotificationBell } from './components/NotificationBell';
import { matchesSearch } from './utils/search';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { BI_CONFIG } from './config/biConfig';
import { Toaster, toast } from 'react-hot-toast';
import { useCalendar } from './hooks/useCalendar';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { AgendaView } from './components/AgendaView';
import { CommandPalette } from './components/CommandPalette';
import { GoogleEventImportModal } from './components/GoogleEventImportModal';
import { KairosIcon } from './components/KairosIcon';
import { MiniMonth } from './components/MiniMonth';
import { EventModal } from './components/EventModal';
import { ListView } from './components/ListView';
import { UserManagementModal } from './components/UserManagementModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { generateMonthDays } from './utils/dateHelpers';
import { WorkspaceModal } from './components/WorkspaceModal';
import { EventDetailModal } from './components/EventDetailModal';
import { BirthdayCelebration } from './components/BirthdayCelebration';
import { WhatsAppInput } from './components/WhatsAppInput';
import { DraggableEvent, DroppableDay } from './components/DragDropHelpers';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { VisitaModal } from './components/VisitaModal';
import { WatchPairingModal } from './components/WatchPairingModal';
import { FilialTemporariaModal } from './components/FilialTemporariaModal';
import { DayVisitasModal } from './components/DayVisitasModal';
import { DayTooltip } from './components/DayTooltip';
import { themeColors } from './constants/materialColors';
import { registerPushSubscription } from './utils/push';
import { avisarFichasDoResponsavel } from './utils/fichas';
import { DateField } from './components/ui/date-field';
import { compressImage } from './utils/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Checkbox } from './components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';

const DashboardPanel = React.lazy(() => import('./components/DashboardPanel').then(m => ({ default: m.DashboardPanel })));
const NotesPanel = React.lazy(() => import('./components/NotesPanel').then(m => ({ default: m.NotesPanel })));
const TrelloPanel = React.lazy(() => import('./components/TrelloPanel').then(m => ({ default: m.TrelloPanel })));
const CotacaoPassagensPanel = React.lazy(() => import('./components/CotacaoPassagensPanel').then(m => ({ default: m.CotacaoPassagensPanel })));
const GuidedTour = React.lazy(() => import('./components/GuidedTour').then(m => ({ default: m.GuidedTour })));
import { dataverseApi } from './api/dataverse';
import {
  format, addMonths, subMonths, addYears, subYears, addDays, subDays, startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { applyDynamicTheme } from './utils/themeGenerator';
import { parseRoles, hasCoordRole } from './utils/permissions';
import { parseAssignees, isAssignedTo } from './utils/assignees';
import { getEventTypeLayer, typeLayerBorderStyle, typeLayerPatternStyle } from './utils/eventTypeLayer';

import avanteImg from './assets/avante.png';
import echoeImg from './assets/echoe.png';
import hubImg from './assets/hub.png';
import medroImg from './assets/medro.png';
import mainLogo from './assets/LOGO PNG 8x11 (1).png';

// --- COMPONENTE PRINCIPAL ---

const RailItem = ({ active, onClick, icon, title, activeBg, activeColor }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className="app-rail-item boing-effect"
    style={active ? { background: activeBg, color: activeColor } : undefined}
  >
    <span className="material-symbols-rounded">{icon}</span>
    <span className="app-rail-label">{title}</span>
  </button>
);

const APPS = [
  { href: "https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/9c6e8435-69c1-457f-94d0-f90579d82fab?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=0330f7bd-de70-4545-b029-61b7052c847e&sourcetime=1781612868074&source=portal&hidenavbar=true", title: "Avante", img: avanteImg },
  { href: "https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/b8c3032e-74e3-4c5d-9290-38cd53936644?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=a95eae44-d827-4365-b370-399d11f57484&sourcetime=1781641491290&source=portal&hidenavbar=true", title: "Echoe", img: echoeImg },
  { href: "https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/501635ac-110f-415e-a9ec-ed6c70af9a54?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=7b9d36b0-aff6-477b-bf3c-49be3ed5b1db&sourcetime=1781632369050&source=portal&hidenavbar=true", title: "Hub", img: hubImg },
  { href: "https://apps.powerapps.com/play/e/default-fca950cc-da1f-4b7f-bc99-2a028473cb1a/a/8571c626-fa75-4049-8b65-64d965ee8293?tenantId=fca950cc-da1f-4b7f-bc99-2a028473cb1a&hint=59adb198-18c2-4d83-8d5a-4bc8f219ee9a&sourcetime=1781693282907&source=portal&hidenavbar=true", title: "Medro", img: medroImg }
];

function App() {
  const {
    view, setView, currentDate, setCurrentDate, holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser, allUsers, credenciaisPendentes = [], criarUsuarioDaCredencial, eventTypes, addEventType, updateEventType, deleteEventType, login, logout, loading, isValidatingSession, fetchEvents, updateUserColor, registrarCorRecenteUsuario, filters, setFilters, filteredEvents, moveEvent,
    updateWhatsApp, addWorkspace, updateWorkspace, updateUnit, updateProfile, updateTrelloFundo, updateUserRoles, adicionarUsuarioAoCalendarioComum, addUser, deleteUser,
    workspaces, activeWorkspaces, toggleWorkspaceFilter,
    organizacoes = [], visitas = [], addVisitas, updateVisitas, atualizarFilialTemporaria,
    gerarLinkAgendamento, confirmarVisita, recusarVisita,
    googleEvents = [], fetchGoogleEvents, disconnectGoogleCalendar,
    appRoles = [], availableRoles = [], addAppRole, renameAppRole, deleteAppRole,
    notas = [], addNota, updateNota, deleteNota,
    biPermissoes = [], upsertBiPermission, resetBiPermission,
    isOnline, isSyncing, syncPendingQueue, pendingSyncCount = 0
  } = useCalendar();

  const roles = useMemo(() => parseRoles(userRole), [userRole]);
  const hasRole = (role) => roles.includes('ADMIN') || roles.includes(role);

  const [customDaysCount, setCustomDaysCount] = useState(3);
  const AGENDA_DAYS_WINDOW = 14;

  const viewsConfig = useMemo(() => [
    { id: 'year', label: 'Ano', icon: 'calendar_view_month' },
    { id: 'month', label: 'Mês', icon: 'calendar_month' },
    { id: 'week', label: 'Semana', icon: 'view_week' },
    { id: '3days', label: `${customDaysCount} Dias`, icon: 'view_timeline' },
    { id: 'day', label: 'Dia', icon: 'view_day' }
  ], [customDaysCount]);

  const viewLabels = useMemo(() => ({
    day: 'Dia',
    week: 'Semana',
    month: 'Mês',
    year: 'Ano',
    agenda: 'Programação',
    '3days': `${customDaysCount} dias`,
    list: 'Fichas'
  }), [customDaysCount]);

  // --- NOVOS ESTADOS DE BUSCA NO MENU SANDUÍCHE ---
  const [workspaceSearchTerm, setWorkspaceSearchTerm] = useState('');
  const [userUnitFilter, setUserUnitFilter] = useState('Todas');
  const [isCredenciaisMenuOpen, setIsCredenciaisMenuOpen] = useState(false);
  const [credenciaisSearchTerm, setCredenciaisSearchTerm] = useState('');
  const [creatingCredUsername, setCreatingCredUsername] = useState(null);

  const handleClickCriarCredencial = async (credUser) => {
    if (!credUser || creatingCredUsername) return;
    setCreatingCredUsername(credUser.cr4a1_username);
    try {
      await criarUsuarioDaCredencial(credUser);
    } finally {
      setCreatingCredUsername(null);
    }
  };

  const availableUserUnits = useMemo(() => {
    const unitsSet = new Set(allUsers.map(u => u.cr4a1_unidade).filter(Boolean));
    return ['Todas', ...Array.from(unitsSet)].sort();
  }, [allUsers]);

  const trelloDragEndRef = useRef(null);

  const handleDragStart = (start) => {
    if (start.draggableId.startsWith('member_')) {
      setIsDraggingMember(true);
    }
  };

  const handleDragEnd = async (result) => {
    if (appMode === 'trello') {
      trelloDragEndRef.current?.(result);
      return;
    }

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

      if (devWorkspace) setPreselectedWorkspaceId(devWorkspace.cr4a1_calendarios_workspacesid);
      setPreselectedTargetUser(memberUsername);
      setEditingEvent(null);

      const targetDate = new Date(newDateStr + 'T12:00:00');
      setCurrentDate(targetDate);

      setIsDraggingMember(false);

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

    if (draggedEvent?.isExternal || String(draggableId).startsWith('google_')) {
      toast('Eventos do Google Calendar são somente leitura.', { icon: 'ℹ️' });
      return;
    }

    if (!draggedEvent.isVisitaPrincipal && !draggedEvent.isIntervalo) {
      moveEvent(draggableId, newDateStr);
      return;
    }
  };

  const notifiedRef = useRef(new Set());
  const [appMode, setAppMode] = useState(() => localStorage.getItem('kairos_app_mode') || 'calendar');
  const [fichaIdParaAbrir, setFichaIdParaAbrir] = useState(null);
  const [notaIdParaAbrir, setNotaIdParaAbrir] = useState(null);

  const handleNavegarParaFicha = useCallback((fichaId, wsId) => {
    if (wsId) {
      setActiveWorkspaces([wsId]);
    }
    setFichaIdParaAbrir(fichaId);
    setAppMode('trello');
  }, []);

  const handleNavegarParaNota = useCallback((notaId) => {
    setNotaIdParaAbrir(notaId);
    setAppMode('notas');
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingVisita, setEditingVisita] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [detailSourceRect, setDetailSourceRect] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [preselectedTargetUser, setPreselectedTargetUser] = useState('');
  const [preselectedWorkspaceId, setPreselectedWorkspaceId] = useState('');
  const [isDraggingMember, setIsDraggingMember] = useState(false);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [googleImportEvent, setGoogleImportEvent] = useState(null);
  const [showGoogleEvents, setShowGoogleEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('kairos_show_google_events');
      return saved === null ? true : JSON.parse(saved);
    } catch {
      return true;
    }
  });
  const [showWeekends, setShowWeekends] = useState(() => {
    try {
      const saved = localStorage.getItem('kairos_show_weekends');
      return saved === null ? true : JSON.parse(saved);
    } catch {
      return true;
    }
  });
  const [showDeclinedEvents, setShowDeclinedEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('kairos_show_declined_events');
      return saved === null ? true : JSON.parse(saved);
    } catch {
      return true;
    }
  });
  const [showCompletedTasks, setShowCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('kairos_show_completed_tasks');
      return saved === null ? true : JSON.parse(saved);
    } catch {
      return true;
    }
  });
  const [now, setNow] = useState(new Date());
  const [dayViewMode, setDayViewMode] = useState('timeline');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kairos_accent_color') || '#1a73e8');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [aniversarioEdit, setAniversarioEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [deviceNotificationPermission, setDeviceNotificationPermission] = useState(() => (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default');
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isWorkspacesLoaded, setIsWorkspacesLoaded] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [isFilialTemporariaOpen, setIsFilialTemporariaOpen] = useState(false);

  const [dayVisitasModalOpen, setDayVisitasModalOpen] = useState(false);
  const [selectedDayVisitas, setSelectedDayVisitas] = useState([]);

  // --- ESTADO DO TOOLTIP ---
  const [dayTooltip, setDayTooltip] = useState(null);
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

  // Fecha o tooltip do dia imediatamente ao rolar a tela -- ele usa um retângulo
  // capturado no hover e não acompanha o scroll, então ficava preso na tela.
  useEffect(() => {
    if (!dayTooltip) return;
    const closeOnScroll = () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      setIsTooltipHovered(false);
      setDayTooltip(null);
    };
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [dayTooltip]);

  const handleEditWorkspaceClick = (ws) => {
    setEditingWorkspace(ws);
    setIsWorkspaceModalOpen(true);
  };
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showBirthday, setShowBirthday] = useState(false);

  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState(() => localStorage.getItem('kairos_default_workspace'));

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [listViewMode, setListViewMode] = useState('grid');

  const currentUser = allUsers.find(u => u.cr4a1_username === user);
  useEffect(() => {
    if (isProfileModalOpen) {
      setAniversarioEdit(currentUser?.cr4a1_aniversario ? currentUser.cr4a1_aniversario.split('T')[0] : '');
      setEmailEdit(currentUser?.cr4a1_email || currentUser?.email || '');
    }
  }, [isProfileModalOpen, currentUser]);

  const googleConectadoEm = currentUser?.cr4a1_googleconectadoem || currentUser?.cr4a1_google_conectado_em;

  useEffect(() => {
    if (googleConectadoEm && currentUser?.cr4a1_usuarios_agendaid) {
      fetchGoogleEvents(currentUser.cr4a1_usuarios_agendaid);
    }
  }, [googleConectadoEm, currentUser?.cr4a1_usuarios_agendaid, fetchGoogleEvents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google_calendar');
    const detalhe = params.get('msg');
    if (!status) return;

    const mensagens = {
      conectado: { fn: toast.success, texto: 'Google Calendar conectado!' },
      negado: { fn: toast.error, texto: 'Conexão com o Google cancelada.' },
      invalido: { fn: toast.error, texto: 'Link de conexão inválido ou expirado.' },
      sem_refresh_token: { fn: toast.error, texto: 'Não recebemos permissão de acesso contínuo. Tente novamente.' },
      erro: { fn: toast.error, texto: detalhe ? `Erro ao conectar: ${detalhe}` : 'Erro ao conectar com o Google Calendar.' },
    };
    const msg = mensagens[status];
    if (msg) msg.fn(msg.texto);

    params.delete('google_calendar');
    params.delete('msg');
    const newSearch = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
  }, []);

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
    const base = activeWorkspaces.length > 0
      ? filteredEvents
      : (defaultWorkspaceId ? filteredEvents.filter(e => e.cr4a1_workspace_id === defaultWorkspaceId) : filteredEvents);
    let events = appMode === 'calendar' ? [...base, ...(showGoogleEvents ? googleEvents : [])] : base;

    if (!showDeclinedEvents) {
      events = events.filter(e => e.cr4a1_status !== 'recusado' && e.responseStatus !== 'declined');
    }

    if (!showCompletedTasks) {
      events = events.filter(e => {
        if (e.cr4a1_status === 'concluido') return false;
        if (e.cr4a1_subtasks) {
          try {
            const sub = typeof e.cr4a1_subtasks === 'string' ? JSON.parse(e.cr4a1_subtasks) : e.cr4a1_subtasks;
            if (Array.isArray(sub) && sub.length > 0 && sub.every(s => s.completed)) return false;
          } catch {}
        }
        return true;
      });
    }

    return events;
  };

  useEffect(() => {
    if (workspaces.length > 0) {
      setIsWorkspacesLoaded(true);
    }
  }, [workspaces]);

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
      const now = new Date();
      events.forEach(event => {
        if (event.cr4a1_dia_inteiro || !event.cr4a1_hora_inicio) return;
        const [year, month, day] = event.cr4a1_data_inicio.split('T')[0].split('-').map(Number);
        const [hours, minutes] = event.cr4a1_hora_inicio.split(':').map(Number);
        const eventDate = new Date(year, month - 1, day, hours, minutes, 0);
        const diffMs = eventDate - now;
        const diffMin = Math.floor(diffMs / 60000);

        // Verifica se o evento pertence ao usuário logado ou se foi atribuído a ele
        const responsaveis = (event.cr4a1_user_login || '').split(',').map(s => s.trim().toLowerCase());
        const souResponsavel = responsaveis.includes((user || '').toLowerCase());

        // 1. Alerta por E-mail e Sininho no App (15 minutos antes de começar ou se já estiver na janela de início)
        if (souResponsavel && diffMin >= -2 && diffMin <= 15) {
          const mailKey = `mail_event_${event.cr4a1_agenda_kairosid}_${event.cr4a1_data_inicio}`;
          if (!sessionStorage.getItem(mailKey)) {
            sessionStorage.setItem(mailKey, 'true');
            notificarEventoProximo({ event, diffMin: Math.max(0, diffMin), allUsers });
          }
        }

        // 2. Notificação no Dispositivo (Service Worker / Notification API com janela de tolerância para evitar perda de tick)
        const milestones = [30, 15, 5, 0];
        if (souResponsavel && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          milestones.forEach(m => {
            if (diffMin <= m && diffMin >= (m - 2)) {
              const notificationKey = `${event.cr4a1_agenda_kairosid}_m${m}`;
              if (!notifiedRef.current.has(notificationKey)) {
                notifiedRef.current.add(notificationKey);
                const title = `📌 ${event.cr4a1_titulo}`;
                const options = {
                  body: m === 0 ? "Começando agora!" : `Em aproximadamente ${m} minuto(s).`,
                  icon: '/icon-512.jpg',
                  tag: `${event.cr4a1_agenda_kairosid}-${m}`,
                  badge: '/icon-512.jpg',
                  vibrate: [200, 100, 200],
                  requireInteraction: m <= 5
                };
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, options);
                  });
                } else {
                  new Notification(title, options);
                }
              }
            }
          });
        }
      });
      if (notifiedRef.current.size > 100) notifiedRef.current.clear();
    };

    checkNotifications();
    const timer = setInterval(checkNotifications, 12000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkNotifications);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkNotifications);
    };
  }, [events, allUsers, user]);

  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    applyDynamicTheme(accentColor, theme === 'dark');
    localStorage.setItem('kairos_accent_color', accentColor);
    localStorage.setItem('theme', theme);
  }, [accentColor, theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('kairos_app_mode', appMode);
  }, [appMode]);

  useEffect(() => {
    if (!user) return;
    avisarFichasDoResponsavel(user);
    if ('Notification' in window && Notification.permission === 'granted') registerPushSubscription(user).catch(() => {});
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-accent', accentColor);
    localStorage.setItem('kairos_accent_color', accentColor);
  }, [accentColor]);

  // Atalhos de teclado globais (desativados enquanto o foco está num campo de
  // texto ou com algum modal aberto, para não interferir na digitação normal).
  // Precisa ficar antes dos "returns" condicionais abaixo (login/onboarding),
  // já que hooks não podem ser chamados de forma condicional.
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || document.activeElement?.isContentEditable) return;
      if (document.querySelector('.modal-overlay, [data-modal="true"]')) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentDate(prev => {
            if (view === 'year') return subYears(prev, 1);
            if (view === 'week') return subDays(prev, 7);
            if (view === '3days') return subDays(prev, customDaysCount);
            if (view === 'day') return subDays(prev, 1);
            if (view === 'agenda') return subDays(prev, AGENDA_DAYS_WINDOW);
            return subMonths(prev, 1);
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentDate(prev => {
            if (view === 'year') return addYears(prev, 1);
            if (view === 'week') return addDays(prev, 7);
            if (view === '3days') return addDays(prev, customDaysCount);
            if (view === 'day') return addDays(prev, 1);
            if (view === 'agenda') return addDays(prev, AGENDA_DAYS_WINDOW);
            return addMonths(prev, 1);
          });
          break;
        case 't':
        case 'T':
          setCurrentDate(new Date());
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          setEditingEvent(null);
          setIsModalOpen(true);
          break;
        case '1':
        case 'y':
        case 'Y':
          setView('year');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        case '2':
        case 'm':
        case 'M':
          setView('month');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        case '3':
        case 'w':
        case 'W':
          setView('week');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        case '4':
        case 'x':
        case 'X':
          setView('3days');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        case '5':
        case 'd':
        case 'D':
          setView('day');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        case '6':
        case 'l':
        case 'L':
          setView('list');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        case '7':
        case 'a':
        case 'A':
          setView('agenda');
          if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar');
          break;
        default: break;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [view, setCurrentDate, setView, setEditingEvent, customDaysCount]);

  useEffect(() => {
    const handleCommandPaletteShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
    };
    document.addEventListener('keydown', handleCommandPaletteShortcut);
    return () => document.removeEventListener('keydown', handleCommandPaletteShortcut);
  }, []);

  if (isValidatingSession) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)', gap: '16px' }}>
      <span style={{ fontSize: '48px' }}>📅</span><p style={{ color: 'var(--text-secondary)' }}>A verificar sessão...</p>
    </div>
  );

  if (!user) return <LoginScreen onLogin={login} />;

  // ... dentro da função App()

  if (currentUser && !currentUser.cr4a1_unidade) {
    const handleSaveUnitAndWorkspace = async (unit, setIsLoading) => {
      setIsLoading(true);
      try {
        // 1. Atualiza a unidade do usuário
        await updateUnit(currentUser.cr4a1_usuarios_agendaid, unit);

        // 1b. Garante a entrada no Calendário Comum neste mesmo passo — antes isso só
        // acontecia no primeiro login sem role; assim funciona sempre que a filial é
        // escolhida, independente do estado da role.
        await adicionarUsuarioAoCalendarioComum(user);

        // 2. Busca o workspace filtrando pelo nome exato (contorna a restrição de permissão)
        // Usamos encodeURIComponent para garantir que acentos (ex: São Luís) sejam tratados corretamente na URL
        const encodedUnit = encodeURIComponent(unit);
        const response = await fetch(`/api/dataverse-proxy?table=cr4a1_calendarios_workspaceses&$filter=cr4a1_nome eq '${encodedUnit}'`);
        const json = await response.json();

        // Com o filtro aplicado, o workspace correto deve ser o primeiro item do array
        const targetWorkspace = json.value && json.value.length > 0 ? json.value[0] : null;

        if (!targetWorkspace) {
          throw new Error(`Workspace "${unit}" não encontrado no banco de dados. Verifique o nome na tabela de Workspaces.`);
        }

        // 3. Atualiza a lista de membros
        const membrosAtuais = targetWorkspace.cr4a1_membros_logins
          ? targetWorkspace.cr4a1_membros_logins.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        if (!membrosAtuais.includes(user)) {
          const novosMembros = [...membrosAtuais, user].join(',');

          // 4. Aguardamos a resposta real do servidor
          await updateWorkspace(targetWorkspace.cr4a1_calendarios_workspacesid, {
            ...targetWorkspace,
            cr4a1_membros_logins: novosMembros
          });

          console.log("Servidor confirmou a gravação do novo membro.");

          // 5. PAUSA DE SEGURANÇA: Damos 1.5s para o Dataverse processar o commit
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          console.log("Usuário já estava no workspace.");
        }

        // 6. Recarregar
        window.location.reload();

      } catch (error) {
        console.error("Erro na vinculação:", error);
        toast.error(`Falha: ${error.message}`);
        setIsLoading(false);
      }
    };
    return <OnboardingModal user={user} onSaveUnit={handleSaveUnitAndWorkspace} />;
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
    try {
      const permission = await Notification.requestPermission();
      setDeviceNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notificações no dispositivo ativadas!', { icon: '🔔' });
        registerPushSubscription(user).catch(() => {});
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Kairós Agenda', {
              body: 'As notificações neste dispositivo estão ativas e funcionando!',
              icon: '/icon-512.jpg'
            });
          });
        }
      } else if (permission === 'denied') {
        toast.error('Notificações bloqueadas nas configurações do seu navegador.');
      } else {
        toast('Permissão de notificações não confirmada.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar permissão de notificações.');
    }
  };

  const handleSaveEvent = async (data) => {
    try {
      // 1. Notifica menções com @usuario no título e nos detalhes do evento
      const textoNovo = `${data.title || data.cr4a1_titulo || ''}\n${data.details || data.cr4a1_descricao || ''}`;
      const textoAntigo = editingEvent ? `${editingEvent.cr4a1_titulo || ''}\n${editingEvent.cr4a1_detalhes || ''}` : '';
      await notificarMencoes({
        textoNovo,
        textoAntigo,
        origem: 'Evento na Agenda',
        itemTitulo: data.title || data.cr4a1_titulo || 'Evento',
        autor: user,
        currentUser: user,
        allUsers,
        workspace: workspaces.find(w => w.cr4a1_calendarios_workspacesid === data.workspaceId)?.cr4a1_nome || ''
      });

      // 2. Notifica se o evento foi atribuído a outro usuário
      const responsaveis = parseAssignees(data.targetUser || data.cr4a1_user_login);
      const novosResponsaveis = responsaveis.filter(r => r && r !== user && (!editingEvent || !parseAssignees(editingEvent.cr4a1_user_login).includes(r)));
      if (novosResponsaveis.length > 0) {
        notificarCompartilhamento({
          tipoItem: 'Evento na Agenda',
          itemTitulo: data.title || data.cr4a1_titulo || 'Evento',
          autor: user,
          destinatarios: novosResponsaveis,
          currentUser: user,
          allUsers,
          detalhes: {
            origem: 'Agenda',
            dataHora: data.startDate ? `${data.startDate} ${data.startHour || ''}` : ''
          }
        });
      }

      const saved = data.cr4a1_event_id ? await updateEvent(data) : await addEvent(data);
      const eventoId = saved?.cr4a1_agenda_kairosid || data.cr4a1_agenda_kairosid;

      if (eventoId) {
        const filtroFicha = encodeURIComponent(`cr4a1_evento_id eq '${eventoId}'`);
        const resBuscaFicha = await fetch(`/api/dataverse-proxy?table=cr4a1_fichas&$filter=${filtroFicha}`)
          .then(r => r.json())
          .catch(() => ({ value: [] }));
        const fichaExistente = (resBuscaFicha.value || [])[0];

        if (data.criarFichaTrello && data.trelloListId) {
          const utcStartDate = data.allDay
            ? `${data.startDate}T00:00:00`
            : new Date(`${data.startDate}T${data.startHour || '08:00'}:00`).toISOString();
          const targetUsers = parseAssignees(data.targetUser);
          const responsavel = targetUsers[0] || user;

          if (fichaExistente) {
            await fetch(`/api/dataverse-proxy?table=cr4a1_fichas&id=${fichaExistente.cr4a1_fichaid}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cr4a1_titulo: data.title || data.cr4a1_titulo,
                cr4a1_lista_id: data.trelloListId,
                cr4a1_workspace_id: data.workspaceId,
                cr4a1_responsavel_login: responsavel,
                cr4a1_data_inicio: utcStartDate,
                cr4a1_descricao: data.details || ''
              })
            }).catch(() => {});
          } else {
            await fetch(`/api/dataverse-proxy?table=cr4a1_fichas`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cr4a1_titulo: data.title || data.cr4a1_titulo,
                cr4a1_lista_id: data.trelloListId,
                cr4a1_workspace_id: data.workspaceId,
                cr4a1_responsavel_login: responsavel,
                cr4a1_criador_login: user,
                cr4a1_data_inicio: utcStartDate,
                cr4a1_evento_id: eventoId,
                cr4a1_concluida: 'Não',
                cr4a1_notificado: 'Sim',
                cr4a1_descricao: data.details || '',
                cr4a1_ordem: 999
              })
            }).catch(() => {});
          }
        } else if (!data.criarFichaTrello && fichaExistente) {
          await fetch(`/api/dataverse-proxy?table=cr4a1_fichas&id=${fichaExistente.cr4a1_fichaid}`, {
            method: 'DELETE'
          }).catch(() => {});
        }
      }

      toast.success("Guardado com sucesso!");
      setIsModalOpen(false);
    } catch (err) { toast.error("Falha ao guardar."); throw err; }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      const eventoId = eventToDelete.cr4a1_agenda_kairosid;
      await deleteEvent(eventoId, eventToDelete.cr4a1_user_login);
      if (eventoId) {
        const filtro = encodeURIComponent(`cr4a1_evento_id eq '${eventoId}'`);
        fetch(`/api/dataverse-proxy?table=cr4a1_fichas&$filter=${filtro}`)
          .then(r => r.json())
          .then(data => {
            (data.value || []).forEach(f => {
              fetch(`/api/dataverse-proxy?table=cr4a1_fichas&id=${f.cr4a1_fichaid}`, { method: 'DELETE' }).catch(() => {});
            });
          }).catch(() => {});
      }
      toast.success("Eliminado."); setIsDeleteModalOpen(false); setEventToDelete(null);
    } catch (err) { toast.error("Falha ao eliminar."); }
  };

  const handleViewEvent = (event, rect) => {
    if (event.isExternal) { setGoogleImportEvent(event); return; }
    if (event.isVisitaPrincipal || event.isIntervalo) { handleEditClick(event); return; }
    setDetailSourceRect(rect);
    setDetailEvent(event);
  };

  const handleImportGoogleEvent = async (workspaceId) => {
    if (!googleImportEvent) return;
    await addEvent({
      cr4a1_titulo: googleImportEvent.cr4a1_titulo,
      startDate: googleImportEvent.cr4a1_data_inicio,
      endDate: googleImportEvent.cr4a1_data_fim,
      startHour: googleImportEvent.cr4a1_hora_inicio || '00:00',
      endHour: googleImportEvent.cr4a1_hora_fim || '23:59',
      allDay: !!googleImportEvent.cr4a1_dia_inteiro,
      details: 'Importado do Google Calendar.',
      workspaceId
    });
    toast.success('Evento importado para a Kairós!');
    setGoogleImportEvent(null);
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

    if (hasRole('SECRETARIA') || hasCoordRole(userRole) || hasRole('ADMIN') || isAssignedTo(event.cr4a1_user_login, user)) {
      setEditingEvent(event); setIsModalOpen(true);
    } else {
      toast.error("Acesso Negado.", { icon: '🚫' });
    }
  };

  const handleDayClick = (dateStr, events) => {
    setSelectedDayVisitas(events);
    setDayVisitasModalOpen(true);
  };

  const getEventColor = (event) => {
    const firstAssignee = parseAssignees(event.cr4a1_user_login)[0];
    return event.cr4a1_cor || (allUsers.find(u => u.cr4a1_username === firstAssignee)?.cr4a1_cor || '#3498db');
  };

  const handleNavigate = (direction) => {
    const isNext = direction === 'next';
    if (view === 'year') setCurrentDate(isNext ? addYears(currentDate, 1) : subYears(currentDate, 1));
    else if (view === 'week') setCurrentDate(isNext ? addDays(currentDate, 7) : subDays(currentDate, 7));
    else if (view === '3days') setCurrentDate(isNext ? addDays(currentDate, customDaysCount) : subDays(currentDate, customDaysCount));
    else if (view === 'day') setCurrentDate(isNext ? addDays(currentDate, 1) : subDays(currentDate, 1));
    else if (view === 'agenda') setCurrentDate(isNext ? addDays(currentDate, AGENDA_DAYS_WINDOW) : subDays(currentDate, AGENDA_DAYS_WINDOW));
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

  // Tour guiado (spotlight) com o fluxo essencial do app, acionado pelo botão de ajuda no cabeçalho
  const TUTORIAL_STEPS = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Kairós! 👋',
      description: 'Vamos fazer um tour rápido pelas principais funções do app. Você pode sair a qualquer momento em "Pular tour".',
      getTarget: () => null,
      onEnter: () => setAppMode('calendar')
    },
    {
      id: 'menu',
      title: 'Menu lateral',
      description: 'Aqui você abre o menu com as vistas do calendário, a cor do tema e a lista de workspaces.',
      getTarget: () => document.querySelector('[data-tutorial="menu-toggle"]')
    },
    {
      id: 'nav-modes',
      title: 'Troque de área',
      description: 'Alterne entre Agenda, Notas, Painéis BI, Tarefas e Visitas por aqui. As Notas funcionam como um hub de checklists e anotações do time.',
      getTarget: () => {
        const desktopNav = document.querySelector('[data-tutorial="nav-modes-desktop"]');
        if (desktopNav && desktopNav.getBoundingClientRect().width > 0) return desktopNav;
        return document.querySelector('[data-tutorial="nav-modes-mobile"]');
      },
      onEnter: () => {
        const desktopNav = document.querySelector('[data-tutorial="nav-modes-desktop"]');
        const isDesktopVisible = desktopNav && desktopNav.getBoundingClientRect().width > 0;
        if (!isDesktopVisible) setIsSidebarOpen(true);
      }
    },
    {
      id: 'workspaces',
      title: 'Workspaces',
      description: 'Cada workspace é um calendário compartilhado. Marque quais quer ver de uma vez, edite os seus, e defina um padrão com a estrela.',
      getTarget: () => document.querySelector('[data-tutorial="workspaces-list"]'),
      onEnter: () => setIsSidebarOpen(true),
      onLeave: () => setIsSidebarOpen(false)
    },
    {
      id: 'fab',
      title: 'Criar rapidamente',
      description: 'O botão "+" abre atalhos para criar um Evento, uma Visita ou um Workspace novo, sem sair de onde você está.',
      getTarget: () => document.querySelector('[data-tutorial="fab-add"]')
    },
    {
      id: 'profile',
      title: 'Seu perfil',
      description: 'Clique aqui para trocar sua foto, nome de exibição e data de aniversário.',
      getTarget: () => document.querySelector('[data-tutorial="profile"]')
    },
    {
      id: 'help',
      title: 'Precisa rever isso?',
      description: 'Você pode reabrir este tutorial a qualquer momento clicando neste botão.',
      getTarget: () => document.querySelector('[data-tutorial="tutorial-trigger"]')
    }
  ];

  // Nao usa useMemo: essa funcao ja roda depois do early-return de isValidatingSession
  // mais abaixo, e um hook ali violaria a ordem de hooks entre renders.
  const commandGroups = (() => {
    const irPara = (viewId) => () => { setView(viewId); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); };

    const navegacao = [
      { id: 'cmd-mes', label: 'Ver em Mês', icon: 'calendar_month', shortcut: '2', onSelect: irPara('month') },
      { id: 'cmd-semana', label: 'Ver em Semana', icon: 'view_week', shortcut: '3', onSelect: irPara('week') },
      { id: 'cmd-dias', label: `Ver em ${customDaysCount} Dias`, icon: 'view_timeline', shortcut: '4', onSelect: irPara('3days') },
      { id: 'cmd-dia', label: 'Ver em Dia', icon: 'view_day', shortcut: '5', onSelect: irPara('day') },
      { id: 'cmd-agenda', label: 'Ver em Agenda', icon: 'event_note', shortcut: '7', onSelect: irPara('agenda') },
      { id: 'cmd-fichas-view', label: 'Ver Fichas (lista)', icon: 'view_agenda', shortcut: '6', onSelect: irPara('list') },
      { id: 'cmd-hoje', label: 'Ir para hoje', icon: 'today', shortcut: 'T', onSelect: () => setCurrentDate(new Date()) },
    ];

    const areas = [
      { id: 'cmd-area-calendario', label: 'Abrir Agenda', icon: 'calendar_month', onSelect: () => setAppMode('calendar') },
      { id: 'cmd-area-notas', label: 'Abrir Notas', icon: 'description', onSelect: () => setAppMode('notas') },
      { id: 'cmd-area-bi', label: 'Abrir Painéis BI', icon: 'bar_chart', onSelect: () => setAppMode('bi') },
      { id: 'cmd-area-trello', label: 'Abrir Fichas (Trello)', icon: 'view_kanban', onSelect: () => setAppMode('trello') },
      ...((hasRole('DIRETORIA') || hasRole('ADMIN') || hasRole('COORD') || hasRole('SECRETARIA') || hasRole('RH'))
        ? [{ id: 'cmd-area-tarefas', label: 'Abrir Tarefas', icon: 'assignment', onSelect: () => setAppMode('tasks') }] : []),
      ...((hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN'))
        ? [{ id: 'cmd-area-visitas', label: 'Abrir Visitas', icon: 'location_on', onSelect: () => setAppMode('visitas') }] : []),
      ...((hasRole('ADMIN') || hasRole('SECRETARIA'))
        ? [{ id: 'cmd-area-passagens', label: 'Abrir Passagens', icon: 'flight', onSelect: () => setAppMode('passagens') }] : []),
    ];

    const acoes = [
      { id: 'cmd-novo-evento', label: 'Novo evento', icon: 'calendar_add_on', shortcut: 'N', onSelect: () => { setEditingEvent(null); setIsModalOpen(true); } },
      ...((hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN'))
        ? [{ id: 'cmd-nova-visita', label: 'Nova visita', icon: 'location_on', onSelect: () => { setEditingVisita(null); setIsVisitaModalOpen(true); } }] : []),
      { id: 'cmd-tema', label: theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro', icon: theme === 'light' ? 'dark_mode' : 'light_mode', onSelect: () => setTheme(theme === 'light' ? 'dark' : 'light') },
      { id: 'cmd-perfil', label: 'Abrir meu perfil', icon: 'account_circle', onSelect: () => setIsProfileModalOpen(true) },
      { id: 'cmd-notificacoes', label: 'Ativar notificações no dispositivo', icon: 'notifications', onSelect: requestNotificationPermission },
      { id: 'cmd-tutorial', label: 'Reabrir tutorial guiado', icon: 'help', onSelect: () => setIsTutorialOpen(true) },
      ...((hasRole('ADMIN') || hasRole('SECRETARIA'))
        ? [{ id: 'cmd-usuarios', label: 'Gerir utilizadores', icon: 'group', onSelect: () => setIsUserManagementModalOpen(true) }] : []),
    ];

    return [
      { label: 'Navegação', items: navegacao },
      { label: 'Áreas', items: areas },
      { label: 'Ações', items: acoes },
    ];
  })();

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}
      >
        <Toaster
          position="bottom-center"
          containerStyle={{
            zIndex: 10000002,
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))'
          }}
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              transition: 'all 0.15s ease-out',
            },
            success: { iconTheme: { primary: '#34a853', secondary: 'var(--bg-primary)' } },
            error: { iconTheme: { primary: '#e74c3c', secondary: 'var(--bg-primary)' } },
            loading: { iconTheme: { primary: 'var(--text-accent)', secondary: 'var(--bg-primary)' } },
          }}
        />

        {showBirthday && <BirthdayCelebration name={currentUser?.cr4a1_nome_exibicao || user} onClose={() => setShowBirthday(false)} />}

        {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, backdropFilter: 'blur(4px)', transition: 'opacity 0.3s' }} />
        )}

        {/* SIDEBAR ESQUERDA (MENU) */}
        <div style={{
          position: 'fixed', top: 0, left: 0, height: '100dvh', width: '320px', maxWidth: '85vw', backgroundColor: 'var(--bg-primary)', zIndex: 3100,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          borderRight: '1px solid var(--border-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          borderTopRightRadius: '24px', borderBottomRightRadius: '24px', boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none'
        }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h1 className="logo" style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KairosIcon size={26} /> Kairós
              </h1>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} aria-label="Fechar menu">
                <span className="material-symbols-rounded">close</span>
              </Button>
            </div>

            <div className="mobile-only" data-tutorial="nav-modes-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Modo de Visualização</div>
              <button onClick={() => { setAppMode('calendar'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                backgroundColor: appMode === 'calendar' ? 'var(--bg-tertiary)' : 'transparent',
                color: appMode === 'calendar' ? 'var(--text-accent)' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded">calendar_month</span> Agenda
              </button>

              <button onClick={() => { setAppMode('notas'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                backgroundColor: appMode === 'notas' ? '#ffe0b2' : 'transparent',
                color: appMode === 'notas' ? '#f57c00' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded">description</span> Notas
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

              {/* NOVO: Botão Painéis BI */}
              <button onClick={() => { setAppMode('bi'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                backgroundColor: appMode === 'bi' ? '#fff3e0' : 'transparent',
                color: appMode === 'bi' ? '#f57c00' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded">bar_chart</span> Painéis BI
              </button>


              <button onClick={() => { setAppMode('trello'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{ justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer', backgroundColor: appMode === 'trello' ? 'var(--bg-tertiary)' : 'transparent', color: appMode === 'trello' ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                <span className="material-symbols-rounded">view_kanban</span> Fichas
              </button>

              {(hasRole('ADMIN') || hasRole('SECRETARIA')) && (
                <button onClick={() => { setAppMode('passagens'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{ justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer', backgroundColor: appMode === 'passagens' ? '#e3f2fd' : 'transparent', color: appMode === 'passagens' ? '#1565c0' : 'var(--text-primary)' }}>
                  <span className="material-symbols-rounded">flight</span> Passagens
                </button>
              )}
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '12px 0 4px' }}>Aplicativos</div>
              {APPS.map(app => (
                <a key={app.title} href={app.href} target="_blank" rel="noopener noreferrer" className="nav-pill boing-effect" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 14px', borderRadius: '100px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                  <img src={app.img} alt="" className="app-rail-app-icon" />
                  {app.title}
                </a>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Vistas do Calendário</div>
              {viewsConfig.map(v => (
                <button key={v.id} onClick={() => { setView(v.id); setIsSidebarOpen(false); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }} className="nav-pill boing-effect" style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                  fontWeight: (view === v.id && !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? '700' : '500', backgroundColor: (view === v.id && !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? 'var(--bg-tertiary)' : 'transparent', color: (view === v.id && !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)', transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{v.icon}</span> {v.label}
                </button>
              ))}
              <button onClick={() => { setView('list'); setIsSidebarOpen(false); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }} className="nav-pill boing-effect" style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                fontWeight: (view === 'list' && !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? '700' : '500', backgroundColor: (view === 'list' && !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? 'var(--bg-tertiary)' : 'transparent', color: (view === 'list' && !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)', transition: 'all 0.2s'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>view_agenda</span> Fichas
              </button>
            </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Cor do Tema</div>
              <div className="grid max-h-72 grid-cols-6 gap-2 overflow-y-auto p-1 sm:grid-cols-8">
                {themeColors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setAccentColor(c.hex)}
                    title={c.label}
                    aria-label={c.label}
                    className="mx-auto size-8 rounded-full transition-transform duration-200 active:scale-90"
                    style={{
                      backgroundColor: c.hex,
                      boxShadow: accentColor === c.hex ? `0 0 0 3px var(--bg-primary), 0 0 0 5px ${c.hex}` : '0 2px 5px rgba(0,0,0,0.1)',
                      transform: accentColor === c.hex ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>

            {!['visitas', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && (
              <>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
                  <Input placeholder="Procurar evento..." value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} />
                </div>

                <div data-tutorial="workspaces-list">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Workspaces</div>
                  </div>
                  {((appMode === 'visitas' && (hasRole('COORD COMERCIAL') || hasRole('ADMIN'))) ||
                    (appMode === 'calendar' && (hasRole('RH') || hasRole('ADMIN') || hasRole('QUALIDADE')))) && (
                    <button
                      onClick={() => { setIsFilialTemporariaOpen(true); setIsSidebarOpen(false); }}
                      className="nav-pill boing-effect"
                      style={{ justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '12px 14px', borderRadius: '100px', border: 'none', cursor: 'pointer', marginBottom: '12px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '20px', color: appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)' }}>swap_horiz</span>
                      Filial Temporária
                    </button>
                  )}
                  {/* Nova barra de pesquisa de workspaces */}
                  <Input
                    placeholder="Procurar workspace..."
                    value={workspaceSearchTerm}
                    onChange={e => setWorkspaceSearchTerm(e.target.value)}
                    className="mb-3"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {workspaces.filter(ws => ws.cr4a1_nome && matchesSearch(ws.cr4a1_nome, workspaceSearchTerm)).map(ws => (
                      <div key={ws.cr4a1_calendarios_workspacesid} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: '8px 10px', borderRadius: '12px',
                          backgroundColor: activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid) ? 'var(--bg-tertiary)' : 'transparent',
                        }}>
                          <Checkbox
                            checked={activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid)}
                            onCheckedChange={() => toggleWorkspaceFilter(ws.cr4a1_calendarios_workspacesid)}
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

                {appMode === 'calendar' && googleConectadoEm && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Calendários externos</div>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: '8px 10px', borderRadius: '12px',
                      backgroundColor: showGoogleEvents ? 'var(--bg-tertiary)' : 'transparent',
                    }}>
                      <Checkbox
                        checked={showGoogleEvents}
                        onCheckedChange={(checked) => {
                          setShowGoogleEvents(checked);
                          try { localStorage.setItem('kairos_show_google_events', JSON.stringify(checked)); } catch { /* ignora */ }
                        }}
                      />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4285F4' }}></div>
                      <span style={{ color: 'var(--text-primary)' }}>Meu Google Calendar</span>
                    </label>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Funcionários</div>
                  {/* Novo filtro de filial */}
                  <Select value={userUnitFilter} onValueChange={setUserUnitFilter}>
                    <SelectTrigger className="mb-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableUserUnits.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Procurar colega..."
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    className="mb-4"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                    {allUsers.filter(u => {
                      const matchesQuery = matchesSearch(u.cr4a1_username, userSearchTerm) ||
                        (u.cr4a1_nome_exibicao && matchesSearch(u.cr4a1_nome_exibicao, userSearchTerm));
                      const matchesUnit = userUnitFilter === 'Todas' || u.cr4a1_unidade === userUnitFilter;

                      if (hasRole('COMUM') && !hasRole('ADMIN')) return matchesQuery && matchesUnit && u.cr4a1_unidade === currentUser?.cr4a1_unidade;
                      return matchesQuery && matchesUnit;
                    }).map(u => (
                      <label key={u.cr4a1_usuarios_agendaid || u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', padding: '4px 0' }}>
                        <Checkbox
                          checked={filters.users.includes(u.cr4a1_username)}
                          onCheckedChange={() => toggleFilter('users', u.cr4a1_username)}
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
                        <Checkbox checked={filters.types.includes(t.name)} onCheckedChange={() => toggleFilter('types', t.name)} />
                        <span>{t.emoji} {t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {(filters.text || filters.users.length > 0 || filters.types.length > 0) && (
                  <Button variant="outline" className="w-full" onClick={() => setFilters({ text: '', users: [], types: [] })}>Limpar Filtros</Button>
                )}
              </>
            )}

            {credenciaisPendentes.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsCredenciaisMenuOpen(prev => !prev)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px',
                    padding: '10px 12px', cursor: 'pointer', color: 'var(--text-primary)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--text-accent)' }}>person_add</span>
                    Usuários das Credenciais ({credenciaisPendentes.length})
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                    {isCredenciaisMenuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {isCredenciaisMenuOpen && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Clique num usuário ativo das credenciais para criá-lo automaticamente na agenda:
                    </span>
                    <Input
                      placeholder="Buscar nas credenciais..."
                      value={credenciaisSearchTerm}
                      onChange={e => setCredenciaisSearchTerm(e.target.value)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                      {credenciaisPendentes.filter(c =>
                        !credenciaisSearchTerm.trim() ||
                        matchesSearch(c.cr4a1_username, credenciaisSearchTerm) ||
                        matchesSearch(c.cr4a1_nome_exibicao || '', credenciaisSearchTerm) ||
                        matchesSearch(c.cr4a1_title || '', credenciaisSearchTerm) ||
                        matchesSearch(c.cr4a1_unidade || '', credenciaisSearchTerm)
                      ).map(c => {
                        const isCreating = creatingCredUsername === c.cr4a1_username;
                        return (
                          <button
                            key={c.cr4a1_credenciaisid || c.cr4a1_username}
                            type="button"
                            disabled={!!creatingCredUsername}
                            onClick={() => handleClickCriarCredencial(c)}
                            title={`Clique para criar ${c.cr4a1_nome_exibicao} (@${c.cr4a1_username}) na agenda`}
                            className="boing-effect"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
                              padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                              background: 'var(--bg-primary)', cursor: isCreating ? 'wait' : 'pointer'
                            }}
                          >
                            <div
                              style={{
                                width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--text-accent)',
                                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '11px', fontWeight: '700'
                              }}
                            >
                              {(c.cr4a1_nome_exibicao || c.cr4a1_username)?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.cr4a1_nome_exibicao}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                @{c.cr4a1_username}{c.cr4a1_unidade ? ` • ${c.cr4a1_unidade}` : ''}
                              </div>
                            </div>
                            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--text-accent)', flexShrink: 0 }}>
                              {isCreating ? 'progress_activity' : 'add_circle'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* HEADER UNIFICADO E COMPACTO (PADRÃO GOOGLE CALENDAR / GALAXY S23 RESPONSIVO) */}
        <header
          className="app-header is-compact"
          style={appMode === 'trello' ? { padding: '4px 16px', gap: '8px', minHeight: '44px' } : undefined}
        >
          {/* GRUPO 1: MARCA & MENU (LINHA 1 ESQUERDA NO MOBILE) */}
          <div className="header-brand">
            <Button variant="ghost" size="icon" className={appMode === 'trello' ? 'size-8' : ''} onClick={() => setIsSidebarOpen(true)} data-tutorial="menu-toggle" aria-label="Abrir menu">
              <span className="material-symbols-rounded" style={{ fontSize: appMode === 'trello' ? '20px' : '24px' }}>menu</span>
            </Button>
            <h1 className="logo boing-effect" onClick={() => { setView('month'); setCurrentDate(new Date()); setAppMode('calendar'); }} style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }} title="Voltar para a Agenda">
              {['visitas', 'notas', 'bi'].includes(appMode) ? (
                <span className="material-symbols-rounded" style={{ color: '#f57c00', fontSize: appMode === 'trello' ? '22px' : '26px' }}>
                  {appMode === 'visitas' ? 'location_on' : (appMode === 'notas' ? 'description' : 'bar_chart')}
                </span>
              ) : (
                <KairosIcon size={appMode === 'trello' ? 22 : 26} dark={theme === 'dark'} />
              )}
              <span className="nav-label-collapse">{appMode === 'visitas' ? 'Visitas' : (appMode === 'notas' ? 'Notas' : (appMode === 'bi' ? 'Painéis BI' : 'Kairós'))}</span>
            </h1>

            {appMode === 'trello' && (
              <button
                onClick={() => setAppMode('calendar')}
                className="boing-effect"
                title="Voltar para o Calendário"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '100px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--text-accent)' }}>calendar_month</span>
                <span>Agenda</span>
              </button>
            )}
          </div>

          {/* GRUPO 2: NAVEGAÇÃO TEMPORAL (LINHA 2 ESQUERDA NO MOBILE) */}
          {appMode !== 'trello' && (
            <div className="header-period-nav">
              <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} title="Ir para hoje (T)" style={{ borderRadius: '100px', height: '30px', padding: '0 10px', fontWeight: '600', fontSize: '12px' }}>
                Hoje
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleNavigate('prev')} aria-label="Período anterior" title="Período anterior (←)">
                  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>chevron_left</span>
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleNavigate('next')} aria-label="Próximo período" title="Próximo período (→)">
                  <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>chevron_right</span>
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative', minWidth: 0 }}>
                <span className="period-title-text" style={{ color: 'var(--text-title)', fontWeight: '500', textTransform: 'capitalize' }}>
                  {view === 'day' && format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  {view === '3days' && `${format(currentDate, 'd MMM', { locale: ptBR })} – ${format(addDays(currentDate, customDaysCount - 1), 'd MMM', { locale: ptBR })}`}
                  {view === 'agenda' && `${format(currentDate, 'd MMM', { locale: ptBR })} – ${format(addDays(currentDate, AGENDA_DAYS_WINDOW - 1), 'd MMM', { locale: ptBR })}`}
                  {!['day', '3days', 'agenda'].includes(view) && format(currentDate, 'MMMM', { locale: ptBR })}
                </span>
                <span onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)} style={{ cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '500' }}>
                  {format(currentDate, 'yyyy')} <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>arrow_drop_down</span>
                </span>

                {isYearSelectorOpen && (
                  <>
                    <div
                      onClick={() => setIsYearSelectorOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
                    />
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 2000, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', width: '280px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {Array.from({ length: 16 }, (_, i) => {
                        const year = currentDate.getFullYear() - 7 + i;
                        return (
                          <button key={year} onClick={() => { setCurrentDate(new Date(year, currentDate.getMonth(), 1)); setIsYearSelectorOpen(false); }} className="nav-pill boing-effect" style={{ padding: '8px 0', borderRadius: '8px', border: 'none', backgroundColor: year === currentDate.getFullYear() ? 'var(--text-accent)' : 'transparent', color: year === currentDate.getFullYear() ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* GRUPO 3: CONTROLES DE VISUALIZAÇÃO (LINHA 2 DIREITA NO MOBILE) */}
          {appMode !== 'trello' && (
            <div className="header-view-controls">
              {!['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && view === 'day' && (
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-color)', marginRight: '2px' }}>
                  <button onClick={() => setDayViewMode('timeline')} className="boing-effect" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '16px', border: 'none', background: dayViewMode === 'timeline' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'timeline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>Linhas</button>
                  <button onClick={() => setDayViewMode('cards')} className="boing-effect" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '16px', border: 'none', background: dayViewMode === 'cards' ? 'var(--text-accent)' : 'transparent', color: dayViewMode === 'cards' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>Cards</button>
                </div>
              )}

              {!['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && view === '3days' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--bg-secondary)', borderRadius: '20px', padding: '2px 4px', border: '1px solid var(--border-color)', marginRight: '2px' }}>
                  <button onClick={() => setCustomDaysCount(c => Math.max(2, c - 1))} disabled={customDaysCount <= 2} title="Diminuir dias" style={{ width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: customDaysCount <= 2 ? 'default' : 'pointer', opacity: customDaysCount <= 2 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>remove</span>
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', minWidth: '32px', textAlign: 'center' }}>{customDaysCount}d</span>
                  <button onClick={() => setCustomDaysCount(c => Math.min(7, c + 1))} disabled={customDaysCount >= 7} title="Aumentar dias" style={{ width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: customDaysCount >= 7 ? 'default' : 'pointer', opacity: customDaysCount >= 7 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>add</span>
                  </button>
                </div>
              )}

              {/* DROPDOWN PILL DE VISUALIZAÇÕES (GOOGLE CALENDAR STYLE) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="boing-effect"
                    title="Alterar modo de visualização"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      height: '30px',
                    }}
                  >
                    <span>{viewLabels[view] || 'Mês'}</span>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>arrow_drop_down</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => { setView('day'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">Dia</span>
                    <span className="text-xs text-muted-foreground font-mono">D</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setView('week'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">Semana</span>
                    <span className="text-xs text-muted-foreground font-mono">W</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setView('month'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">Mês</span>
                    <span className="text-xs text-muted-foreground font-mono">M</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setView('year'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">Ano</span>
                    <span className="text-xs text-muted-foreground font-mono">Y</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setView('agenda'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">Programação</span>
                    <span className="text-xs text-muted-foreground font-mono">A</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setView('3days'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">{customDaysCount} dias</span>
                    <span className="text-xs text-muted-foreground font-mono">X</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setView('list'); if (['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) setAppMode('calendar'); }}>
                    <span className="flex-1">Fichas</span>
                    <span className="text-xs text-muted-foreground font-mono">L</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuCheckboxItem
                    checked={showWeekends}
                    onCheckedChange={(checked) => {
                      setShowWeekends(checked);
                      try { localStorage.setItem('kairos_show_weekends', JSON.stringify(checked)); } catch {}
                    }}
                  >
                    Mostrar fins de semana
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={showGoogleEvents}
                    onCheckedChange={(checked) => {
                      setShowGoogleEvents(checked);
                      try { localStorage.setItem('kairos_show_google_events', JSON.stringify(checked)); } catch {}
                    }}
                  >
                    Mostrar Google Agenda
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={showDeclinedEvents}
                    onCheckedChange={(checked) => {
                      setShowDeclinedEvents(checked);
                      try { localStorage.setItem('kairos_show_declined_events', JSON.stringify(checked)); } catch {}
                    }}
                  >
                    Mostrar eventos recusados
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={showCompletedTasks}
                    onCheckedChange={(checked) => {
                      setShowCompletedTasks(checked);
                      try { localStorage.setItem('kairos_show_completed_tasks', JSON.stringify(checked)); } catch {}
                    }}
                  >
                    Mostrar tarefas concluídas
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* GRUPO 4: AÇÕES & PERFIL (LINHA 1 DIREITA NO MOBILE) */}
          <div className="header-actions">
            {/* Ícones de ação primários */}
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsCommandPaletteOpen(true)} title="Busca rápida (Ctrl+K)">
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>search</span>
            </Button>

            <NotificationBell user={user} />

            {/* Ícones de ação secundários (visíveis diretamente no desktop) */}
            <div className="header-desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Button variant="ghost" size="icon" className="size-8" onClick={requestNotificationPermission} title={deviceNotificationPermission === 'granted' ? 'Notificações ativadas' : 'Ativar notificações'}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: deviceNotificationPermission === 'granted' ? 'var(--text-accent)' : undefined }}>
                  {deviceNotificationPermission === 'granted' ? 'notifications_active' : 'notifications'}
                </span>
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsTutorialOpen(true)} title="Tutorial guiado">
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>help</span>
              </Button>
              {(hasRole('ADMIN') || hasRole('SECRETARIA')) && (
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsUserManagementModalOpen(true)} title="Gerir Utilizadores">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>group</span>
                </Button>
              )}
              {appMode !== 'trello' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-primary hover:text-primary"
                  onClick={() => setIsWatchModalOpen(true)}
                  title="Conectar Galaxy Watch"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>watch</span>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={logout} title="Sair do sistema">
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>logout</span>
              </Button>
            </div>

            {pendingSyncCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8 text-warning hover:text-warning"
                onClick={syncPendingQueue}
                disabled={isSyncing || !isOnline}
                title={isOnline ? `Sincronizar ${pendingSyncCount} alteração(ões) offline` : 'Sem internet'}
              >
                <span className={`material-symbols-rounded ${isSyncing ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>{isSyncing ? 'progress_activity' : 'cloud_sync'}</span>
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">{pendingSyncCount}</span>
              </Button>
            )}

            {/* Perfil do usuário com DropdownMenu (Acesso a perfil + ações secundárias no mobile) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="boing-effect"
                  style={{
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)',
                    borderRadius: '32px', padding: '2px 8px 2px 2px',
                    border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '500', height: '32px'
                  }}
                  title="Perfil e preferências"
                >
                  {currentUser?.cr4a1_foto ? (
                    <img src={currentUser.cr4a1_foto} alt="Foto" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--text-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px' }}>
                      {user?.[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="profile-name" style={{ color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {currentUser?.cr4a1_nome_exibicao || user}
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>arrow_drop_down</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {currentUser?.cr4a1_nome_exibicao || user}
                </div>
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                  <span className="material-symbols-rounded mr-2 text-base">person</span>
                  <span>Meu Perfil</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Itens comutadores de fácil acesso no mobile */}
                <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                  <span className="material-symbols-rounded mr-2 text-base">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                  <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsTutorialOpen(true)}>
                  <span className="material-symbols-rounded mr-2 text-base">help</span>
                  <span>Tutorial Guiado</span>
                </DropdownMenuItem>
                {appMode !== 'trello' && (
                  <DropdownMenuItem onClick={() => setIsWatchModalOpen(true)}>
                    <span className="material-symbols-rounded mr-2 text-base">watch</span>
                    <span>Conectar Galaxy Watch</span>
                  </DropdownMenuItem>
                )}
                {(hasRole('ADMIN') || hasRole('SECRETARIA')) && (
                  <DropdownMenuItem onClick={() => setIsUserManagementModalOpen(true)}>
                    <span className="material-symbols-rounded mr-2 text-base">group</span>
                    <span>Gerir Utilizadores</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <span className="material-symbols-rounded mr-2 text-base">logout</span>
                  <span>Sair do Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'visible', justifyContent: 'center' }}>
          {/* BARRA LATERAL ESQUERDA DE PARTICIPANTES (HOVER EXPANDE) */}
          {isDevWorkspaceActive && !['visitas', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && (
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
                        key={member.cr4a1_usuarios_agendaid || member.cr4a1_username}
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
                                  pointerEvents: 'none',
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

          <main
            className={`main-container ${(isDevWorkspaceActive && !['visitas', 'notas', 'bi', 'trello', 'passagens'].includes(appMode)) ? 'has-left-sidebar' : ''}`}
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: '100%',
              height: !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && ['month', 'day', '3days', 'week'].includes(view) ? 'calc(100vh - 50px)' : undefined,
              maxHeight: !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && ['month', 'day', '3days', 'week'].includes(view) ? 'calc(100vh - 50px)' : undefined,
              overflow: !['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && ['month', 'day', '3days', 'week'].includes(view) ? 'hidden' : 'visible',
              padding: (!['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && ['day', '3days', 'week'].includes(view))
                ? '0'
                : (!['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && view === 'month' ? '6px 8px 8px 8px' : undefined),
              paddingTop: appMode === 'trello' ? '4px' : undefined,
              paddingBottom: appMode === 'trello' ? '4px' : (!['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && view === 'month' ? '8px' : '40px'),
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >

            <div key={appMode} className="view-enter" style={{ width: '100%', height: '100%' }}>
              {appMode === 'bi' ? (
                <React.Suspense fallback={null}>
                  <DashboardPanel
                    activeWorkspaces={workspaces.filter(ws => activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid))}
                    userRole={userRole}
                    user={user}
                    biConfig={BI_CONFIG}
                    biPermissoes={biPermissoes}
                  />
                </React.Suspense>
              ) : appMode === 'notas' ? (
                <React.Suspense fallback={null}>
                  <NotesPanel
                    notas={notas || []}
                    eventos={events || []}
                    addNota={addNota}
                    updateNota={updateNota}
                    deleteNota={deleteNota}
                    currentUser={currentUser}
                    allUsers={allUsers || []}
                    workspaces={workspaces}
                    activeWorkspaces={activeWorkspaces}
                    isOnline={isOnline}
                    registrarCorRecenteUsuario={registrarCorRecenteUsuario}
                    notaIdParaAbrir={notaIdParaAbrir}
                    onLimparNotaIdParaAbrir={() => setNotaIdParaAbrir(null)}
                    onNavegarParaFicha={handleNavegarParaFicha}
                  />
                </React.Suspense>
              ) : appMode === 'trello' ? (
                <React.Suspense fallback={null}>
                  <TrelloPanel
                    workspaces={workspaces}
                    allUsers={allUsers}
                    user={user}
                    currentUser={currentUser}
                    registrarCorRecenteUsuario={registrarCorRecenteUsuario}
                    updateTrelloFundo={updateTrelloFundo}
                    refreshEvents={fetchEvents}
                    isAdmin={hasRole('ADMIN')}
                    hasRole={hasRole}
                    dragEndRef={trelloDragEndRef}
                    notas={notas || []}
                    addNota={addNota}
                    updateNota={updateNota}
                    fichaIdParaAbrir={fichaIdParaAbrir}
                    onLimparFichaIdParaAbrir={() => setFichaIdParaAbrir(null)}
                    onNavegarParaNota={handleNavegarParaNota}
                  />
                </React.Suspense>
              ) : appMode === 'passagens' ? (
                <React.Suspense fallback={null}>
                  <CotacaoPassagensPanel />
                </React.Suspense>
              ) : appMode === 'tasks' ? (
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
                                eventTypes={eventTypes}
                                workspaces={workspaces}
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
                    <MonthView
                      currentDate={currentDate}
                      getEventsForDay={handleGetEventsForDay}
                      getDisplayEvents={getDisplayEvents}
                      allUsers={allUsers}
                      eventTypes={eventTypes}
                      workspaces={workspaces}
                      activeWorkspaces={activeWorkspaces}
                      wsBorderStyle={wsBorderStyle}
                      appMode={appMode}
                      showWeekends={showWeekends}
                      onViewEvent={handleViewEvent}
                      onDayClick={handleDayClick}
                      onNavigateToDay={(day) => {
                        setCurrentDate(day);
                        setView('day');
                      }}
                      onDayMouseEnter={handleDayMouseEnter}
                      onDayMouseLeave={handleDayMouseLeave}
                      getEventColor={getEventColor}
                    />
                  )}

                  {view === 'list' && <ListView events={getDisplayEvents()} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleViewEvent} onDelete={(e) => { setEventToDelete(e); setIsDeleteModalOpen(true); }} workspaces={appMode === 'visitas' ? [] : workspaces} viewMode={listViewMode} onViewModeChange={setListViewMode} />}

                  {view === 'agenda' && (
                    <AgendaView startDate={currentDate} daysCount={AGENDA_DAYS_WINDOW} getEventsForDay={handleGetEventsForDay} holidays={holidays} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleViewEvent} />
                  )}

                  {['day', '3days', 'week'].includes(view) && (
                    <DayView selectedDate={currentDate} viewType={view} getEventsForDay={handleGetEventsForDay} holidays={holidays} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleViewEvent} dayViewMode={dayViewMode} customDaysCount={customDaysCount} />
                  )}
                </>
              )}
            </div>
          </main>

          {/* TRILHO LATERAL DIREITO (DESKTOP): apps da Kairós e módulos */}
          <aside className="app-rail desktop-only" data-tutorial="nav-modes-desktop">
            <RailItem active={appMode === 'calendar'} onClick={() => setAppMode('calendar')} icon="calendar_month" title="Agenda" activeBg="var(--bg-tertiary)" activeColor="var(--text-accent)" />
            <RailItem active={appMode === 'notas'} onClick={() => setAppMode('notas')} icon="description" title="Notas" activeBg="#ffe0b2" activeColor="#f57c00" />
            <RailItem active={appMode === 'bi'} onClick={() => setAppMode('bi')} icon="bar_chart" title="Painéis BI" activeBg="#fff3e0" activeColor="#f57c00" />
            {(hasRole('DIRETORIA') || hasRole('ADMIN') || hasRole('COORD') || hasRole('SECRETARIA') || hasRole('RH')) && (
              <RailItem active={appMode === 'tasks'} onClick={() => setAppMode('tasks')} icon="assignment" title="Tarefas" activeBg="var(--bg-tertiary)" activeColor="var(--text-accent)" />
            )}
            {(hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN')) && (
              <RailItem active={appMode === 'visitas'} onClick={() => setAppMode('visitas')} icon="location_on" title="Visitas" activeBg="#fff3e0" activeColor="#f57c00" />
            )}
            <RailItem active={appMode === 'trello'} onClick={() => setAppMode('trello')} icon="view_kanban" title="Fichas" activeBg="var(--bg-tertiary)" activeColor="var(--text-accent)" />
            {(hasRole('ADMIN') || hasRole('SECRETARIA')) && (
              <RailItem active={appMode === 'passagens'} onClick={() => setAppMode('passagens')} icon="flight" title="Passagens" activeBg="#e3f2fd" activeColor="#1565c0" />
            )}
            <div className="app-rail-divider" />
            {APPS.map(app => (
              <a key={app.title} href={app.href} target="_blank" rel="noopener noreferrer" title={app.title} className="app-rail-item">
                <img src={app.img} alt={app.title} className="app-rail-app-icon" />
                <span className="app-rail-label">{app.title}</span>
              </a>
            ))}
          </aside>
        </div>

        {isTutorialOpen && (
          <React.Suspense fallback={null}>
            <GuidedTour isOpen={isTutorialOpen} onClose={() => { setIsTutorialOpen(false); setIsSidebarOpen(false); }} steps={TUTORIAL_STEPS} />
          </React.Suspense>
        )}

        <EventDetailModal
          event={detailEvent}
          sourceRect={detailSourceRect}
          allUsers={allUsers}
          eventTypes={eventTypes}
          workspaces={workspaces}
          onClose={() => setDetailEvent(null)}
          onEdit={(ev) => { setDetailEvent(null); handleEditClick(ev); }}
        />

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
          {isUserManagementModalOpen && <UserManagementModal isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)} allUsers={allUsers} credenciaisPendentes={credenciaisPendentes} criarUsuarioDaCredencial={criarUsuarioDaCredencial} updateUserColor={updateUserColor} eventTypes={eventTypes} addEventType={addEventType} updateEventType={updateEventType} deleteEventType={deleteEventType} isAdmin={hasRole('ADMIN')} updateUserRoles={updateUserRoles} addUser={addUser} deleteUser={deleteUser} currentUsername={user} biPermissoes={biPermissoes} upsertBiPermission={upsertBiPermission} resetBiPermission={resetBiPermission} appRoles={appRoles} availableRoles={availableRoles} addAppRole={addAppRole} renameAppRole={renameAppRole} deleteAppRole={deleteAppRole} />}
          <WatchPairingModal
            isOpen={isWatchModalOpen}
            onClose={() => setIsWatchModalOpen(false)}
            user={user}
            currentUser={currentUser}
            userRole={userRole}
          />
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
          <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>O Meu Perfil</DialogTitle>
              </DialogHeader>
              {currentUser && (
                <div className="flex flex-col gap-5">
                  <div className="mb-2 text-center">
                    {currentUser.cr4a1_foto ? (
                      <img src={currentUser.cr4a1_foto} className="mx-auto size-[100px] rounded-full border-[3px] border-primary object-cover" />
                    ) : (
                      <div className="mx-auto flex size-[100px] items-center justify-center rounded-full bg-primary text-[32px] font-bold text-primary-foreground">
                        {user?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => document.getElementById('p-up').click()}>Mudar Foto</Button>
                    <input
                      type="file"
                      id="p-up"
                      hidden
                      accept="image/*"
                      onChange={(e) => compressImage(e.target.files[0], (res) => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                        nomeExibicao: document.getElementById('n-up')?.value || currentUser.cr4a1_nome_exibicao,
                        aniversario: aniversarioEdit || currentUser.cr4a1_aniversario,
                        foto: res,
                        email: emailEdit || currentUser.cr4a1_email
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Nome de Exibição</Label>
                    <Input type="text" defaultValue={currentUser.cr4a1_nome_exibicao || user} id="n-up" />
                  </div>

                  <div>
                    <Label>E-mail para Alertas e Notificações</Label>
                    <Input
                      type="email"
                      placeholder="seu.email@kairosmotores.com"
                      value={emailEdit}
                      onChange={(e) => setEmailEdit(e.target.value)}
                      id="e-up"
                      className="mt-1"
                    />
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Receba alertas por e-mail de menções (@seu_usuario), eventos próximos e compartilhamentos.
                    </span>
                  </div>

                  <DateField label="Aniversário" selectedDate={aniversarioEdit} onSelect={setAniversarioEdit} allowClear />

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                      nomeExibicao: document.getElementById('n-up').value,
                      aniversario: aniversarioEdit,
                      foto: currentUser.cr4a1_foto,
                      email: emailEdit
                    })}
                  >
                    Salvar Dados do Perfil
                  </Button>

                  <hr className="border-border" />

                  <WhatsAppInput userId={currentUser.cr4a1_usuarios_agendaid} initialValue={currentUser.cr4a1_whatsapp} onSave={updateWhatsApp} />
                  <hr className="border-border" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <span className="font-semibold text-sm block">Notificações no Dispositivo</span>
                      <span className="text-xs text-muted-foreground">
                        {deviceNotificationPermission === 'granted' ? 'Notificações ativas no navegador' : 'Permitir alertas nesta máquina ou celular'}
                      </span>
                    </div>
                    <Button
                      variant={deviceNotificationPermission === 'granted' ? 'outline' : 'default'}
                      size="sm"
                      onClick={requestNotificationPermission}
                      className="gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <span className="material-symbols-rounded text-sm">
                        {deviceNotificationPermission === 'granted' ? 'notifications_active' : 'notifications'}
                      </span>
                      {deviceNotificationPermission === 'granted' ? 'Ativas (Testar)' : 'Ativar'}
                    </Button>
                  </div>
                  <hr className="border-border" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <span className="font-semibold text-sm block">Galaxy Watch</span>
                      <span className="text-xs text-muted-foreground">Parear relógio com a sua conta</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setIsProfileModalOpen(false); setIsWatchModalOpen(true); }} className="gap-1.5 shrink-0 self-start sm:self-auto">
                      <span className="material-symbols-rounded text-sm">watch</span>
                      Parear Relógio
                    </Button>
                  </div>

                  <hr className="border-border" />
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="font-semibold text-sm block">Google Calendar</span>
                      <span className="text-xs text-muted-foreground">
                        Mostre os eventos da sua agenda do Google aqui dentro, só leitura.
                      </span>
                    </div>
                    {googleConectadoEm ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Conectado desde {(() => {
                            try {
                              const d = new Date(googleConectadoEm);
                              return isNaN(d.getTime()) ? 'recente' : format(d, "d 'de' MMM 'de' yyyy", { locale: ptBR });
                            } catch {
                              return 'recente';
                            }
                          })()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-destructive"
                          onClick={() => disconnectGoogleCalendar(currentUser.cr4a1_usuarios_agendaid)}
                        >
                          Desconectar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => { window.location.href = `/api/google-oauth-start?userId=${currentUser.cr4a1_usuarios_agendaid}`; }}
                      >
                        Conectar com Google
                      </Button>
                    )}
                  </div>

                  {(hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('ADMIN')) && (
                    <>
                      <hr className="border-border" />
                      <div className="flex flex-col gap-2">
                        <div>
                          <span className="font-semibold text-sm block">Link de Agendamento</span>
                          <span className="text-xs text-muted-foreground">
                            Compartilhe com clientes para eles marcarem uma visita direto na sua agenda. Fica pendente até você confirmar.
                          </span>
                        </div>
                        {currentUser.cr4a1_link_agendamento ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input readOnly value={`${window.location.origin}/agendar/${currentUser.cr4a1_link_agendamento}`} className="flex-1 text-xs" onFocus={(e) => e.target.select()} />
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/agendar/${currentUser.cr4a1_link_agendamento}`);
                                toast.success('Link copiado!');
                              }}
                            >
                              Copiar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={isGeneratingLink}
                              onClick={async () => {
                                setIsGeneratingLink(true);
                                await gerarLinkAgendamento(currentUser.cr4a1_usuarios_agendaid);
                                setIsGeneratingLink(false);
                                toast.success('Novo link gerado! O link antigo deixou de funcionar.');
                              }}
                            >
                              Gerar novo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isGeneratingLink}
                            onClick={async () => {
                              setIsGeneratingLink(true);
                              await gerarLinkAgendamento(currentUser.cr4a1_usuarios_agendaid);
                              setIsGeneratingLink(false);
                            }}
                          >
                            {isGeneratingLink ? 'Gerando...' : 'Gerar meu link de agendamento'}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} groups={commandGroups} />

          <GoogleEventImportModal
            event={googleImportEvent}
            workspaces={workspaces}
            onClose={() => setGoogleImportEvent(null)}
            onConfirm={handleImportGoogleEvent}
          />

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
              onConfirmarVisita={confirmarVisita}
              onRecusarVisita={recusarVisita}
            />
          )}

          {dayTooltip && (
            <DayTooltip
              dayData={dayTooltip}
              allUsers={allUsers}
              eventTypes={eventTypes}
              onViewEvent={(ev, rect) => {
                setIsTooltipHovered(false);
                setDayTooltip(null);
                setDetailSourceRect(rect);
                setDetailEvent(ev);
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            />
          )}
        </div>

        {/* FAB */}
        {(hasRole('ADMIN') || hasRole('SECRETARIA') || hasRole('DIRETORIA') || hasRole('COORD') || hasRole('COMUM') || hasRole('COMERCIAL') || hasRole('COORD COMERCIAL') || hasRole('RH')) && (
          <>
            {isFabMenuOpen && (
              <div
                onClick={() => setIsFabMenuOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 2050,
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  backdropFilter: 'blur(2px)',
                  transition: 'opacity 0.15s ease'
                }}
              />
            )}
          <div className="fab-anchor" data-tutorial="fab-add" style={{ position: 'fixed', bottom: ['tasks', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : 'calc(24px + env(safe-area-inset-bottom, 0px))', zIndex: isFabMenuOpen ? 2100 : 500 }}>
            {isFabMenuOpen && (
              <div style={{ position: 'absolute', bottom: '80px', right: '0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', minWidth: '180px' }}>

                {!['visitas', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && (
                  <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Evento</span>
                    <button onClick={() => { setEditingEvent(null); setIsModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" title="Novo evento (N)" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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

                {(hasRole('ADMIN') || hasRole('RH')) && !['visitas', 'notas', 'bi', 'trello', 'passagens'].includes(appMode) && (
                  <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Workspace</span>
                    <button onClick={() => { setEditingWorkspace(null); setIsWorkspaceModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <span className="material-symbols-rounded">workspaces</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className="fab-btn boing-effect" onClick={() => { setIsFabMenuOpen(!isFabMenuOpen); }} style={{ width: '60px', height: '60px', borderRadius: '20px', background: isFabMenuOpen ? 'var(--bg-secondary)' : (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)'), color: isFabMenuOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '32px', transform: isFabMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>{isFabMenuOpen ? 'close' : 'add'}</span>
            </button>
          </div>
        </>
      )}

      </div>

      {/* BLOCO DE ESTILOS CSS INJETADO */}
      <style>{`
        @keyframes viewSlideIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
        .view-enter { animation: viewSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; will-change: opacity, transform; }
        
        .dropdown-item-select:hover {
            background-color: var(--bg-secondary) !important;
        }

        @media (max-width: 1024px) { .desktop-only { display: none !important; } .mobile-only { display: flex !important; } }
        @media (min-width: 1025px) { .mobile-only { display: none !important; } .desktop-only { display: flex !important; } }
        
        .boing-effect {
            transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
            touch-action: manipulation;
        }
        .boing-effect:active {
            transform: scale(0.96) !important;
            transition: transform 0.08s ease-out !important;
        }

        .app-header {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 6px 16px;
            min-height: 48px;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 2000;
            box-sizing: border-box;
            transition: padding 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
        }
        
        .app-header.is-compact {
            padding: 6px 16px;
            min-height: 48px;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
        }

        @media (min-width: 1025px) {
            .app-header.is-compact {
                width: calc(100% - 76px);
            }
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
            flex-wrap: nowrap;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
            flex-shrink: 0;
            flex-wrap: nowrap;
        }

        .header-profile {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .nav-label-collapse {
            display: inline-block;
            transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease;
            max-width: 150px;
            opacity: 1;
            overflow: hidden;
            white-space: nowrap;
        }
        
        .app-header.is-compact .nav-label-collapse {
            max-width: 0px;
            opacity: 0;
            margin: 0;
            padding: 0;
        }

        .main-container {
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            padding-left: 24px;
            padding-right: 24px;
            box-sizing: border-box;
        }

        .app-rail {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 76px;
            border: 0;
            border-left: 1px solid var(--border-color);
            border-top-left-radius: 24px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 16px 0;
            background: var(--bg-primary);
            overflow-y: auto;
            z-index: 1000;
        }

        .app-rail-item {
            width: 62px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 8px 0;
            border: none;
            border-radius: 16px;
            background: transparent;
            color: var(--text-primary);
            font: inherit;
            text-decoration: none;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }

        .app-rail-item:hover {
            background: var(--bg-secondary);
        }

        .app-rail-item .material-symbols-rounded {
            font-size: 24px;
        }

        .app-rail-label {
            font-size: 10px;
            font-weight: 600;
            line-height: 1.1;
            text-align: center;
        }

        .app-rail-divider {
            width: 36px;
            height: 1px;
            margin: 6px 0;
            background: var(--border-color);
        }

        .app-rail-app-icon {
            width: 24px;
            height: 24px;
            object-fit: contain;
        }

        .sidebar-collapsed-indicator {
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }


        .mini-month-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            width: 100%;
            box-sizing: border-box;
        }

        .mini-month-grid.visitas {
            grid-template-columns: repeat(2, 1fr);
        }

        .fab-anchor {
            right: calc(20px + env(safe-area-inset-right, 0px)) !important;
        }

        @media (min-width: 1025px) {
            .fab-anchor {
                right: calc(96px + env(safe-area-inset-right, 0px)) !important;
            }

            .main-container {
                margin-right: 76px;
            }

            .main-container.has-left-sidebar {
                margin-left: 24px;
            }
        }

        @media (max-width: 1024px) {
            .main-container,
            .main-container.has-left-sidebar {
                margin-left: 0 !important;
                margin-right: 0 !important;
                padding-left: 8px !important;
                padding-right: 8px !important;
                width: 100% !important;
                max-width: 100% !important;
            }
        }

                /* HEADER MOBILE REFACTOR (Padrão Galaxy S23 & Google Calendar) */
        @media (max-width: 900px) {
            .app-header.is-compact {
                display: grid !important;
                grid-template-columns: 1fr auto !important;
                grid-template-rows: auto auto !important;
                row-gap: 8px !important;
                column-gap: 8px !important;
                padding: 8px 10px !important;
                background: var(--bg-primary) !important;
                border-bottom: 1px solid var(--border-color) !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
                backdrop-filter: blur(12px) !important;
                position: sticky !important;
                top: 0 !important;
                z-index: 100 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            [data-theme='dark'] .app-header.is-compact {
                background: rgba(24, 24, 27, 0.95) !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
            }

            .header-brand {
                grid-row: 1 !important;
                grid-column: 1 !important;
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                min-width: 0 !important;
            }
            .header-brand .logo {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
            }
            .header-brand .logo .nav-label-collapse {
                display: inline-block !important;
                font-size: 16px !important;
                font-weight: 700 !important;
                color: var(--text-primary) !important;
            }

            .header-actions {
                grid-row: 1 !important;
                grid-column: 2 !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                justify-self: end !important;
            }
            .header-actions .header-desktop-actions {
                display: none !important;
            }
            .header-actions .profile-name {
                display: none !important;
            }

            .header-period-nav {
                grid-row: 2 !important;
                grid-column: 1 !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                min-width: 0 !important;
                overflow: hidden !important;
            }
            .header-period-nav .period-title-text {
                font-size: 15px !important;
                font-weight: 600 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 130px !important;
            }

            .header-view-controls {
                grid-row: 2 !important;
                grid-column: 2 !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                justify-self: end !important;
            }
            .header-view-controls button {
                height: 30px !important;
                font-size: 12px !important;
                padding: 0 10px !important;
            }
            .header-view-controls .segmented-views {
                display: none !important;
            }

            .mini-month-grid {
                grid-template-columns: 1fr !important;
            }
        }

        /* HEADER DESKTOP EXPANDED (Linha única Google Calendar flex) */
        @media (min-width: 901px) {
            .app-header.is-compact {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                padding: 6px 16px !important;
                gap: 12px !important;
                box-sizing: border-box !important;
            }
        }

        @media (min-width: 901px) and (max-width: 1024px) {
            .app-header.is-compact {
                width: 100% !important;
            }
        }

        @media (min-width: 1025px) {
            .app-header.is-compact {
                width: calc(100% - 76px) !important;
                margin-right: 76px !important;
            }
        }

        @media (min-width: 901px) {
            .header-brand {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                flex-shrink: 0 !important;
            }
            .header-period-nav {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                flex-shrink: 0 !important;
            }
            .header-period-nav .period-title-text {
                font-size: 18px !important;
                font-weight: 500 !important;
                white-space: nowrap !important;
            }
            .header-view-controls {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                margin-left: auto !important;
                flex-shrink: 0 !important;
            }
            .header-actions {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                flex-shrink: 0 !important;
            }
            .header-actions .header-desktop-actions {
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
        }

        .calendar-day-card.drop-over {
            background-color: var(--bg-tertiary) !important;
            box-shadow: inset 0 0 0 2px var(--text-accent);
            transition: background-color 0.15s, box-shadow 0.15s;
        }

        .mobile-only .powerapp-fab-container {
           z-index: 12000 !important;
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