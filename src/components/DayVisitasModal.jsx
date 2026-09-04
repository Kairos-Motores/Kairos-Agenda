import { CalendarClock, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';

export const DayVisitasModal = ({ isOpen, onClose, visitas, onEditVisita, allUsers = [] }) => {
  const isReallyOpen = !!(isOpen && visitas && visitas.length > 0);

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
    <Dialog open={isReallyOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle><CalendarClock className="size-5 text-[#f57c00]" /> Visitas do Dia</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {visitas?.map((v, idx) => (
            <div
              key={v.cr4a1_agenda_kairosid || idx}
              onClick={() => {
                onEditVisita(v);
                onClose();
              }}
              className="boing-effect flex flex-col gap-2 rounded-2xl border border-border bg-secondary p-4 cursor-pointer transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold" style={{ color: 'var(--text-title)' }}>
                  {v.cr4a1_titulo.replace('📍 Visita: ', '')}
                </div>
                <Badge className="shrink-0" style={{ background: '#fff3e0', color: '#f57c00' }}>
                  <Clock className="size-[14px]" />
                  {getVisitaTime(v)}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <User className="size-4" />
                {getUserName(v.cr4a1_user_login)}
              </div>

              {(v.originalData?.cr4a1_motivo || v.originalData?.cr4a1_filial) && (
                <div className="mt-1 border-t border-border pt-2 text-xs text-muted-foreground">
                  {v.originalData?.cr4a1_motivo && (
                    <div className="mb-1"><strong>Motivo:</strong> {v.originalData.cr4a1_motivo}</div>
                  )}
                  {v.originalData?.cr4a1_filial && (
                    <div><strong>Unidade:</strong> {v.originalData.cr4a1_filial}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
