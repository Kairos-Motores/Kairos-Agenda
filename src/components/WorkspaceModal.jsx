import React, { useState, useEffect, useMemo } from 'react';

export const WorkspaceModal = ({ isOpen, onClose, onSave, allUsers = [], userRole, editingWorkspace = null }) => {
    const [formData, setFormData] = useState({
        nome: '',
        tipo: 'COMPARTILHADO',
        cor: '#1a73e8',
        membros: ''
    });

    // Modo de seleção: 'text' (digitar) ou 'visual' (lista de checkboxes)
    const [memberMode, setMemberMode] = useState('text');
    const [userFilter, setUserFilter] = useState('');

    // Sincroniza o formulário quando o modal abre ou o workspace em edição muda
    useEffect(() => {
        if (editingWorkspace) {
            setFormData({
                nome: editingWorkspace.cr4a1_nome || '',
                tipo: editingWorkspace.cr4a1_tipo_workspace || 'COMPARTILHADO',
                cor: editingWorkspace.cr4a1_cor_hex || '#1a73e8',
                membros: editingWorkspace.cr4a1_membros_logins || ''
            });
        } else {
            setFormData({
                nome: '',
                tipo: 'COMPARTILHADO',
                cor: '#1a73e8',
                membros: ''
            });
        }
        setMemberMode('text');
        setUserFilter('');
    }, [editingWorkspace, isOpen]);

    // Lista de logins já selecionados (a partir da string de membros)
    const selectedMembers = useMemo(() => {
        if (!formData.membros) return [];
        return formData.membros.split(',').map(s => s.trim()).filter(Boolean);
    }, [formData.membros]);

    // Função auxiliar para adicionar/remover um login da lista
    const toggleMember = (login) => {
        const current = [...selectedMembers];
        const index = current.indexOf(login);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(login);
        }
        setFormData({ ...formData, membros: current.join(',') });
    };

    // Adiciona todos os usuários (disponível apenas para ADMIN/RH)
    const handleAddAll = () => {
        if (userRole !== 'ADMIN' && userRole !== 'RH') return;
        const allLogins = allUsers.map(u => u.cr4a1_username);
        const merged = [...new Set([...selectedMembers, ...allLogins])];
        setFormData({ ...formData, membros: merged.join(',') });
    };

    // Adiciona todos os usuários de uma determinada unidade
    const handleAddUnit = (unit) => {
        const unitLogins = allUsers.filter(u => u.cr4a1_unidade === unit).map(u => u.cr4a1_username);
        const merged = [...new Set([...selectedMembers, ...unitLogins])];
        setFormData({ ...formData, membros: merged.join(',') });
    };

    // Filtra os usuários para exibição no modo visual
    const filteredUsers = useMemo(() => {
        if (!userFilter) return allUsers;
        const lower = userFilter.toLowerCase();
        return allUsers.filter(u =>
            u.cr4a1_username.toLowerCase().includes(lower) ||
            (u.cr4a1_nome_exibicao || '').toLowerCase().includes(lower) ||
            (u.cr4a1_unidade || '').toLowerCase().includes(lower)
        );
    }, [allUsers, userFilter]);

    if (!isOpen) return null;

    const colors = ['#1a73e8', '#d93025', '#f9ab00', '#188038', '#af5cf7', '#00acc1', '#ff6d00'];
    const unidades = ['São Luís', 'Barcarena', 'Parauapebas', 'São José dos Campos', 'Aveiro'];

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-container" style={{ maxWidth: '500px', width: '90%' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>{editingWorkspace ? '🚀 Editar Workspace' : '🚀 Novo Workspace'}</h3>
                    <button onClick={onClose} className="icon-btn">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    {/* Nome */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>NOME DO AMBIENTE</label>
                        <input
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            placeholder="Ex: Projetos TI, Consultas..."
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                        />
                    </div>

                    {/* Tipo */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>TIPO</label>
                        <select
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            value={formData.tipo}
                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        >
                            <option value="COMPARTILHADO">COMPARTILHADO (Equipe)</option>
                            {userRole === 'RH' && <option value="RH">INSTITUCIONAL (RH)</option>}
                            <option value="PESSOAL">PESSOAL (Privado)</option>
                        </select>
                    </div>

                    {/* Seção de membros (apenas para workspaces não pessoais) */}
                    {formData.tipo !== 'PESSOAL' && (
                        <div style={{ marginBottom: '16px' }}>
                            {/* Botões rápidos de grupo */}
                            <label style={{ fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>ADICIONAR POR GRUPO</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                {/* Toda a Kairós – apenas ADMIN e RH */}
                                {(userRole === 'ADMIN' || userRole === 'RH') && (
                                    <button type="button" onClick={handleAddAll} style={{ padding: '8px', borderRadius: '8px', fontSize: '11px', background: 'var(--text-accent)', color: 'white', border: 'none', cursor: 'pointer' }}>🌐 Toda a Kairós</button>
                                )}
                                {unidades.map(u => (
                                    <button type="button" key={u} onClick={() => handleAddUnit(u)} style={{ padding: '8px', borderRadius: '8px', fontSize: '11px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)' }}>📍 {u}</button>
                                ))}
                            </div>

                            {/* Alternador entre modo texto e visual */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700' }}>MEMBROS ({selectedMembers.length})</span>
                                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
                                    <button
                                        onClick={() => setMemberMode('text')}
                                        style={{
                                            padding: '4px 12px', fontSize: '12px', borderRadius: '6px', border: 'none',
                                            background: memberMode === 'text' ? 'var(--text-accent)' : 'transparent',
                                            color: memberMode === 'text' ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer', fontWeight: 600
                                        }}
                                    >
                                        Digitar
                                    </button>
                                    <button
                                        onClick={() => setMemberMode('visual')}
                                        style={{
                                            padding: '4px 12px', fontSize: '12px', borderRadius: '6px', border: 'none',
                                            background: memberMode === 'visual' ? 'var(--text-accent)' : 'transparent',
                                            color: memberMode === 'visual' ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer', fontWeight: 600
                                        }}
                                    >
                                        Selecionar
                                    </button>
                                </div>
                            </div>

                            {/* Conteúdo condicional conforme o modo */}
                            {memberMode === 'text' ? (
                                <div>
                                    <textarea
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', height: '60px' }}
                                        placeholder="usuario1, usuario2..."
                                        value={formData.membros}
                                        onChange={e => setFormData({ ...formData, membros: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Procurar usuário..."
                                        value={userFilter}
                                        onChange={e => setUserFilter(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '8px' }}
                                    />
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
                                        {filteredUsers.map(u => {
                                            const isChecked = selectedMembers.includes(u.cr4a1_username);
                                            return (
                                                <label
                                                    key={u.cr4a1_username}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px',
                                                        background: isChecked ? 'var(--bg-tertiary)' : 'transparent',
                                                        cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleMember(u.cr4a1_username)}
                                                        style={{ accentColor: 'var(--text-accent)', width: '16px', height: '16px' }}
                                                    />
                                                    <span style={{ flex: 1 }}>{u.cr4a1_nome_exibicao || u.cr4a1_username}</span>
                                                    <span style={{ fontSize: '10px', opacity: 0.6 }}>{u.cr4a1_unidade}</span>
                                                </label>
                                            );
                                        })}
                                        {filteredUsers.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>Nenhum usuário encontrado.</p>}
                                    </div>
                                </div>
                            )}
                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {selectedMembers.length} usuários selecionados.
                            </p>
                        </div>
                    )}

                    {/* Cor */}
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
                        {editingWorkspace ? 'Guardar Alterações' : 'Criar Workspace'}
                    </button>
                </div>
            </div>
        </div>
    );
};