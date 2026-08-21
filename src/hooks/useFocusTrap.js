import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Prende o foco por teclado dentro do modal enquanto ele estiver aberto (Tab/Shift+Tab
// não escapam para o conteúdo atrás), foca o primeiro item ao abrir e devolve o foco
// para quem abriu o modal ao fechar. Anexe o ref retornado no elemento que envolve
// todo o conteúdo focável do modal.
export const useFocusTrap = (isActive) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const previouslyFocused = document.activeElement;

        const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => el.offsetParent !== null);

        const first = getFocusable()[0];
        if (first) first.focus();

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;
            const items = getFocusable();
            if (items.length === 0) return;
            const firstEl = items[0];
            const lastEl = items[items.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstEl || !container.contains(document.activeElement)) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (document.activeElement === lastEl || !container.contains(document.activeElement)) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [isActive]);

    return containerRef;
};
