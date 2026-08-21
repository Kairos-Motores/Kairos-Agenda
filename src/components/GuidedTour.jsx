import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const TOUR_STYLES = `
  @keyframes kairos-tour-ring-pulse {
    0%, 100% { box-shadow: 0 0 0 3px var(--text-accent), 0 0 0 9999px rgba(12,12,16,0.72); }
    50% { box-shadow: 0 0 0 6px var(--text-accent), 0 0 0 9999px rgba(12,12,16,0.72); }
  }
  @keyframes kairos-tour-card-in { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .kairos-tour-spotlight { transition: top 0.4s cubic-bezier(0.2,0.8,0.2,1), left 0.4s cubic-bezier(0.2,0.8,0.2,1), width 0.4s cubic-bezier(0.2,0.8,0.2,1), height 0.4s cubic-bezier(0.2,0.8,0.2,1); }
  .kairos-tour-card { animation: kairos-tour-card-in 0.3s cubic-bezier(0.2,0.8,0.2,1) both; }
  .kairos-tour-btn { transition: transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275), background 0.2s, color 0.2s, opacity 0.2s; }
  .kairos-tour-btn:active { transform: scale(0.9); }
`;

const CARD_MAX_WIDTH = 320;
const GAP = 16;
const PADDING = 10;
const EDGE_MARGIN = 16;

export const GuidedTour = ({ isOpen, onClose, steps = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const prevIndexRef = useRef(null);
  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ width: CARD_MAX_WIDTH, height: 240 });

  // Mede o tamanho real do cartão (o texto muda de passo pra passo) para garantir
  // que ele nunca fique posicionado fora da tela, em vez de estimar uma altura fixa.
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width && rect.height && (Math.abs(rect.width - cardSize.width) > 1 || Math.abs(rect.height - cardSize.height) > 1)) {
      setCardSize({ width: rect.width, height: rect.height });
    }
  });

  const step = steps[currentIndex];

  // Reseta para o primeiro passo sempre que o tour é aberto
  useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  // Lida com o ciclo de vida de cada passo (ex: abrir o menu lateral antes de destacar algo dentro dele)
  useEffect(() => {
    if (!isOpen || !step) return;
    step.onEnter?.();
    prevIndexRef.current = currentIndex;

    let raf1, raf2;
    const measure = () => {
      const el = step.getTarget?.();
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect.width > 0 && rect.height > 0 ? rect : null);
      } else {
        setTargetRect(null);
      }
    };

    // Espera o layout assentar (ex: animação de abertura do menu lateral) antes de medir
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(measure); });
    const interval = setInterval(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      step.onLeave?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !step) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;
  const progressPct = Math.round(((currentIndex + 1) / steps.length) * 100);

  const goNext = () => { if (isLast) onClose?.(); else setCurrentIndex(i => i + 1); };
  const goPrev = () => { if (!isFirst) setCurrentIndex(i => i - 1); };

  // Calcula onde o cartão de explicação deve ficar em torno do elemento destacado,
  // usando o tamanho real medido do cartão para garantir que ele fique sempre 100% visível.
  const cardStyle = (() => {
    const base = { position: 'fixed', width: `min(${CARD_MAX_WIDTH}px, calc(100vw - ${EDGE_MARGIN * 2}px))`, zIndex: 2 };
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = cardSize.width;
    const cardH = cardSize.height;
    const maxTop = Math.max(EDGE_MARGIN, viewportH - cardH - EDGE_MARGIN);
    const maxLeft = Math.max(EDGE_MARGIN, viewportW - cardW - EDGE_MARGIN);

    if (!targetRect) {
      const top = Math.min(Math.max((viewportH - cardH) / 2, EDGE_MARGIN), maxTop);
      const left = Math.min(Math.max((viewportW - cardW) / 2, EDGE_MARGIN), maxLeft);
      return { ...base, top: `${top}px`, left: `${left}px` };
    }

    const spaceBelow = viewportH - targetRect.bottom - GAP;
    const spaceAbove = targetRect.top - GAP;

    let top;
    if (spaceBelow >= cardH) {
      top = targetRect.bottom + GAP;
    } else if (spaceAbove >= cardH) {
      top = targetRect.top - GAP - cardH;
    } else {
      // Não cabe inteiro nem acima nem abaixo do alvo (ex: alvo muito alto na tela):
      // prioriza manter o cartão 100% visível em vez de encostado no alvo.
      top = spaceBelow >= spaceAbove ? maxTop : EDGE_MARGIN;
    }
    top = Math.min(Math.max(top, EDGE_MARGIN), maxTop);

    let left = targetRect.left + targetRect.width / 2 - cardW / 2;
    left = Math.min(Math.max(left, EDGE_MARGIN), maxLeft);

    return { ...base, top: `${top}px`, left: `${left}px` };
  })();

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999 }}>
      <style>{TOUR_STYLES}</style>

      {/* Scrim + spotlight */}
      {targetRect ? (
        <div
          className="kairos-tour-spotlight"
          style={{
            position: 'fixed',
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
            borderRadius: '18px',
            animation: 'kairos-tour-ring-pulse 1.8s ease-in-out infinite',
            pointerEvents: 'none'
          }}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,12,16,0.72)' }} />
      )}

      {/* Cartão de explicação */}
      <div key={currentIndex} ref={cardRef} className="kairos-tour-card" style={cardStyle}>
        <div style={{
          background: 'var(--bg-primary)', borderRadius: '24px', padding: '20px',
          border: '1px solid var(--border-color)', boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          maxHeight: `calc(100vh - ${EDGE_MARGIN * 2}px)`, overflowY: 'auto', boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-title)' }}>{step.title}</h3>
            <button onClick={onClose} className="kairos-tour-btn" title="Fechar tutorial" style={{ flexShrink: 0, border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>close</span>
            </button>
          </div>

          <p style={{ margin: '0 0 18px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
            {step.description}
          </p>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ height: '5px', borderRadius: '999px', background: 'var(--bg-tertiary)', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ height: '100%', borderRadius: '999px', width: `${progressPct}%`, background: 'var(--text-accent)', transition: 'width 0.4s cubic-bezier(0.2,0.8,0.2,1)' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Passo {currentIndex + 1} de {steps.length}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <button onClick={onClose} className="kairos-tour-btn" style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: '8px 4px' }}>
              Pular tour
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isFirst && (
                <button onClick={goPrev} className="kairos-tour-btn" style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', padding: '9px 16px', borderRadius: '100px' }}>
                  Voltar
                </button>
              )}
              <button onClick={goNext} className="kairos-tour-btn" style={{ border: 'none', background: 'var(--text-accent)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', padding: '9px 18px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isLast ? 'Concluir' : 'Próximo'}
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>{isLast ? 'check' : 'arrow_forward'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
