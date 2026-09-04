import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { SSMA_STATUS_LIST, SSMA_CRITICIDADE_LIST, SSMA_CATEGORIAS_GASTO } from '../config/ssmaConfig';
import { computeSsmaResumo, computeGastosPorCategoria, diasEmAtraso, tipoParaIndicador } from '../utils/ssmaIndicators';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart';
import { Badge } from './ui/badge';

const STATUS_CHART_COLOR = {
    'ATINGIDO': 'var(--chart-1)',
    'ABAIXO DA META': 'var(--chart-3)',
    'NÃO INFORMADO': 'var(--muted-foreground)'
};
const GASTO_CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

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

const STATUS_BADGE_VARIANT = { 'ATINGIDO': 'success', 'ABAIXO DA META': 'destructive', 'NÃO INFORMADO': 'secondary' };
const StatusBadge = ({ status }) => <Badge variant={STATUS_BADGE_VARIANT[status] || 'secondary'} className="whitespace-nowrap">{status}</Badge>;

// Normaliza as linhas cruas do Dataverse (cr4a1_codigo, cr4a1_meta como fração 0-1 etc.)
// para o formato {pk, codigo, nome, tipo, meta} usado pelos cálculos e pela UI.
const normalizarIndicadores = (raw) => (raw || [])
    .map(i => ({
        pk: i.cr4a1_ssma_indicadorid,
        codigo: i.cr4a1_codigo || '',
        nome: i.cr4a1_nome || '',
        tipo: i.cr4a1_tipo || '',
        meta: Number(i.cr4a1_meta) || 0,
        ordem: Number(i.cr4a1_ordem) || 0
    }))
    .sort((a, b) => a.ordem - b.ordem || a.codigo.localeCompare(b.codigo));

