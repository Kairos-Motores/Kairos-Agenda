import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ui/confirm-dialog';

// Troca window.confirm(msg) por um diálogo no visual do app, mantendo o mesmo jeito de
// usar: `if (await confirm('Excluir X?')) { ... }`. Renderize {ConfirmDialogHost} uma vez
// em algum ponto do componente — ele só aparece quando confirm() é chamado.
export const useConfirm = () => {
    const [state, setState] = useState(null);
    const resolverRef = useRef(null);

    const confirm = useCallback((description, options = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setState({ description, ...options });
        });
    }, []);

    const resolve = (valor) => {
        resolverRef.current?.(valor);
        resolverRef.current = null;
        setState(null);
    };

    const ConfirmDialogHost = state ? (
        <ConfirmDialog
            open
            title={state.title}
            description={state.description}
            confirmLabel={state.confirmLabel}
            cancelLabel={state.cancelLabel}
            destructive={state.destructive ?? true}
            onConfirm={() => resolve(true)}
            onCancel={() => resolve(false)}
        />
    ) : null;

    return { confirm, ConfirmDialogHost };
};
