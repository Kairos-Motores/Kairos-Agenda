import React, { useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, eventTitle }) => {
    const trapRef = useFocusTrap(isOpen);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div ref={trapRef} tabIndex={-1} className="modal-container" style={{ maxWidth: '380px', padding: '30px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-title)', fontSize: '20px', fontWeight: '600' }}>Excluir Evento?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
                    Tem certeza que deseja remover o evento <br/>
                    <strong style={{ color: 'var(--text-primary)' }}>"{eventTitle}"</strong>?<br/>
                    Esta ação não pode ser desfeita.
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} className="btn-secondary boing-effect" style={{ flex: 1 }}>Cancelar</button>
                    <button onClick={onConfirm} className="btn-primary boing-effect" style={{ flex: 1, background: '#e74c3c' }}>Excluir</button>
                </div>
            </div>
        </div>
    );
};
