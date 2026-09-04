import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowLeftRight } from 'lucide-react';
import { parseRoles } from '../utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const UNITS = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

export const FilialTemporariaModal = ({ isOpen, onClose, allUsers, onSave, mostrarTodos = false }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [unidade, setUnidade] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const usuariosDisponiveis = useMemo(() => {
    if (mostrarTodos) return allUsers;
    return allUsers.filter(u => parseRoles(u.cr4a1_role).includes('COMERCIAL'));
  }, [allUsers, mostrarTodos]);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><ArrowLeftRight className="size-5 text-primary" /> Filial Temporária {mostrarTodos ? '(Todos)' : '(Comercial)'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Selecionar {mostrarTodos ? 'Funcionário' : 'Comercial'}</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger><SelectValue placeholder="Selecione um profissional..." /></SelectTrigger>
              <SelectContent>
                {usuariosDisponiveis.map(u => (
                  <SelectItem key={u.cr4a1_usuarios_agendaid} value={u.cr4a1_usuarios_agendaid}>
                    {u.cr4a1_nome_exibicao || u.cr4a1_username} ({u.cr4a1_unidade || 'Sem unidade'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Filial de Destino Temporário</Label>
            <Select value={unidade} onValueChange={setUnidade}>
              <SelectTrigger><SelectValue placeholder="Selecione a nova filial..." /></SelectTrigger>
              <SelectContent>
                {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={fim} onChange={e => setFim(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleApply}>Aplicar Viagem</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
