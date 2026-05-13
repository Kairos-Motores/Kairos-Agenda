import React, { useState } from 'react';

export const WorkspaceModal = ({ isOpen, onClose, onSave, allUsers = [], userRole }) => {
    const [formData, setFormData] = useState({
        nome: '',
        tipo: 'COMPARTILHADO',
        cor: '#1a73e8',
        membros: ''
    });

    if (!isOpen) return null;

    const colors = ['#1a73e8', '#d93025', '#f9ab00', '#188038', '#af5cf7', '#00acc1', '#ff6d00'];

    const handleAddAll = () => {
        const allLogins = allUsers.map(u => u.cr4a1_username);
        setFormData({ ...formData, membros: allLogins.join(',') });
    };

    const handleAddUnit = (unit) => {
        const unitLogins = allUsers.filter(u => u.cr4a1_unidade === unit).map(u => u.cr4a1_username);
        const currentMembros = formData.membros ? formData.membros.split(',') : [];
        const newMembros = [...new Set([...currentMembros, ...unitLogins])].filter(Boolean);
        setFormData({ ...formData, membros: newMembros.join(',') });
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-container" style={{ maxWidth: '400px', width: '90%' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>🚀 Novo Workspace</h3>
                    <button onClick={onClose} className="icon-btn">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>NOME DO AMBIENTE</label>
                        <input
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            placeholder="Ex: Projetos TI, Consultas..."
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>TIPO</label>
                        <select
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            value={formData.tipo}
                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        >
                            <option value="COMPARTILHADO">COMPARTILHADO (Equipe)</option>
                            {/* OPÇÃO EXCLUSIVA PARA O RH */}
                            {userRole === 'RH' && <option value="RH">INSTITUCIONAL (RH)</option>}
                            <option value="PESSOAL">PESSOAL (Privado)</option>
                        </select>
                    </div>

                    {formData.tipo !== 'PESSOAL' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>ADICIONAR POR GRUPO</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                <button type="button" onClick={handleAddAll} style={{ padding: '8px', borderRadius: '8px', fontSize: '11px', background: 'var(--text-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>🌐 Toda a Kairós</button>
                                {['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'].map(u => (
                                    <button type="button" key={u} onClick={() => handleAddUnit(u)} style={{ padding: '8px', borderRadius: '8px', fontSize: '11px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)' }}>📍 {u}</button>
                                ))}
                            </div>
                            
                            <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>MEMBROS (separados por vírgula)</label>
                            <textarea
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', height: '60px' }}
                                placeholder="usuario1, usuario2..."
                                value={formData.membros}
                                onChange={e => setFormData({ ...formData, membros: e.target.value })}
                            />
                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {formData.membros ? formData.membros.split(',').length : 0} usuários selecionados.
                            </p>
                        </div>
                    )}

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>COR DE IDENTIFICAÇÃO</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {colors.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setFormData({ ...formData, cor: c })}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: c, cursor: 'pointer',
                                        border: formData.cor === c ? '3px solid var(--text-primary)' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => {
                            if (!formData.nome) return;
                            onSave(formData);
                            onClose();
                        }}
                    >
                        Criar Workspace
                    </button>
                </div>
            </div>
        </div>
    );
};