import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFocusTrap } from '../hooks/useFocusTrap';

const MODAL_WIDTH = 480;
const MODAL_HEIGHT = 560;
const TRANSITION = '0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';

// Modal de leitura de um evento, que "cresce" a partir do card/linha clicada
// (container transform) em vez de simplesmente aparecer. Só mostra os dados;
// quem chama decide o que "Editar" faz (normalmente abrir o EventModal real).
export const EventDetailModal = ({ event, sourceRect, allUsers = [], workspaces = [], onClose, onEdit }) => {
  const trapRef = useFocusTrap(!!event);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!event) return;
    setIsClosing(false);
    setIsExpanded(false);
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setIsExpanded(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [event]);

  useEffect(() => {
    if (!event) return;
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (!event) return null;

  const handleClose = () => {
    setIsExpanded(false);
    setIsClosing(true);
    setTimeout(() => onClose(), 340);
  };

  const workspace = workspaces.find(w => w.cr4a1_calendarios_workspacesid === event.cr4a1_workspace_id);
  const responsavel = allUsers.find(u => u.cr4a1_username === event.cr4a1_user_login);
  const accentColor = event.cr4a1_cor || responsavel?.cr4a1_cor || workspace?.cr4a1_cor_hex || 'var(--text-accent)';

  let subtasks = [];
  try { subtasks = event.cr4a1_subtasks ? (typeof event.cr4a1_subtasks === 'string' ? JSON.parse(event.cr4a1_subtasks) : event.cr4a1_subtasks) : []; } catch { subtasks = []; }
  let files = [];
  try { files = event.cr4a1_arquivos ? (typeof event.cr4a1_arquivos === 'string' ? JSON.parse(event.cr4a1_arquivos) : event.cr4a1_arquivos) : []; } catch { files = []; }
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try { return format(new Date(dateStr.split('T')[0] + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR }); }
    catch { return dateStr; }
  };

  const sameDay = event.cr4a1_data_inicio === event.cr4a1_data_fim;
  const details = event.cr4a1_detalhes || event.cr4a1_descricao || '';

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const finalWidth = Math.min(MODAL_WIDTH, viewportW - 32);
  const finalHeight = Math.min(MODAL_HEIGHT, viewportH - 32);
  const finalTop = (viewportH - finalHeight) / 2;
  const finalLeft = (viewportW - finalWidth) / 2;
  const start = sourceRect || { top: finalTop, left: finalLeft, width: finalWidth, height: finalHeight };
  const grown = isExpanded && !isClosing;

  const cardStyle = {
    position: 'fixed',
    top: grown ? finalTop : start.top,
    left: grown ? finalLeft : start.left,
    width: grown ? finalWidth : start.width,
    height: grown ? finalHeight : start.height,
    borderRadius: grown ? '28px' : '10px',
    transition: `top ${TRANSITION}, left ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}, border-radius ${TRANSITION}`,
    background: 'var(--bg-primary)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    border: '1px solid var(--border-color)',
    borderLeft: `5px solid ${accentColor}`,
    overflow: 'hidden',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  };

  return ReactDOM.createPortal(
    <div data-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,12,16,0.55)', opacity: grown ? 1 : 0, transition: 'opacity 0.3s ease', cursor: 'pointer' }} />

      <div ref={trapRef} tabIndex={-1} style={cardStyle}>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, opacity: grown ? 1 : 0, transition: 'opacity 0.25s ease 0.1s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: accentColor, background: `${accentColor}1f`, padding: '4px 10px', borderRadius: '8px' }}>
                  {event.cr4a1_tipo || 'Evento'}
                </span>
                {event.cr4a1_privado && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#f57c00', background: '#fff3e01f', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>lock</span> Privado
                  </span>
                )}
                {workspace && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '8px' }}>
                    {workspace.cr4a1_nome}
                  </span>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: '21px', fontWeight: '800', color: 'var(--text-title)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                {event.cr4a1_titulo || 'Sem título'}
              </h2>
            </div>
            <button onClick={handleClose} className="icon-btn boing-effect" aria-label="Fechar" style={{ flexShrink: 0 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '19px', color: 'var(--text-secondary)', marginTop: '1px' }}>calendar_month</span>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {formatDateLabel(event.cr4a1_data_inicio)}
                {!sameDay && event.cr4a1_data_fim && <> até {formatDateLabel(event.cr4a1_data_fim)}</>}
                {!event.cr4a1_dia_inteiro && event.cr4a1_hora_inicio && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'none' }}>
                    {event.cr4a1_hora_inicio} - {event.cr4a1_hora_fim}
                  </div>
                )}
              </div>
            </div>

            {responsavel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '19px', color: 'var(--text-secondary)' }}>person</span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{responsavel.cr4a1_nome_exibicao || responsavel.cr4a1_username}</span>
              </div>
            )}

            {details && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '19px', color: 'var(--text-secondary)', marginTop: '1px' }}>notes</span>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{details}</p>
              </div>
            )}

            {subtasks.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '12px 14px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>Checklist</span>
                  <span>{completedSubtasks}/{subtasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {subtasks.map((task, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '16px', color: task.completed ? '#34a853' : 'var(--border-strong)' }}>
                        {task.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span style={{ color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {files.map((file, i) => (
                  <a key={i} href={file.base64} download={file.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-accent)', textDecoration: 'none', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>description</span>
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
            <button onClick={handleClose} className="btn-secondary boing-effect" style={{ flex: 1 }}>Fechar</button>
            <button onClick={() => onEdit(event)} className="btn-primary boing-effect" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span> Editar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
