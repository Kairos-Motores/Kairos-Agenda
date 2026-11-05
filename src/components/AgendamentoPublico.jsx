import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarClock, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DateField } from './ui/date-field';

const ACCENT = '#f57c00';

export const AgendamentoPublico = ({ token }) => {
  const [status, setStatus] = useState('carregando'); // carregando | ok | invalido | enviado
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [motivo, setMotivo] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`/api/public-booking?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Não foi possível carregar este link agora. Tente novamente mais tarde.');
        return res.json();
      })
      .then((json) => { setDados(json); setStatus('ok'); })
      .catch((e) => { setErro(e.message); setStatus('invalido'); });
  }, [token]);

  const diaSemanaInvalido = useMemo(() => {
    if (!data) return false;
    const d = new Date(`${data}T12:00:00`);
    const dia = d.getDay();
    return dia === 0 || dia === 6;
  }, [data]);

  const horariosLivres = useMemo(() => {
    if (!dados || !data) return dados?.horariosDisponiveis || [];
    const ocupadosNoDia = (dados.ocupados || []).filter(o => o.data === data).map(o => o.hora);
    return (dados.horariosDisponiveis || []).filter(h => !ocupadosNoDia.includes(h));
  }, [dados, data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !contato.trim() || !motivo.trim() || !data || !hora) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (diaSemanaInvalido) {
      setErro('Escolha um dia útil (segunda a sexta).');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/public-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nome, contato, motivo, data, hora, website: '' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Não foi possível agendar. Tente novamente.');
      setStatus('enviado');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page, var(--bg-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-primary)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '28px 24px', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>

        {status === 'carregando' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <CalendarClock className="size-10" style={{ margin: '0 auto 12px', color: ACCENT }} />
            Carregando...
          </div>
        )}

        {status === 'invalido' && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
            <AlertTriangle className="size-10" style={{ margin: '0 auto 12px', color: '#e74c3c' }} />
            <h2 style={{ color: 'var(--text-title)', fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Link inválido</h2>
            <p style={{ fontSize: '13px' }}>{erro || 'Este link de agendamento não existe mais ou foi trocado por um novo.'}</p>
          </div>
        )}

        {status === 'enviado' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 className="size-12" style={{ margin: '0 auto 14px', color: '#22c55e' }} />
            <h2 style={{ color: 'var(--text-title)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Solicitação enviada!</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Recebemos seu pedido de visita para {format(new Date(`${data}T12:00:00`), "d 'de' MMMM", { locale: ptBR })} às {hora}.
              Aguarde a confirmação de {dados?.comercial?.nome} — você será contatado em breve.
            </p>
          </div>
        )}

        {status === 'ok' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <CalendarClock className="size-8" style={{ margin: '0 auto 8px', color: ACCENT }} />
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-title)' }}>Agendar visita</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                com {dados?.comercial?.nome}{dados?.comercial?.filial ? ` · ${dados.comercial.filial}` : ''}
              </p>
            </div>

            <div>
              <Label>Seu nome / empresa</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva - Empresa XPTO" maxLength={120} required />
            </div>

            <div>
              <Label>Telefone ou e-mail para contato</Label>
              <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Ex: (99) 99999-9999" maxLength={120} required />
            </div>

            <div>
              <Label>Motivo da visita</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Apresentação de proposta comercial" maxLength={500} required />
            </div>

            <DateField label="Data desejada" selectedDate={data} onSelect={(d) => { setData(d); setHora(''); }} />
            {diaSemanaInvalido && (
              <span style={{ fontSize: '12px', color: '#e74c3c', marginTop: '-8px' }}>Escolha um dia útil (segunda a sexta).</span>
            )}

            {data && !diaSemanaInvalido && (
              <div>
                <Label>Horário</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {horariosLivres.length === 0 && (
                    <span style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--text-secondary)' }}>Sem horários livres nesse dia. Escolha outra data.</span>
                  )}
                  {horariosLivres.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHora(h)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        padding: '8px 0', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                        border: `1px solid ${hora === h ? ACCENT : 'var(--border-color)'}`,
                        background: hora === h ? ACCENT : 'var(--bg-secondary)',
                        color: hora === h ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Clock className="size-3" /> {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {erro && <span style={{ fontSize: '13px', color: '#e74c3c' }}>{erro}</span>}

            <Button type="submit" disabled={enviando} style={{ background: ACCENT, marginTop: '6px' }}>
              {enviando ? 'Enviando...' : 'Solicitar agendamento'}
            </Button>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Sua visita fica pendente até a confirmação do comercial.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
