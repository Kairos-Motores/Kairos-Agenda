import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { MapPin, ChevronsUpDown, Check } from 'lucide-react';
import { parseRoles } from '../utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';

const ACCENT = '#f57c00';

export const VisitaModal = ({ isOpen, onClose, onSave, currentUser, organizacoes = [], allUsers = [], hasRole, editingVisita, holidays }) => {
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
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [motivo, setMotivo] = useState(editingVisita?.cr4a1_motivo || '');
  const [visitante, setVisitante] = useState(editingVisita?.cr4a1_visitante || currentUser?.cr4a1_username);
  const [dataVisita, setDataVisita] = useState(getInitialDate());
  const [horaVisita, setHoraVisita] = useState(getInitialTime());
  const [periodo, setPeriodo] = useState(editingVisita?.cr4a1_periodo_visita || 0);
  const [filialFiltro, setFilialFiltro] = useState(editingVisita?.cr4a1_filial || currentUser?.cr4a1_unidade || 'Todas');

  const canAssign = hasRole('COORD COMERCIAL') || hasRole('ADMIN');
  const podeTrocarFilial = hasRole('COORD COMERCIAL') || hasRole('ADMIN');

  const unidades = ['Todas', 'São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

  const usuariosComerciais = useMemo(() => {
    return allUsers.filter(u => {
      const userRoles = parseRoles(u.cr4a1_role);
      const temRolePermitida = userRoles.includes('COMERCIAL') || userRoles.includes('COORD COMERCIAL') || userRoles.includes('ADMIN');
      return temRolePermitida || u.cr4a1_username === currentUser?.cr4a1_username;
    });
  }, [allUsers, currentUser]);

  const filteredOrgs = useMemo(() => {
    return organizacoes.filter(org => {
      const matchesUnit = filialFiltro === 'Todas' || !org.cr4a1_filial_origem || org.cr4a1_filial_origem === filialFiltro;
      const matchesSearch = !clienteSearch || org.cr4a1_novacoluna?.toLowerCase().includes(clienteSearch.toLowerCase());
      return matchesUnit && matchesSearch;
    });
  }, [organizacoes, clienteSearch, filialFiltro]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle><MapPin className="size-5" style={{ color: ACCENT }} /> {editingVisita ? 'Editar Visita' : 'Agendar Visita'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {podeTrocarFilial && (
            <div>
              <Label>Filtrar por Filial</Label>
              <Select value={filialFiltro} onValueChange={setFilialFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Cliente</Label>
            <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
                >
                  <span className={cliente ? '' : 'text-muted-foreground'}>{cliente || 'Selecione ou pesquise o cliente...'}</span>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command shouldFilter={false}>
                  <CommandInput value={clienteSearch} onValueChange={setClienteSearch} placeholder="Pesquisar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredOrgs.map(org => (
                        <CommandItem
                          key={org.cr4a1_id_org || org.cr4a1_echoe_organizacoesid || org.cr4a1_novacoluna}
                          onSelect={() => {
                            setCliente(org.cr4a1_novacoluna);
                            setClienteId(org.cr4a1_id_org || '');
                            setClientePopoverOpen(false);
                          }}
                        >
                          <Check className={`size-4 ${cliente === org.cr4a1_novacoluna ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                          {org.cr4a1_novacoluna}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Motivo da Visita</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Apresentação de propostas" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data Inicial</Label>
              <Input type="date" value={dataVisita} onChange={e => setDataVisita(e.target.value)} />
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={horaVisita} onChange={e => setHoraVisita(e.target.value)} />
            </div>
            <div>
              <Label>Período (dias úteis)</Label>
              <Input type="number" min="0" value={periodo} onChange={e => setPeriodo(e.target.value)} disabled={!!editingVisita} placeholder="0 = Única" />
            </div>
          </div>

          {canAssign && (
            <div>
              <Label>Delegar Visitante (Apenas Comerciais)</Label>
              <Select value={visitante} onValueChange={setVisitante}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {usuariosComerciais.map(u => (
                    <SelectItem key={u.cr4a1_username} value={u.cr4a1_username}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} style={{ background: ACCENT }}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
