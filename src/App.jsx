import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { BI_CONFIG } from './config/biConfig';
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
import { EventDetailModal } from './components/EventDetailModal';
import { BirthdayCelebration } from './components/BirthdayCelebration';
import { WhatsAppInput } from './components/WhatsAppInput';
import { DraggableEvent, DroppableDay } from './components/DragDropHelpers';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { VisitaModal } from './components/VisitaModal';
import { FilialTemporariaModal } from './components/FilialTemporariaModal';
import { DayVisitasModal } from './components/DayVisitasModal';
import { DayTooltip } from './components/DayTooltip';
import { materialColors } from './constants/materialColors';
import { compressImage } from './utils/compressImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Checkbox } from './components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/ui/select';

const DashboardPanel = React.lazy(() => import('./components/DashboardPanel').then(m => ({ default: m.DashboardPanel })));
const NotesPanel = React.lazy(() => import('./components/NotesPanel').then(m => ({ default: m.NotesPanel })));
const SsmaPanel = React.lazy(() => import('./components/SsmaPanel').then(m => ({ default: m.SsmaPanel })));
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

function App() {
  const {
    view, setView, currentDate, setCurrentDate, holidays, events, addEvent, updateEvent, deleteEvent, notification,
    getEventsForDay, next, prev, user, userRole, viewedUser, setViewedUser, allUsers, eventTypes, addEventType, updateEventType, deleteEventType, login, logout, loading, isValidatingSession, updateUserColor, filters, setFilters, filteredEvents, moveEvent,
    updateWhatsApp, addWorkspace, updateWorkspace, updateUnit, updateProfile, updateUserRoles, adicionarUsuarioAoCalendarioComum, addUser, deleteUser,
    workspaces, activeWorkspaces, toggleWorkspaceFilter,
    organizacoes = [], visitas = [], addVisitas, updateVisitas, atualizarFilialTemporaria,
    ssmaAtividades = [], ssmaGastos = [], ssmaIndicadores = [], addSsmaAtividade, updateSsmaAtividade, deleteSsmaAtividade, addSsmaGasto, updateSsmaGasto, deleteSsmaGasto,
    addSsmaIndicador, updateSsmaIndicador, deleteSsmaIndicador,
    notas = [], addNota, updateNota, deleteNota
  } = useCalendar();

  const roles = useMemo(() => parseRoles(userRole), [userRole]);
  const hasRole = (role) => roles.includes('ADMIN') || roles.includes(role);

  const viewsConfig = useMemo(() => [
    { id: 'year', label: 'Ano', icon: 'calendar_view_month' },
    { id: 'month', label: 'Mês', icon: 'calendar_month' },
    { id: 'week', label: 'Semana', icon: 'view_week' },
    { id: '3days', label: '3 Dias', icon: 'view_timeline' },
    { id: 'day', label: 'Dia', icon: 'view_day' }
  ], []);

  // --- NOVOS ESTADOS DE BUSCA NO MENU SANDUÍCHE ---
  const [workspaceSearchTerm, setWorkspaceSearchTerm] = useState('');
  const [userUnitFilter, setUserUnitFilter] = useState('Todas');

  const availableUserUnits = useMemo(() => {
    const unitsSet = new Set(allUsers.map(u => u.cr4a1_unidade).filter(Boolean));
    return ['Todas', ...Array.from(unitsSet)].sort();
  }, [allUsers]);

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

    if (!draggedEvent.isVisitaPrincipal && !draggedEvent.isIntervalo) {
      moveEvent(draggableId, newDateStr);
      return;
    }
  };

  const notifiedRef = useRef(new Set());
  const [appMode, setAppMode] = useState(() => localStorage.getItem('kairos_app_mode') || 'calendar');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingVisita, setEditingVisita] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [detailSourceRect, setDetailSourceRect] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [preselectedTargetUser, setPreselectedTargetUser] = useState('');
  const [preselectedWorkspaceId, setPreselectedWorkspaceId] = useState('');
  const [isDraggingMember, setIsDraggingMember] = useState(false);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [dayViewMode, setDayViewMode] = useState('timeline');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('kairos_accent_color') || '#1a73e8');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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
    const clockTimer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(clockTimer);
  }, []);

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
    localStorage.setItem('kairos_app_mode', appMode);
  }, [appMode]);

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
            if (view === '3days') return subDays(prev, 3);
            if (view === 'day') return subDays(prev, 1);
            return subMonths(prev, 1);
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentDate(prev => {
            if (view === 'year') return addYears(prev, 1);
            if (view === 'week') return addDays(prev, 7);
            if (view === '3days') return addDays(prev, 3);
            if (view === 'day') return addDays(prev, 1);
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
        case '1': setView('year'); break;
        case '2': setView('month'); break;
        case '3': setView('week'); break;
        case '4': setView('3days'); break;
        case '5': setView('day'); break;
        case '6': setView('list'); break;
        default: break;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [view, setCurrentDate, setView, setEditingEvent]);

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

  const handleViewEvent = (event, rect) => {
    if (event.isVisitaPrincipal || event.isIntervalo) { handleEditClick(event); return; }
    setDetailSourceRect(rect);
    setDetailEvent(event);
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
          toastOptions={{
            style: {
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
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

              {(hasRole('ADMIN') || hasRole('COORD SSMA') || hasRole('SSMA')) && (
                <button onClick={() => { setAppMode('ssma'); setIsSidebarOpen(false); }} className="nav-pill boing-effect" style={{
                  justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  backgroundColor: appMode === 'ssma' ? '#e8f5e9' : 'transparent',
                  color: appMode === 'ssma' ? '#2e7d32' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded">health_and_safety</span> SSMA
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Vistas do Calendário</div>
              {viewsConfig.map(v => (
                <button key={v.id} onClick={() => { setView(v.id); setIsSidebarOpen(false); if (['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) setAppMode('calendar'); }} className="nav-pill boing-effect" style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                  fontWeight: (view === v.id && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? '700' : '500', backgroundColor: (view === v.id && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? 'var(--bg-tertiary)' : 'transparent', color: (view === v.id && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)', transition: 'all 0.2s'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{v.icon}</span> {v.label}
                </button>
              ))}
              <button onClick={() => { setView('list'); setIsSidebarOpen(false); if (['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) setAppMode('calendar'); }} className="nav-pill boing-effect" style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '15px', justifyContent: 'flex-start',
                fontWeight: (view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? '700' : '500', backgroundColor: (view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? 'var(--bg-tertiary)' : 'transparent', color: (view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)', transition: 'all 0.2s'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>view_agenda</span> Fichas
              </button>
            </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Cor do Tema</div>
              <div className="grid grid-cols-5 gap-2.5">
                {materialColors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setAccentColor(c.hex)}
                    title={c.label}
                    aria-label={c.label}
                    className="mx-auto size-9 rounded-full transition-transform duration-200 active:scale-90"
                    style={{
                      backgroundColor: c.hex,
                      boxShadow: accentColor === c.hex ? `0 0 0 3px var(--bg-primary), 0 0 0 5px ${c.hex}` : '0 2px 5px rgba(0,0,0,0.1)',
                      transform: accentColor === c.hex ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>

            {!['visitas', 'notas', 'bi', 'ssma'].includes(appMode) && (
              <>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Pesquisa</div>
                  <Input placeholder="Procurar evento..." value={filters.text} onChange={e => setFilters({ ...filters, text: e.target.value })} />
                </div>

                <div data-tutorial="workspaces-list">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Workspaces</div>
                  </div>
                  {/* Nova barra de pesquisa de workspaces */}
                  <Input
                    placeholder="Procurar workspace..."
                    value={workspaceSearchTerm}
                    onChange={e => setWorkspaceSearchTerm(e.target.value)}
                    className="mb-3"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {workspaces.filter(ws => ws.cr4a1_nome && ws.cr4a1_nome.toLowerCase().includes(workspaceSearchTerm.toLowerCase())).map(ws => (
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
                      const matchesSearch = u.cr4a1_username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        (u.cr4a1_nome_exibicao && u.cr4a1_nome_exibicao.toLowerCase().includes(userSearchTerm.toLowerCase()));
                      const matchesUnit = userUnitFilter === 'Todas' || u.cr4a1_unidade === userUnitFilter;

                      if (hasRole('COMUM') && !hasRole('ADMIN')) return matchesSearch && matchesUnit && u.cr4a1_unidade === currentUser?.cr4a1_unidade;
                      return matchesSearch && matchesUnit;
                    }).map(u => (
                      <label key={u.cr4a1_username} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', padding: '4px 0' }}>
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
          </div>
        </div>

        {/* HEADER FLEXÍVEL E INTELIGENTE */}
        <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>

          <div className="header-left">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} data-tutorial="menu-toggle" aria-label="Abrir menu">
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>menu</span>
            </Button>
            <h1 className="logo boing-effect" onClick={() => { setView('month'); setCurrentDate(new Date()); setAppMode('calendar'); }} style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: appMode === 'ssma' ? '#2e7d32' : (appMode === 'visitas' ? '#f57c00' : (appMode === 'notas' || appMode === 'bi' ? '#f57c00' : 'var(--text-accent)')), fontSize: '28px' }}>
                {appMode === 'ssma' ? 'health_and_safety' : (appMode === 'visitas' ? 'location_on' : (appMode === 'notas' ? 'description' : (appMode === 'bi' ? 'bar_chart' : 'calendar_month')))}
              </span>
              <span className="nav-label-collapse">{appMode === 'ssma' ? 'SSMA' : (appMode === 'visitas' ? 'Visitas' : (appMode === 'notas' ? 'Notas' : (appMode === 'bi' ? 'Painéis BI' : 'Kairós')))}</span>
            </h1>

            <div className="segmented-views" style={{
              display: 'inline-flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '100px', padding: '4px', alignItems: 'center', gap: '2px', boxSizing: 'border-box'
            }}>
              {viewsConfig.map(v => {
                const isActive = view === v.id && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode);
                return (
                  <button
                    key={v.id}
                    onClick={() => { setView(v.id); if (['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) setAppMode('calendar'); }}
                    className={`boing-effect ${isActive ? 'active' : ''}`}
                    title={`${v.label} (${viewsConfig.indexOf(v) + 1})`}
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
              onClick={() => { setView('list'); if (['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) setAppMode('calendar'); }}
              className={`boing-effect ${view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode) ? 'active' : ''}`}
              title="Fichas (6)"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '100px',
                border: (view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? `1px solid ${appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)'}` : '1px solid var(--border-color)',
                background: (view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: (view === 'list' && !['tasks', 'notas', 'bi', 'ssma'].includes(appMode)) ? (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)') : 'var(--text-primary)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>view_agenda</span>
              <span className="nav-label-collapse">Fichas</span>
            </button>

            {((appMode === 'visitas' && (hasRole('COORD COMERCIAL') || hasRole('ADMIN'))) ||
              (appMode === 'calendar' && (hasRole('RH') || hasRole('ADMIN') || hasRole('QUALIDADE')))) && (
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

          <div className="header-profile" data-tutorial="profile">
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
            <Button variant="ghost" size="icon" onClick={logout} title="Sair do sistema" className="text-destructive hover:text-destructive">
              <span className="material-symbols-rounded">logout</span>
            </Button>
          </div>

          <div className="header-bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')} aria-label="Período anterior" title="Período anterior (←)">
                <span className="material-symbols-rounded">chevron_left</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} title="Ir para hoje (T)">Hoje</Button>
              <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')} aria-label="Próximo período" title="Próximo período (→)">
                <span className="material-symbols-rounded">chevron_right</span>
              </Button>
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
              <div
                onClick={() => setCurrentDate(new Date())}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCurrentDate(new Date()); } }}
                role="button"
                tabIndex={0}
                className="today-badge boing-effect"
                title="Ir para hoje (T)"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', height: '36px', borderRadius: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--text-accent)' }}>today</span>
                <span style={{ textTransform: 'capitalize' }}>{format(now, "EEE, d 'de' MMM", { locale: ptBR })}</span>
                <span style={{ width: '1px', height: '12px', background: 'var(--border-color)' }} />
                <span>{format(now, 'HH:mm')}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={requestNotificationPermission} title="Ativar Notificações">
                <span className="material-symbols-rounded">notifications</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'} title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}>
                <span className="material-symbols-rounded">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsTutorialOpen(true)} data-tutorial="tutorial-trigger" title="Tutorial guiado">
                <span className="material-symbols-rounded">help</span>
              </Button>
              {(hasRole('ADMIN') || hasRole('SECRETARIA')) && (
                <Button variant="ghost" size="icon" onClick={() => setIsUserManagementModalOpen(true)} title="Gerir Utilizadores">
                  <span className="material-symbols-rounded">group</span>
                </Button>
              )}
            </div>

            {!['tasks', 'notas', 'bi', 'ssma'].includes(appMode) && view === 'day' && (
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
          {isDevWorkspaceActive && !['visitas', 'notas', 'bi', 'ssma'].includes(appMode) && (
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

          <main className="main-container" style={{
            flex: 1,
            padding: ['tasks', 'notas', 'bi', 'ssma'].includes(appMode) ? '24px' : (['day', '3days', 'week'].includes(view) ? '0' : '24px'),
            paddingBottom: '80px',
            overflow: 'visible',
            marginLeft: (isDevWorkspaceActive && !['visitas', 'notas', 'bi', 'ssma'].includes(appMode)) ? '24px' : '0',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>

            <div key={appMode} className="view-enter" style={{ width: '100%', height: '100%' }}>
              {appMode === 'bi' ? (
                <React.Suspense fallback={null}>
                  <DashboardPanel
                    activeWorkspaces={workspaces.filter(ws => activeWorkspaces.includes(ws.cr4a1_calendarios_workspacesid))}
                    userRole={userRole}
                    biConfig={BI_CONFIG}
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
                    workspaces={workspaces}
                    activeWorkspaces={activeWorkspaces}
                  />
                </React.Suspense>
              ) : appMode === 'ssma' ? (
                <React.Suspense fallback={null}>
                  <SsmaPanel
                    currentUser={currentUser}
                    hasRole={hasRole}
                    allUsers={allUsers}
                    ssmaAtividades={ssmaAtividades}
                    ssmaGastos={ssmaGastos}
                    ssmaIndicadores={ssmaIndicadores}
                    addSsmaAtividade={addSsmaAtividade}
                    updateSsmaAtividade={updateSsmaAtividade}
                    deleteSsmaAtividade={deleteSsmaAtividade}
                    addSsmaGasto={addSsmaGasto}
                    updateSsmaGasto={updateSsmaGasto}
                    deleteSsmaGasto={deleteSsmaGasto}
                    addSsmaIndicador={addSsmaIndicador}
                    updateSsmaIndicador={updateSsmaIndicador}
                    deleteSsmaIndicador={deleteSsmaIndicador}
                  />
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
                                    const eventAssignees = parseAssignees(e.cr4a1_user_login);
                                    const eventColor = e.cr4a1_cor || getEventColor(e);
                                    const typeLayer = getEventTypeLayer(e.cr4a1_tipo, eventTypes);
                                    let badgeStyle = {
                                      borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', overflow: 'hidden',
                                      width: '100%', boxSizing: 'border-box', fontSize: '11px', fontWeight: '600', padding: '2px 4px',
                                      color: '#fff', background: eventColor, opacity: 1, border: '1px solid rgba(255,255,255,0.2)',
                                      ...(typeLayer.layer === 'borda' ? typeLayerBorderStyle(typeLayer.color) : {}),
                                      ...(typeLayer.layer === 'padrao' ? typeLayerPatternStyle(typeLayer.color) : {}),
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
                                          onClick={(ev) => { ev.stopPropagation(); handleViewEvent(e, ev.currentTarget.getBoundingClientRect()); }}
                                          style={badgeStyle}
                                        >
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                            {typeLayer.layer === 'icone' && typeLayer.emoji && <span style={{ marginRight: '3px' }}>{typeLayer.emoji}</span>}
                                            {!e.cr4a1_dia_inteiro && <span style={{ fontWeight: '700', marginRight: '3px' }}>{e.cr4a1_hora_inicio}</span>}
                                            {e.cr4a1_privado ? '🔒 ' : ''}{e.cr4a1_titulo}
                                          </span>
                                          {eventAssignees.length > 1 && (
                                            <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }} title={eventAssignees.join(', ')}>
                                              {eventAssignees.slice(0, 3).map((u, i) => (
                                                <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: allUsers.find(au => au.cr4a1_username === u)?.cr4a1_cor || 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.8)' }} />
                                              ))}
                                            </span>
                                          )}
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

                  {view === 'list' && <ListView events={getDisplayEvents()} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleViewEvent} onDelete={(e) => { setEventToDelete(e); setIsDeleteModalOpen(true); }} workspaces={appMode === 'visitas' ? [] : workspaces} viewMode={listViewMode} onViewModeChange={setListViewMode} />}

                  {['day', '3days', 'week'].includes(view) && (
                    <DayView selectedDate={currentDate} viewType={view} getEventsForDay={handleGetEventsForDay} holidays={holidays} allUsers={allUsers} eventTypes={eventTypes} onEdit={handleViewEvent} dayViewMode={dayViewMode} />
                  )}
                </>
              )}
            </div>
          </main>

          {/* BARRA POWERAPPS LATERAL DIREITA FIXA (DESKTOP) */}
          <aside className="powerapps-sidebar desktop-only">
            <div className="sidebar-collapsed-indicator">
              <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)', fontSize: '24px' }}>apps</span>
            </div>
            <div className="sidebar-expanded-content">
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
          <aside className="right-menu-sidebar desktop-only" data-tutorial="nav-modes-desktop">
            <div className="sidebar-collapsed-indicator">
              <span className="material-symbols-rounded" style={{ color: 'var(--text-accent)', fontSize: '24px' }}>side_navigation</span>
            </div>
            <div className="sidebar-expanded-content">
              <button onClick={() => setAppMode('calendar')} className={`boing-effect ${appMode === 'calendar' ? 'active' : ''}`} title="Agenda" style={{
                width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: appMode === 'calendar' ? 'var(--bg-tertiary)' : 'transparent', color: appMode === 'calendar' ? 'var(--text-accent)' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>calendar_month</span>
              </button>

              <button onClick={() => setAppMode('notas')} className={`boing-effect ${appMode === 'notas' ? 'active' : ''}`} title="Notas da Equipa" style={{
                width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: appMode === 'notas' ? '#ffe0b2' : 'transparent', color: appMode === 'notas' ? '#f57c00' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>description</span>
              </button>

              {/* NOVO: Botão BI na barra direita */}
              <button onClick={() => setAppMode('bi')} className={`boing-effect ${appMode === 'bi' ? 'active' : ''}`} title="Painéis BI" style={{
                width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: appMode === 'bi' ? '#fff3e0' : 'transparent', color: appMode === 'bi' ? '#f57c00' : 'var(--text-primary)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>bar_chart</span>
              </button>

              {(hasRole('ADMIN') || hasRole('COORD SSMA') || hasRole('SSMA')) && (
                <button onClick={() => setAppMode('ssma')} className={`boing-effect ${appMode === 'ssma' ? 'active' : ''}`} title="SSMA" style={{
                  width: '44px', height: '44px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: appMode === 'ssma' ? '#e8f5e9' : 'transparent', color: appMode === 'ssma' ? '#2e7d32' : 'var(--text-primary)'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>health_and_safety</span>
                </button>
              )}

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
          {isUserManagementModalOpen && <UserManagementModal isOpen={isUserManagementModalOpen} onClose={() => setIsUserManagementModalOpen(false)} allUsers={allUsers} updateUserColor={updateUserColor} eventTypes={eventTypes} addEventType={addEventType} updateEventType={updateEventType} deleteEventType={deleteEventType} isAdmin={hasRole('ADMIN')} updateUserRoles={updateUserRoles} addUser={addUser} deleteUser={deleteUser} currentUsername={user} />}
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
                        aniversario: document.getElementById('b-up')?.value || currentUser.cr4a1_aniversario,
                        foto: res
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Nome de Exibição</Label>
                    <Input type="text" defaultValue={currentUser.cr4a1_nome_exibicao || user} id="n-up" />
                  </div>

                  <div>
                    <Label>Aniversário</Label>
                    <Input type="date" defaultValue={currentUser.cr4a1_aniversario ? currentUser.cr4a1_aniversario.split('T')[0] : ''} id="b-up" />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => updateProfile(currentUser.cr4a1_usuarios_agendaid, {
                      nomeExibicao: document.getElementById('n-up').value,
                      aniversario: document.getElementById('b-up').value,
                      foto: currentUser.cr4a1_foto
                    })}
                  >
                    Salvar Dados do Perfil
                  </Button>

                  <hr className="border-border" />

                  <WhatsAppInput userId={currentUser.cr4a1_usuarios_agendaid} initialValue={currentUser.cr4a1_whatsapp} onSave={updateWhatsApp} />
                </div>
              )}
            </DialogContent>
          </Dialog>

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
          <div data-tutorial="fab-add" style={{ position: 'fixed', bottom: ['tasks', 'notas', 'bi', 'ssma'].includes(appMode) ? '80px' : '24px', right: '24px', zIndex: isFabMenuOpen ? 2100 : 500 }}>
            {isFabMenuOpen && (
              <div style={{ position: 'absolute', bottom: '80px', right: '0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', minWidth: '180px' }}>

                {!['visitas', 'notas', 'bi', 'ssma'].includes(appMode) && (
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

                {(hasRole('ADMIN') || hasRole('RH')) && !['visitas', 'notas', 'bi', 'ssma'].includes(appMode) && (
                  <div className="view-enter" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}>Workspace</span>
                    <button onClick={() => { setEditingWorkspace(null); setIsWorkspaceModalOpen(true); setIsFabMenuOpen(false); }} className="boing-effect" style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <span className="material-symbols-rounded">workspaces</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className="fab-btn boing-effect" onClick={() => { setIsFabMenuOpen(!isFabMenuOpen); setIsPowerAppsFabOpen(false); }} style={{ width: '60px', height: '60px', borderRadius: '20px', background: isFabMenuOpen ? 'var(--bg-secondary)' : (appMode === 'visitas' ? '#f57c00' : 'var(--text-accent)'), color: isFabMenuOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '32px', transform: isFabMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>{isFabMenuOpen ? 'close' : 'add'}</span>
            </button>
          </div>
        )}

        {/* POWERAPPS FAB (MOBILE ONLY) */}
        <div className="mobile-only" style={{ position: 'fixed', bottom: '32px', left: '32px', zIndex: isPowerAppsFabOpen ? 2100 : 400, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
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
          <button className="boing-effect" onClick={() => { setIsPowerAppsFabOpen(!isPowerAppsFabOpen); setIsFabMenuOpen(false); }} style={{ animation: 'fabEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) backwards', width: '60px', height: '60px', borderRadius: '20px', background: isPowerAppsFabOpen ? 'var(--bg-secondary)' : 'var(--text-accent)', color: isPowerAppsFabOpen ? 'var(--text-primary)' : 'white', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

        .main-container {
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            padding-left: 24px;
            padding-right: 24px;
            box-sizing: border-box;
        }

        .right-menu-sidebar, .powerapps-sidebar {
            position: fixed;
            right: 12px;
            transform: translateY(-50%);
            width: 56px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 28px;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px 0;
            gap: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            z-index: 1000;
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
            max-height: 56px;
        }

        .right-menu-sidebar { top: 35%; }
        .powerapps-sidebar { top: 65%; }

        .right-menu-sidebar:hover, .powerapps-sidebar:hover {
            max-height: 400px;
            width: 64px;
            border-radius: 32px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            background: var(--bg-secondary);
        }

        .sidebar-collapsed-indicator {
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .right-menu-sidebar:hover .sidebar-collapsed-indicator,
        .powerapps-sidebar:hover .sidebar-collapsed-indicator {
            transform: scale(0.8) translateY(-5px);
            opacity: 0.5;
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

        @media (min-width: 1025px) {
            .main-container {
                margin-right: 80px;
            }
        }

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