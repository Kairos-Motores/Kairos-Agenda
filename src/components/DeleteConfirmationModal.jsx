import React from 'react';

export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, eventTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '380px', padding: '30px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-title)', fontSize: '20px', fontWeight: '600' }}>Excluir Evento?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
                    Tem certeza que deseja remover o evento <br/>
                    <strong style={{ color: 'var(--text-primary)' }}>"{eventTitle}"</strong>?<br/>
                    Esta ação não pode ser desfeita.
                </p>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button onClick={onConfirm} className="btn-primary" style={{ flex: 1, background: '#e74c3c' }}>Excluir</button>
                </div>
            </div>
        </div>
    );
};
