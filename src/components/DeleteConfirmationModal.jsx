import React from 'react';
import { TriangleAlert } from 'lucide-react';
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from './ui/alert-dialog';

export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, eventTitle }) => (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <TriangleAlert className="size-9 text-destructive" />
                <AlertDialogTitle>Excluir Evento?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover o evento <strong className="text-foreground">"{eventTitle}"</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onConfirm}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
