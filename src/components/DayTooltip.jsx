import React, { useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseAssignees } from '../utils/assignees';
import { getEventTypeLayer } from '../utils/eventTypeLayer';

const VIEWPORT_PADDING = 12;
const GAP = 8;

export const DayTooltip = ({ dayData, allUsers, eventTypes = [], onViewEvent, onMouseEnter, onMouseLeave }) => {
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const dateStr = dayData?.dateStr;
  const events = dayData?.events || [];
  const rect = dayData?.rect;

  useLayoutEffect(() => {
    if (!dayData || !rect || !tooltipRef.current) {
      setCoords(null);
      return;
    }

    const el = tooltipRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(el.offsetWidth || 280, vw - VIEWPORT_PADDING * 2);

    const spaceBelow = vh - rect.bottom - GAP - VIEWPORT_PADDING;
    const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;

    // Mede altura natural somando cabeçalho + altura total da lista rolável + paddings
    const card = el.firstElementChild;
    const headerH = card?.firstElementChild?.offsetHeight || 36;
    const listH = card?.lastElementChild?.scrollHeight || el.scrollHeight;
    const naturalHeight = headerH + listH + 38;
    let top;
    let maxHeight;

    if (naturalHeight <= spaceBelow) {
      top = rect.bottom + GAP;
      maxHeight = spaceBelow;
    } else if (naturalHeight <= spaceAbove) {
      top = rect.top - GAP - naturalHeight;
      maxHeight = spaceAbove;
    } else if (spaceBelow >= spaceAbove) {
      top = rect.bottom + GAP;
      maxHeight = Math.max(140, spaceBelow);
    } else {
      maxHeight = Math.max(140, spaceAbove);
      top = Math.max(VIEWPORT_PADDING, rect.top - GAP - maxHeight);
    }

    // Garante que nunca ultrapasse o topo ou o fundo da janela
    top = Math.max(VIEWPORT_PADDING, Math.min(top, vh - VIEWPORT_PADDING - Math.min(naturalHeight, maxHeight)));

    const centerX = rect.left + rect.width / 2;
    const left = Math.max(VIEWPORT_PADDING, Math.min(centerX - w / 2, vw - w - VIEWPORT_PADDING));

    setCoords({ top, left, maxHeight });
  }, [dayData, dateStr, events.length, rect]);

  if (!dayData || !rect) return null;

  const userColorMap = allUsers.reduce((acc, curr) => {
    acc[curr.cr4a1_username] = curr.cr4a1_cor || '#ccc';
    return acc;
  }, {});

  const fallbackLeft = Math.max(
    VIEWPORT_PADDING,
    Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 280 - VIEWPORT_PADDING)
  );
  const fallbackTop = Math.max(
    VIEWPORT_PADDING,
    Math.min(rect.bottom + GAP, window.innerHeight - 260)
  );

  const style = {
    position: 'fixed',
    left: coords ? coords.left : fallbackLeft,
    top: coords ? coords.top : fallbackTop,
    zIndex: 99999,
    pointerEvents: 'auto',
    opacity: coords ? 1 : 0,
    transition: 'opacity 0.12s ease-out',
  };

  return ReactDOM.createPortal(
    <div
      ref={tooltipRef}
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
        width: '280px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: coords?.maxHeight ? `${coords.maxHeight}px` : 'calc(100vh - 24px)',
        display: 'flex',
        flexDirection: 'column',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', flexShrink: 0 }}>
          {format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', minHeight: 0, paddingRight: '2px' }}>
          {events.map((ev, idx) => {
            const assignees = parseAssignees(ev.cr4a1_user_login);
            const typeLayer = getEventTypeLayer(ev.cr4a1_tipo, eventTypes);
            return (
              <div
                key={idx}
                onClick={(e) => onViewEvent(ev, e.currentTarget.getBoundingClientRect())}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px',
                  borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', gap: '2px', marginTop: '5px', flexShrink: 0 }}>
                  {assignees.slice(0, 3).map((u, i) => (
                    <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: userColorMap[u] || '#ccc' }} />
                  ))}
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                  <span style={{ fontWeight: '700', color: userColorMap[assignees[0]] || '#7f8c8d' }}>
                    {assignees.join(', ')}:
                  </span> {typeLayer.layer === 'icone' && typeLayer.emoji ? typeLayer.emoji + ' ' : ''}{ev.cr4a1_titulo}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
