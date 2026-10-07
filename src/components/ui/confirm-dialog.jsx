import React from 'react';
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from './alert-dialog';

// Substitui window.confirm() pelo visual do app. Use via o hook useConfirm, que já
// cuida do estado e devolve uma Promise<boolean> — raramente precisa montar isto direto.
export const ConfirmDialog = ({ open, title = 'Confirmar', description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive, onConfirm, onCancel }) => (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title}</AlertDialogTitle>
                {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
                <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
