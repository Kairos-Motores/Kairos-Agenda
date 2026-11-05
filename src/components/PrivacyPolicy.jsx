const Section = ({ title, children }) => (
    <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-title)', marginBottom: '8px' }}>{title}</h2>
        <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>{children}</div>
    </section>
);

export const PrivacyPolicy = () => {
    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-page, var(--bg-secondary))', padding: '40px 16px' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto', background: 'var(--bg-primary)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '32px 28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-title)', marginBottom: '4px' }}>Política de Privacidade — Kairós Agenda</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Última atualização: novembro de 2026</p>

                <Section title="Quem somos">
                    <p>
                        A Kairós Agenda é um sistema interno de calendário, tarefas e gestão comercial usado pelos
                        colaboradores da Kairós Motores. Esta política descreve como tratamos os dados acessados
                        através da integração opcional com o Google Calendar.
                    </p>
                </Section>

                <Section title="O que acessamos no Google Calendar">
                    <p>
                        Quando um colaborador conecta sua conta Google voluntariamente, pedimos apenas a permissão{' '}
                        <strong>somente leitura</strong> (<code>calendar.readonly</code>). Não criamos, editamos nem
                        apagamos nada na agenda do Google de ninguém. Lemos apenas título, data, horário e duração
                        dos eventos — nada além disso.
                    </p>
                </Section>

                <Section title="Como usamos esses dados">
                    <p>
                        Os eventos do Google são exibidos sobrepostos ao calendário interno da Kairós Agenda,
                        apenas na tela de quem conectou a própria conta. Essa camada pode ser escondida a qualquer
                        momento por quem conectou, através de um botão na barra lateral.
                    </p>
                </Section>

                <Section title="Onde ficam armazenados">
                    <p>
                        Guardamos apenas um token de acesso contínuo (refresh token), criptografado (AES-256-GCM)
                        antes de ser salvo, usado unicamente para buscar os eventos sob demanda, sempre que a
                        pessoa conectada abre o calendário. Não armazenamos uma cópia permanente dos eventos do
                        Google — eles são buscados em tempo real e descartados ao fechar a sessão.
                    </p>
                </Section>

                <Section title="Com quem compartilhamos">
                    <p>
                        Com ninguém. Os eventos do Google de uma pessoa só aparecem para ela mesma — nunca para
                        colegas, gestores ou qualquer outro usuário da Kairós Agenda. A única exceção é uma ação
                        explícita: a pessoa pode escolher "Importar para a Kairós" em um evento específico,
                        criando uma cópia independente dentro de um workspace compartilhado escolhido por ela — só
                        nesse caso, e só para aquele evento específico, outras pessoas do mesmo workspace passam a
                        vê-lo.
                    </p>
                </Section>

                <Section title="Como revogar o acesso">
                    <p>
                        A qualquer momento, no perfil da Kairós Agenda, em "Google Calendar", há um botão
                        "Desconectar" que apaga o token guardado imediatamente. Também é possível revogar o acesso
                        diretamente pela própria Google, em{' '}
                        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)' }}>
                            myaccount.google.com/permissions
                        </a>.
                    </p>
                </Section>

                <Section title="Contato">
                    <p>
                        Dúvidas sobre esta política podem ser enviadas para{' '}
                        <a href="mailto:suporte@kairosmotores.com" style={{ color: 'var(--text-accent)' }}>suporte@kairosmotores.com</a>.
                    </p>
                </Section>
            </div>
        </div>
    );
};