export const SsmaPanel = ({
    currentUser, hasRole, allUsers,
    ssmaAtividades, ssmaGastos, ssmaIndicadores,
    addSsmaAtividade, updateSsmaAtividade, deleteSsmaAtividade,
    addSsmaGasto, updateSsmaGasto, deleteSsmaGasto,
    addSsmaIndicador, updateSsmaIndicador, deleteSsmaIndicador
}) => {
    const isAdmin = hasRole('ADMIN');
    const isTecnico = hasRole('SSMA');
    const isChefe = hasRole('COORD SSMA');
    const podeEditarLancamentos = isAdmin || isTecnico;
    const podeGerenciarIndicadores = isAdmin || isChefe;

    const indicadores = useMemo(() => normalizarIndicadores(ssmaIndicadores), [ssmaIndicadores]);
    const tiposDisponiveis = useMemo(() => Array.from(new Set(indicadores.map(i => i.tipo).filter(Boolean))), [indicadores]);

    const [subTab, setSubTab] = useState('indicadores');
    const [competencia, setCompetencia] = useState(format(new Date(), 'MM/yyyy'));
    const [unidade, setUnidade] = useState(isAdmin || isChefe ? '' : (currentUser?.cr4a1_unidade || ''));

    const unidadesDisponiveis = useMemo(() => {
        const set = new Set((allUsers || []).map(u => u.cr4a1_unidade).filter(Boolean));
        return Array.from(set).sort();
    }, [allUsers]);

    // Admin não tem restrição de unidade; técnico está sempre preso à própria unidade,
    // mesmo que o estado `unidade` seja mexido em algum lugar — é a filial ligada ao
    // login dele, não uma escolha.
    const unidadeEfetiva = (isAdmin || isChefe) ? unidade : (currentUser?.cr4a1_unidade || '');

    const resumo = useMemo(
        () => computeSsmaResumo(ssmaAtividades, ssmaGastos, competencia, unidadeEfetiva, indicadores),
        [ssmaAtividades, ssmaGastos, competencia, unidadeEfetiva, indicadores]
    );
    const gastosPorCategoria = useMemo(
        () => computeGastosPorCategoria(ssmaGastos, SSMA_CATEGORIAS_GASTO, competencia, unidadeEfetiva),
        [ssmaGastos, competencia, unidadeEfetiva]
    );

    const atividadesFiltradas = (ssmaAtividades || []).filter(a => a.cr4a1_competencia === competencia && a.cr4a1_unidade === unidadeEfetiva);
    const gastosFiltrados = (ssmaGastos || []).filter(g => g.cr4a1_competencia === competencia && g.cr4a1_unidade === unidadeEfetiva);

    const [editingAtividade, setEditingAtividade] = useState(null);
    const [editingGasto, setEditingGasto] = useState(null);
    const [editingIndicador, setEditingIndicador] = useState(null);

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
                {podeEditarLancamentos && <div onClick={() => setSubTab('atividades')} style={tabStyle(subTab === 'atividades')}>Atividades e Ocorrências</div>}
                {podeEditarLancamentos && <div onClick={() => setSubTab('gastos')} style={tabStyle(subTab === 'gastos')}>Gastos SSMA</div>}
                {podeGerenciarIndicadores && <div onClick={() => setSubTab('gerenciar')} style={tabStyle(subTab === 'gerenciar')}>Gerenciar Indicadores</div>}
            </div>

            {subTab === 'indicadores' && <IndicadoresTab resumo={resumo} gastosPorCategoria={gastosPorCategoria} />}
            {subTab === 'atividades' && podeEditarLancamentos && (
                <AtividadesTab
                    atividades={atividadesFiltradas}
                    competencia={competencia}
                    unidade={unidadeEfetiva}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    allUsers={allUsers}
                    indicadores={indicadores}
                    tiposDisponiveis={tiposDisponiveis}
                    editing={editingAtividade}
                    setEditing={setEditingAtividade}
                    onSave={(id, data) => id ? updateSsmaAtividade(id, data) : addSsmaAtividade(data)}
                    onDelete={deleteSsmaAtividade}
                />
            )}
            {subTab === 'gastos' && podeEditarLancamentos && (
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
            {subTab === 'gerenciar' && podeGerenciarIndicadores && (
                <GerenciarIndicadoresTab
                    indicadores={indicadores}
                    editing={editingIndicador}
                    setEditing={setEditingIndicador}
                    onSave={(pk, data) => pk ? updateSsmaIndicador(pk, data) : addSsmaIndicador(data)}
                    onDelete={deleteSsmaIndicador}
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

// Barras agrupadas Realizado vs Meta por indicador, coloridas por status
// (verde=atingido, vermelho=abaixo da meta, cinza=sem base) usando a paleta
// combinada --chart-1..6 definida em index.css.
const IndicadoresBarChart = ({ indicadores }) => {
    const data = indicadores.map(ind => ({
        codigo: ind.codigo,
        nome: ind.nome,
        resultado: ind.resultado != null ? Math.round(ind.resultado * 100) : 0,
        meta: Math.round(ind.meta * 100),
        status: ind.status
    }));

    const config = {
        resultado: { label: 'Realizado' },
        meta: { label: 'Meta', color: 'var(--border-strong)' }
    };

    return (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="codigo" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-35} textAnchor="end" height={50} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} unit="%" width={40} domain={[0, 100]} />
                <ChartTooltip
                    cursor={{ fill: 'var(--secondary)' }}
                    content={<ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.nome}
                        formatter={(value, name) => [`${value}%`, name === 'resultado' ? 'Realizado' : 'Meta']}
                    />}
                />
                <Bar dataKey="meta" fill="var(--border-strong)" radius={[6, 6, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                <Bar dataKey="resultado" radius={[6, 6, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                    {data.map((entry) => <Cell key={entry.codigo} fill={STATUS_CHART_COLOR[entry.status]} />)}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
};

// Donut do gasto realizado por categoria — só entram categorias com valor > 0, cada
// fatia usando uma cor da paleta combinada, ciclando se houver mais categorias que cores.
const GastosDonutChart = ({ gastosPorCategoria }) => {
    const data = gastosPorCategoria.filter(g => g.realizado > 0);
    if (data.length === 0) return null;

    const config = Object.fromEntries(data.map((g, i) => [g.categoria, { label: g.categoria, color: GASTO_CHART_COLORS[i % GASTO_CHART_COLORS.length] }]));

    // isAnimationActive=false é necessário: com StrictMode (que monta/desmonta os efeitos
    // uma vez a mais em dev), a animação de entrada do <Pie> fica interrompida no meio e
    // ele nunca termina de desenhar os sectors — o SVG fica com o layer do pie vazio,
    // sem nenhum erro no console. key força remontar do zero quando as categorias mudam.
    return (
        <ChartContainer key={data.map(d => d.categoria).join('|')} config={config} className="aspect-auto h-64 w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />} />
                <Pie data={data} dataKey="realizado" nameKey="categoria" innerRadius={60} outerRadius={95} strokeWidth={2} stroke="var(--card)" isAnimationActive={false}>
                    {data.map((entry, i) => <Cell key={entry.categoria} fill={GASTO_CHART_COLORS[i % GASTO_CHART_COLORS.length]} />)}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
        </ChartContainer>
    );
};

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

        {resumo.indicadores.length > 0 && (
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--text-title)' }}>Realizado × Meta por Indicador</h3>
                <IndicadoresBarChart indicadores={resumo.indicadores} />
            </div>
        )}

        <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-title)' }}>Indicadores — Status na Competência</h3>
            {resumo.indicadores.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Nenhum indicador cadastrado ainda. Peça ao chefe da equipe para cadastrar em "Gerenciar Indicadores".</p>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '8px' }}>Código</th>
                                    <th style={{ padding: '8px' }}>Indicador</th>
                                    <th style={{ padding: '8px' }}>Meta</th>
                                    <th style={{ padding: '8px' }}>Memória de Cálculo</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resumo.indicadores.map(ind => (
                                    <tr key={ind.pk} style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '8px', fontWeight: '700', color: 'var(--text-primary)' }}>{ind.codigo}</td>
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
                </>
            )}
        </div>

        <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-title)' }}>Gasto por Categoria</h3>
            <GastosDonutChart gastosPorCategoria={gastosPorCategoria} />
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

const emptyAtividade = (currentUser, unidade, competencia, tiposDisponiveis) => ({
    cr4a1_competencia: competencia,
    cr4a1_unidade: unidade,
    cr4a1_tecnico_login: currentUser?.cr4a1_username || '',
    cr4a1_tipo: tiposDisponiveis[0] || '',
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

const AtividadesTab = ({ atividades, competencia, unidade, currentUser, isAdmin, allUsers, indicadores, tiposDisponiveis, editing, setEditing, onSave, onDelete }) => {
    const tecnicos = (allUsers || []).filter(u => (u.cr4a1_role || '').split(',').map(r => r.trim()).includes('SSMA'));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tiposDisponiveis.length === 0 ? (
                <p style={{ color: '#f57c00', fontSize: '13px' }}>Nenhum indicador cadastrado ainda — peça ao chefe da equipe para cadastrar em "Gerenciar Indicadores" antes de lançar atividades.</p>
            ) : (
                <button onClick={() => setEditing(emptyAtividade(currentUser, unidade, competencia, tiposDisponiveis))} className="btn-primary boing-effect" style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '12px', background: ACCENT }}>
                    + Nova atividade
                </button>
            )}

            {editing && (
                <AtividadeForm
                    data={editing}
                    isAdmin={isAdmin}
                    tecnicos={tecnicos}
                    allUsers={allUsers}
                    tiposDisponiveis={tiposDisponiveis}
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
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: ACCENT, background: ACCENT_BG, padding: '2px 8px', borderRadius: '8px' }}>{tipoParaIndicador(a.cr4a1_tipo, indicadores)}</span>
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

const AtividadeForm = ({ data, isAdmin, tecnicos, allUsers, tiposDisponiveis, onCancel, onSave }) => {
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
                        {tiposDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
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
    const tecnicos = (allUsers || []).filter(u => (u.cr4a1_role || '').split(',').map(r => r.trim()).includes('SSMA'));

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

const emptyIndicador = () => ({ cr4a1_codigo: '', cr4a1_nome: '', cr4a1_tipo: '', cr4a1_meta: 100, cr4a1_ordem: 0 });

// Tela do COORD SSMA/ADMIN para cadastrar, editar e excluir indicadores (código, nome,
// tipo de atividade associado e meta) — persistidos em cr4a1_ssma_indicadors. É o que
// alimenta tanto a aba Indicadores (leitura) quanto o dropdown "Tipo" que o técnico usa
// ao lançar uma atividade.
const GerenciarIndicadoresTab = ({ indicadores, editing, setEditing, onSave, onDelete }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Cada indicador vira uma linha na aba Indicadores e um tipo disponível para os técnicos lançarem atividades.
        </p>
        <button
            onClick={() => setEditing({ pk: null, form: emptyIndicador() })}
            className="btn-primary boing-effect"
            style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '12px', background: ACCENT }}
        >
            + Novo indicador
        </button>

        {editing && (
            <IndicadorForm
                data={editing.form}
                onCancel={() => setEditing(null)}
                onSave={(data) => { onSave(editing.pk, data); setEditing(null); }}
            />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {indicadores.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Nenhum indicador cadastrado.</p>}
            {indicadores.map(ind => (
                <div key={ind.pk} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: ACCENT, background: ACCENT_BG, padding: '2px 8px', borderRadius: '8px' }}>{ind.codigo}</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ind.nome}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tipo: {ind.tipo} — Meta: {(ind.meta * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => setEditing({ pk: ind.pk, form: { cr4a1_codigo: ind.codigo, cr4a1_nome: ind.nome, cr4a1_tipo: ind.tipo, cr4a1_meta: Math.round(ind.meta * 100), cr4a1_ordem: ind.ordem } })}
                            className="icon-btn boing-effect" style={{ width: '32px', height: '32px', color: ACCENT }}
                        >
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                        <button
                            onClick={() => { if (window.confirm(`Remover o indicador "${ind.codigo}"? Ele deixará de aparecer na apuração e os técnicos não poderão mais lançar atividades desse tipo.`)) onDelete(ind.pk); }}
                            className="icon-btn boing-effect" style={{ width: '32px', height: '32px', color: '#e74c3c' }}
                        >
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const IndicadorForm = ({ data, onCancel, onSave }) => {
    const [form, setForm] = useState(data);
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSave = () => {
        if (!form.cr4a1_codigo.trim() || !form.cr4a1_tipo.trim()) return;
        onSave({
            cr4a1_codigo: form.cr4a1_codigo.trim(),
            cr4a1_nome: form.cr4a1_nome.trim(),
            cr4a1_tipo: form.cr4a1_tipo.trim(),
            cr4a1_meta: Math.max(0, Math.min(100, Number(form.cr4a1_meta) || 0)) / 100,
            cr4a1_ordem: Number(form.cr4a1_ordem) || 0
        });
    };

    return (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div><label style={labelStyle}>Código (ex: TST-11)</label><input value={form.cr4a1_codigo} onChange={set('cr4a1_codigo')} style={inputStyle} /></div>
                <div><label style={labelStyle}>Tipo de atividade</label><input value={form.cr4a1_tipo} onChange={set('cr4a1_tipo')} placeholder="ex: Novo Treinamento" style={inputStyle} /></div>
                <div><label style={labelStyle}>Meta (%)</label><input type="number" min="0" max="100" value={form.cr4a1_meta} onChange={set('cr4a1_meta')} style={inputStyle} /></div>
            </div>
            <div>
                <label style={labelStyle}>Nome / Descrição do indicador</label>
                <input value={form.cr4a1_nome} onChange={set('cr4a1_nome')} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button onClick={onCancel} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: '12px' }}>Cancelar</button>
                <button onClick={handleSave} className="btn-primary" style={{ padding: '10px 18px', borderRadius: '12px', background: ACCENT }}>Salvar</button>
            </div>
        </div>
    );
};
