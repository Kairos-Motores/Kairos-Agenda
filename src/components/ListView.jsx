import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ListView = ({ events, allUsers, eventTypes, onEdit, onDelete, workspaces = [] }) => {
    // Localiza dinamicamente o ID do Workspace técnico da Kairós para o checklist
    const devWorkspace = workspaces.find(ws => ws.cr4a1_nome === "Desenvolvimento e Inovação");
    const devWorkspaceId = devWorkspace?.cr4a1_calendarios_workspacesid;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px', padding: '10px 0' }}>
            {events.map(event => {
                // Busca as informações do workspace atual deste evento específico
                const currentWorkspace = workspaces.find(ws => ws.cr4a1_calendarios_workspacesid === event.cr4a1_workspace_id);
                const workspaceColor = currentWorkspace?.cr4a1_cor_hex || 'var(--border-color)';
                const workspaceName = currentWorkspace?.cr4a1_nome || '';

                const isDevWorkspace = event.cr4a1_workspace_id === devWorkspaceId;
                
                // Tratamento e cálculo seguro do JSON de subtasks
                const subtasks = event.cr4a1_subtasks 
                    ? (typeof event.cr4a1_subtasks === 'string' ? JSON.parse(event.cr4a1_subtasks) : event.cr4a1_subtasks) 
                    : [];
                const completedCount = subtasks.filter(s => s.completed).length;
                const totalSubtasks = subtasks.length;
                const percentage = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

                return (
                    <div 
                        key={event.cr4a1_agenda_kairosid} 
                        style={{ 
                            background: 'var(--bg-primary)', 
                            // REQUISITO 1: Borda sutil baseada na cor do Workspace
                            border: `1px solid ${currentWorkspace ? workspaceColor : 'var(--border-color)'}`, 
                            borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', 
                            justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', position: 'relative'
                        }}
                    >
                        <div>
                            {/* METADADOS SUPERIORES */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                    {event.cr4a1_data_inicio ? format(new Date(event.cr4a1_data_inicio.split('T')[0] + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : ''}
                                </span>
                                
                                {/* REQUISITO 2: Nome do Workspace agrupado ao lado do Tipo de Evento */}
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {workspaceName && (
                                        <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: '700', 
                                            color: workspaceColor, 
                                            padding: '3px 8px', 
                                            background: 'var(--bg-secondary)', 
                                            borderRadius: '6px',
                                            border: `1px solid ${workspaceColor}33`, // Borda ainda mais suave interna na tag
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3px'
                                        }}>
                                            {workspaceName}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-accent)', padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                                        {event.cr4a1_tipo || 'Compromisso'}
                                    </span>
                                </div>
                            </div>

                            {/* TÍTULO E CORPO */}
                            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-title)', fontSize: '17px', fontWeight: '700' }}>
                                {event.cr4a1_titulo}
                            </h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                                {event.cr4a1_detalhes || event.cr4a1_descricao || 'Sem descrição cadastrada.'}
                            </p>
                        </div>

                        {/* INDICADOR DE PORCENTAGEM E CONTADOR DE SUBTASKS */}
                        {isDevWorkspace && totalSubtasks > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: percentage === 100 ? '#22c55e' : 'var(--text-accent)' }}>
                                        <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                                            {percentage === 100 ? 'task_alt' : 'inventory'}
                                        </span>
                                        <span>{percentage}% concluído</span>
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                                        {completedCount}/{totalSubtasks} subtasks
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* BOTÕES DE CONTROLE DO CARD */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
                            <button onClick={() => onEdit(event)} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '600', borderRadius: '10px' }}>
                                Editar Ficha
                            </button>
                            <button 
                                onClick={() => onDelete(event)} 
                                className="icon-btn" 
                                style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#e74c3c' }}
                            >
                                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};