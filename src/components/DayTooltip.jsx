import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DayTooltip = ({ dayData, allUsers, onViewEvent, onMouseEnter, onMouseLeave }) => {
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
              onClick={(e) => onViewEvent(ev, e.currentTarget.getBoundingClientRect())}
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
