import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

export const GoogleEventImportModal = ({ event, workspaces = [], onClose, onConfirm }) => {
    const [workspaceId, setWorkspaceId] = useState('');
    const [importando, setImportando] = useState(false);

    const handleConfirm = async () => {
        if (!workspaceId) return;
        setImportando(true);
        try {
            await onConfirm(workspaceId);
        } finally {
            setImportando(false);
        }
    };

    return (
        <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle><CalendarPlus className="size-5" style={{ color: '#4285F4' }} /> Importar do Google Calendar</DialogTitle>
                </DialogHeader>

                {event && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-border bg-secondary p-3">
                            <div className="text-sm font-bold text-foreground">{event.cr4a1_titulo}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                {format(new Date(`${event.cr4a1_data_inicio}T12:00:00`), "d 'de' MMMM", { locale: ptBR })}
                                {event.cr4a1_dia_inteiro ? ' · dia inteiro' : (event.cr4a1_hora_inicio ? ` · ${event.cr4a1_hora_inicio}` : '')}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-primary">Workspace (obrigatório)</label>
                            <Select value={workspaceId} onValueChange={setWorkspaceId}>
                                <SelectTrigger><SelectValue placeholder="Selecione um workspace..." /></SelectTrigger>
                                <SelectContent>
                                    {workspaces.map(ws => (
                                        <SelectItem key={ws.cr4a1_calendarios_workspacesid} value={ws.cr4a1_calendarios_workspacesid}>{ws.cr4a1_nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Isso cria uma cópia deste evento na Kairós Agenda, no workspace escolhido. A cópia não fica ligada ao Google — pode ser editada e compartilhada normalmente.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button disabled={!workspaceId || importando} onClick={handleConfirm}>
                        {importando ? 'Importando...' : 'Importar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
