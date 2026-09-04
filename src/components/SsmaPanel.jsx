import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { SSMA_TIPOS, SSMA_STATUS_LIST, SSMA_CRITICIDADE_LIST, SSMA_CATEGORIAS_GASTO, tipoParaIndicador } from '../config/ssmaConfig';
import { computeSsmaResumo, computeGastosPorCategoria, diasEmAtraso } from '../utils/ssmaIndicators';

const ACCENT = '#2e7d32';
const ACCENT_BG = '#e8f5e9';

const monthInputToCompetencia = (yyyyMM) => {
    if (!yyyyMM) return '';
    const [ano, mes] = yyyyMM.split('-');
    return `${mes}/${ano}`;
};
const competenciaToMonthInput = (competencia) => {
    if (!competencia) return '';
    const [mes, ano] = competencia.split('/');
    return `${ano}-${mes}`;
};

const inputStyle = { padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' };
const labelStyle = { fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' };
const cardStyle = { background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '20px' };

const StatusBadge = ({ status }) => {
    const colors = {
        'ATINGIDO': { bg: '#dcfce7', fg: '#16a34a' },
        'ABAIXO DA META': { bg: '#fee2e2', fg: '#dc2626' },
        'NÃO INFORMADO': { bg: '#f1f5f9', fg: '#64748b' }
    };
    const c = colors[status] || colors['NÃO INFORMADO'];
    return <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{status}</span>;
};

export const SsmaPanel = ({ currentUser, hasRole, allUsers, ssmaAtividades, ssmaGastos, addSsmaAtividade, updateSsmaAtividade, deleteSsmaAtividade, addSsmaGasto, updateSsmaGasto, deleteSsmaGasto }) => {
    const isAdmin = hasRole('ADMIN');
    const isTecnico = hasRole('TECNICO SSMA');
    const isChefe = hasRole('COORD SSMA');
    const podeEditar = isAdmin || isTecnico;

    const [subTab, setSubTab] = useState('indicadores');
    const [competencia, setCompetencia] = useState(format(new Date(), 'MM/yyyy'));
    const [unidade, setUnidade] = useState(isAdmin || isChefe ? '' : (currentUser?.cr4a1_unidade || ''));

    const unidadesDisponiveis = useMemo(() => {
        const set = new Set((allUsers || []).map(u => u.cr4a1_unidade).filter(Boolean));
        return Array.from(set).sort();
    }, [allUsers]);

    const unidadeEfetiva = (isAdmin || isChefe) ? unidade : (currentUser?.cr4a1_unidade || '');

    const resumo = useMemo(
        () => computeSsmaResumo(ssmaAtividades, ssmaGastos, competencia, unidadeEfetiva),
        [ssmaAtividades, ssmaGastos, competencia, unidadeEfetiva]
    );
    const gastosPorCategoria = useMemo(
        () => computeGastosPorCategoria(ssmaGastos, SSMA_CATEGORIAS_GASTO, competencia, unidadeEfetiva),
        [ssmaGastos, competencia, unidadeEfetiva]
    );

    const atividadesFiltradas = (ssmaAtividades || []).filter(a => a.cr4a1_competencia === competencia && a.cr4a1_unidade === unidadeEfetiva);
    const gastosFiltrados = (ssmaGastos || []).filter(g => g.cr4a1_competencia === competencia && g.cr4a1_unidade === unidadeEfetiva);

    const [editingAtividade, setEditingAtividade] = useState(null);
    const [editingGasto, setEditingGasto] = useState(null);

    const tabStyle = (active) => ({
        padding: '10px 20px', cursor: 'pointer', userSelect: 'none', borderRadius: '100px', fontWeight: '600', fontSize: '13px',
        background: active ? ACCENT_BG : 'transparent', color: active ? ACCENT : 'var(--text-secondary)'
    });

    if (!unidadeEfetiva) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                <Header />
                <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '48px', color: ACCENT, opacity: 0.6 }}>health_and_safety</span>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Selecione uma unidade para ver os dados de SSMA.</p>
                    <UnidadeSelect value={unidade} onChange={setUnidade} options={unidadesDisponiveis} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Header />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                    <label style={labelStyle}>Competência</label>
                    <input type="month" value={competenciaToMonthInput(competencia)} onChange={e => setCompetencia(monthInputToCompetencia(e.target.value))} style={inputStyle} />
                </div>
                {(isAdmin || isChefe) && (
                    <div>
                        <label style={labelStyle}>Unidade</label>
                        <UnidadeSelect value={unidade} onChange={setUnidade} options={unidadesDisponiveis} inline />
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <div onClick={() => setSubTab('indicadores')} style={tabStyle(subTab === 'indicadores')}>Indicadores</div>
                {podeEditar && <div onClick={() => setSubTab('atividades')} style={tabStyle(subTab === 'atividades')}>Atividades e Ocorrências</div>}
                {podeEditar && <div onClick={() => setSubTab('gastos')} style={tabStyle(subTab === 'gastos')}>Gastos SSMA</div>}
            </div>

            {subTab === 'indicadores' && <IndicadoresTab resumo={resumo} gastosPorCategoria={gastosPorCategoria} />}
            {subTab === 'atividades' && podeEditar && (
                <AtividadesTab
                    atividades={atividadesFiltradas}
                    competencia={competencia}
                    unidade={unidadeEfetiva}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    allUsers={allUsers}
                    editing={editingAtividade}
                    setEditing={setEditingAtividade}
                    onSave={(id, data) => id ? updateSsmaAtividade(id, data) : addSsmaAtividade(data)}
                    onDelete={deleteSsmaAtividade}
                />
            )}
            {subTab === 'gastos' && podeEditar && (
                <GastosTab
                    gastos={gastosFiltrados}
                    competencia={competencia}
                    unidade={unidadeEfetiva}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    allUsers={allUsers}
                    editing={editingGasto}
                    setEditing={setEditingGasto}
                    onSave={(id, data) => id ? updateSsmaGasto(id, data) : addSsmaGasto(data)}
                    onDelete={deleteSsmaGasto}
                />
            )}
        </div>
    );
};

const Header = () => (
    <header style={{ marginBottom: '4px' }}>
        <h2 style={{ color: 'var(--text-title)', fontSize: '26px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-rounded" style={{ color: ACCENT, fontSize: '28px' }}>health_and_safety</span> SSMA
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Saúde, Segurança e Meio Ambiente — indicadores mensais por unidade</p>
    </header>
);

const UnidadeSelect = ({ value, onChange, options, inline }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, ...(inline ? {} : { marginTop: '12px' }) }}>
        <option value="">Selecione...</option>
        {options.map(u => <option key={u} value={u}>{u}</option>)}
    </select>
);

const IndicadoresTab = ({ resumo, gastosPorCategoria }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {[
                { label: 'Atingimento Geral', value: `${(resumo.atingimentoGeral * 100).toFixed(0)}%`, icon: 'target' },
                { label: 'Atividades Realizadas', value: resumo.atividadesRealizadas, icon: 'task_alt' },
                { label: 'Registros Atrasados', value: resumo.registrosAtrasados, icon: 'schedule' },
                { label: 'Gasto Realizado', value: `R$ ${resumo.gastoRealizado.toLocaleString('pt-BR')}`, icon: 'payments' },
                { label: 'Sem Evidência', value: resumo.semEvidencia, icon: 'visibility_off' },
                { label: 'Pendências', value: resumo.pendencias, icon: 'pending_actions' }
            ].map(kpi => (
                <div key={kpi.label} style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span className="material-symbols-rounded" style={{ color: ACCENT, fontSize: '20px' }}>{kpi.icon}</span>
                    <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-title)' }}>{kpi.value}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{kpi.label}</span>
                </div>
            ))}
        </div>

        <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-title)' }}>Indicadores — Status na Competência</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px' }}>ID</th>
                            <th style={{ padding: '8px' }}>Indicador</th>
                            <th style={{ padding: '8px' }}>Meta</th>
                            <th style={{ padding: '8px' }}>Memória de Cálculo</th>
                            <th style={{ padding: '8px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resumo.indicadores.map(ind => (
                            <tr key={ind.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px', fontWeight: '700', color: 'var(--text-primary)' }}>{ind.id}</td>
                                <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{ind.nome}</td>
                                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{(ind.meta * 100).toFixed(0)}%</td>
                                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{ind.memoria}</td>
                                <td style={{ padding: '8px' }}><StatusBadge status={ind.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span>✅ Atingidos: <b>{resumo.atingidos}</b></span>
                <span>⚠️ Abaixo da meta: <b>{resumo.abaixoDaMeta}</b></span>
                <span>➖ Não informados: <b>{resumo.naoInformados}</b></span>
            </div>
        </div>

        <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-title)' }}>Gasto por Categoria</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px' }}>Categoria</th>
                            <th style={{ padding: '8px' }}>Realizado</th>
                            <th style={{ padding: '8px' }}>Orçado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gastosPorCategoria.filter(g => g.realizado > 0 || g.orcado > 0).map(g => (
                            <tr key={g.categoria} style={{ borderTop: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{g.categoria}</td>
                                <td style={{ padding: '8px', color: 'var(--text-primary)' }}>R$ {g.realizado.toLocaleString('pt-BR')}</td>
                                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>R$ {g.orcado.toLocaleString('pt-BR')}</td>
                            </tr>
                        ))}
                        {gastosPorCategoria.every(g => g.realizado === 0 && g.orcado === 0) && (
                            <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum gasto lançado nesta competência.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const emptyAtividade = (currentUser, unidade, competencia) => ({
    cr4a1_competencia: competencia,
    cr4a1_unidade: unidade,
    cr4a1_tecnico_login: currentUser?.cr4a1_username || '',
    cr4a1_tipo: SSMA_TIPOS[0],
    cr4a1_tema: '',
    cr4a1_data_inicio: '',
    cr4a1_prazo: '',
    cr4a1_data_fim_real: '',
    cr4a1_previsto: 1,
    cr4a1_realizado: 0,
    cr4a1_status: SSMA_STATUS_LIST[0],
    cr4a1_criticidade: SSMA_CRITICIDADE_LIST[0],
    cr4a1_responsavel: currentUser?.cr4a1_username || '',
    cr4a1_evidencia: '',
    cr4a1_observacao: ''
});

const AtividadesTab = ({ atividades, competencia, unidade, currentUser, isAdmin, allUsers, editing, setEditing, onSave, onDelete }) => {
    const tecnicos = (allUsers || []).filter(u => (u.cr4a1_role || '').split(',').map(r => r.trim()).includes('TECNICO SSMA'));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => setEditing(emptyAtividade(currentUser, unidade, competencia))} className="btn-primary boing-effect" style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '12px', background: ACCENT }}>
                + Nova atividade
            </button>

            {editing && (
                <AtividadeForm
                    data={editing}
                    isAdmin={isAdmin}
                    tecnicos={tecnicos}
                    allUsers={allUsers}
                    onCancel={() => setEditing(null)}
                    onSave={(data) => { onSave(editing.cr4a1_ssma_atividadeid, data); setEditing(null); }}
                />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {atividades.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Nenhuma atividade registrada nesta competência.</p>}
                {atividades.map(a => {
                    const podeEditarEsta = isAdmin || a.cr4a1_tecnico_login === currentUser?.cr4a1_username;
                    const atraso = diasEmAtraso(a);
                    return (
                        <div key={a.cr4a1_ssma_atividadeid} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: ACCENT, background: ACCENT_BG, padding: '2px 8px', borderRadius: '8px' }}>{tipoParaIndicador(a.cr4a1_tipo)}</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{a.cr4a1_tipo}</span>
                                    {a.cr4a1_tema && <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>— {a.cr4a1_tema}</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <span>Previsto {a.cr4a1_previsto} / Realizado {a.cr4a1_realizado}</span>
                                    <span>Status: {a.cr4a1_status}</span>
                                    {atraso > 0 && <span style={{ color: '#dc2626', fontWeight: '600' }}>{atraso}d em atraso</span>}
                                    {!a.cr4a1_evidencia && <span style={{ color: '#f57c00' }}>Sem evidência</span>}
                                </div>
                            </div>
                            {podeEditarEsta && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => setEditing(a)} className="icon-btn boing-effect" style={{ width: '32px', height: '32px', color: ACCENT }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span></button>
                                    <button onClick={() => onDelete(a.cr4a1_ssma_atividadeid)} className="icon-btn boing-effect" style={{ width: '32px', height: '32px', color: '#e74c3c' }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AtividadeForm = ({ data, isAdmin, tecnicos, allUsers, onCancel, onSave }) => {
    const [form, setForm] = useState(data);
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleTecnicoChange = (e) => {
        const login = e.target.value;
        const u = (allUsers || []).find(x => x.cr4a1_username === login);
        setForm({ ...form, cr4a1_tecnico_login: login, cr4a1_unidade: u?.cr4a1_unidade || form.cr4a1_unidade });
    };

    return (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isAdmin && (
                <div>
                    <label style={labelStyle}>Técnico</label>
                    <select value={form.cr4a1_tecnico_login} onChange={handleTecnicoChange} style={inputStyle}>
                        {tecnicos.map(t => <option key={t.cr4a1_username} value={t.cr4a1_username}>{t.cr4a1_username}</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div>
                    <label style={labelStyle}>Tipo</label>
                    <select value={form.cr4a1_tipo} onChange={set('cr4a1_tipo')} style={inputStyle}>
                        {SSMA_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Status</label>
                    <select value={form.cr4a1_status} onChange={set('cr4a1_status')} style={inputStyle}>
                        {SSMA_STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Criticidade</label>
                    <select value={form.cr4a1_criticidade} onChange={set('cr4a1_criticidade')} style={inputStyle}>
                        {SSMA_CRITICIDADE_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label style={labelStyle}>Tema / Descrição</label>
                <input value={form.cr4a1_tema} onChange={set('cr4a1_tema')} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div><label style={labelStyle}>Data de início</label><input type="date" value={form.cr4a1_data_inicio || ''} onChange={set('cr4a1_data_inicio')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Prazo</label><input type="date" value={form.cr4a1_prazo || ''} onChange={set('cr4a1_prazo')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Data fim real</label><input type="date" value={form.cr4a1_data_fim_real || ''} onChange={set('cr4a1_data_fim_real')} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div><label style={labelStyle}>Previsto / Aplicável</label><input type="number" value={form.cr4a1_previsto} onChange={set('cr4a1_previsto')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Realizado / Conforme</label><input type="number" value={form.cr4a1_realizado} onChange={set('cr4a1_realizado')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Responsável</label><input value={form.cr4a1_responsavel} onChange={set('cr4a1_responsavel')} style={inputStyle} /></div>
            </div>
            <div>
                <label style={labelStyle}>Evidência / Link (obrigatório para contar como realizado)</label>
                <input value={form.cr4a1_evidencia} onChange={set('cr4a1_evidencia')} placeholder="Link do documento/foto/registro..." style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div>
                <label style={labelStyle}>Observação / Justificativa</label>
                <textarea value={form.cr4a1_observacao} onChange={set('cr4a1_observacao')} rows={2} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button onClick={onCancel} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: '12px' }}>Cancelar</button>
                <button onClick={() => onSave(form)} className="btn-primary" style={{ padding: '10px 18px', borderRadius: '12px', background: ACCENT }}>Salvar</button>
            </div>
        </div>
    );
};

const emptyGasto = (currentUser, unidade, competencia) => ({
    cr4a1_competencia: competencia,
    cr4a1_unidade: unidade,
    cr4a1_tecnico_login: currentUser?.cr4a1_username || '',
    cr4a1_categoria: SSMA_CATEGORIAS_GASTO[0],
    cr4a1_descricao: '',
    cr4a1_data: '',
    cr4a1_destino: '',
    cr4a1_orcado: 0,
    cr4a1_realizado: 0,
    cr4a1_evidencia: '',
    cr4a1_observacao: ''
});

const GastosTab = ({ gastos, competencia, unidade, currentUser, isAdmin, allUsers, editing, setEditing, onSave, onDelete }) => {
    const tecnicos = (allUsers || []).filter(u => (u.cr4a1_role || '').split(',').map(r => r.trim()).includes('TECNICO SSMA'));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => setEditing(emptyGasto(currentUser, unidade, competencia))} className="btn-primary boing-effect" style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '12px', background: ACCENT }}>
                + Novo gasto
            </button>

            {editing && (
                <GastoForm
                    data={editing}
                    isAdmin={isAdmin}
                    tecnicos={tecnicos}
                    allUsers={allUsers}
                    onCancel={() => setEditing(null)}
                    onSave={(data) => { onSave(editing.cr4a1_ssma_gastoid, data); setEditing(null); }}
                />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {gastos.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Nenhum gasto registrado nesta competência.</p>}
                {gastos.map(g => {
                    const podeEditarEsta = isAdmin || g.cr4a1_tecnico_login === currentUser?.cr4a1_username;
                    return (
                        <div key={g.cr4a1_ssma_gastoid} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: ACCENT, background: ACCENT_BG, padding: '2px 8px', borderRadius: '8px' }}>{g.cr4a1_categoria}</span>
                                    {g.cr4a1_descricao && <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{g.cr4a1_descricao}</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Realizado R$ {(Number(g.cr4a1_realizado) || 0).toLocaleString('pt-BR')} / Orçado R$ {(Number(g.cr4a1_orcado) || 0).toLocaleString('pt-BR')}
                                    {g.cr4a1_destino && ` — ${g.cr4a1_destino}`}
                                </div>
                            </div>
                            {podeEditarEsta && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => setEditing(g)} className="icon-btn boing-effect" style={{ width: '32px', height: '32px', color: ACCENT }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span></button>
                                    <button onClick={() => onDelete(g.cr4a1_ssma_gastoid)} className="icon-btn boing-effect" style={{ width: '32px', height: '32px', color: '#e74c3c' }}><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const GastoForm = ({ data, isAdmin, tecnicos, allUsers, onCancel, onSave }) => {
    const [form, setForm] = useState(data);
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleTecnicoChange = (e) => {
        const login = e.target.value;
        const u = (allUsers || []).find(x => x.cr4a1_username === login);
        setForm({ ...form, cr4a1_tecnico_login: login, cr4a1_unidade: u?.cr4a1_unidade || form.cr4a1_unidade });
    };

    return (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isAdmin && (
                <div>
                    <label style={labelStyle}>Técnico</label>
                    <select value={form.cr4a1_tecnico_login} onChange={handleTecnicoChange} style={inputStyle}>
                        {tecnicos.map(t => <option key={t.cr4a1_username} value={t.cr4a1_username}>{t.cr4a1_username}</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div>
                    <label style={labelStyle}>Categoria</label>
                    <select value={form.cr4a1_categoria} onChange={set('cr4a1_categoria')} style={inputStyle}>
                        {SSMA_CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div><label style={labelStyle}>Data</label><input type="date" value={form.cr4a1_data || ''} onChange={set('cr4a1_data')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Destino / Fornecedor</label><input value={form.cr4a1_destino} onChange={set('cr4a1_destino')} style={inputStyle} /></div>
            </div>
            <div>
                <label style={labelStyle}>Descrição</label>
                <input value={form.cr4a1_descricao} onChange={set('cr4a1_descricao')} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div><label style={labelStyle}>Orçado</label><input type="number" value={form.cr4a1_orcado} onChange={set('cr4a1_orcado')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Realizado</label><input type="number" value={form.cr4a1_realizado} onChange={set('cr4a1_realizado')} style={inputStyle} /></div>
            </div>
            <div>
                <label style={labelStyle}>Evidência / Link</label>
                <input value={form.cr4a1_evidencia} onChange={set('cr4a1_evidencia')} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div>
                <label style={labelStyle}>Observação</label>
                <textarea value={form.cr4a1_observacao} onChange={set('cr4a1_observacao')} rows={2} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button onClick={onCancel} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: '12px' }}>Cancelar</button>
                <button onClick={() => onSave(form)} className="btn-primary" style={{ padding: '10px 18px', borderRadius: '12px', background: ACCENT }}>Salvar</button>
            </div>
        </div>
    );
};
