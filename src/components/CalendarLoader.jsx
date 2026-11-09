// Tela de carregamento animada: um cartão de calendário que flutua
// suavemente enquanto a grade de dias pisca em onda diagonal, como se as
// datas estivessem sendo carregadas uma a uma.
const GRID_CELLS = Array.from({ length: 9 }, (_, i) => i);

export const CalendarLoader = ({ label = 'Carregando...' }) => {
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-page)', gap: '22px' }}>
            <div style={{ position: 'relative', width: '96px', height: '104px', animation: 'calendarLoaderFloat 2.6s ease-in-out infinite' }}>
                <div style={{ position: 'absolute', top: '-8px', left: '26px', width: '10px', height: '22px', borderRadius: '5px', background: 'var(--text-title)', transformOrigin: 'top center', animation: 'calendarLoaderRing 2.6s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: '-8px', right: '26px', width: '10px', height: '22px', borderRadius: '5px', background: 'var(--text-title)', transformOrigin: 'top center', animation: 'calendarLoaderRing 2.6s ease-in-out infinite' }} />

                <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', background: 'linear-gradient(180deg, var(--text-secondary), var(--text-title))', boxShadow: '0 16px 30px rgba(0,0,0,0.18)' }} />

                <div style={{
                    position: 'absolute', left: '14px', top: '24px', right: '14px', bottom: '14px',
                    borderRadius: '14px', background: 'var(--bg-primary)',
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
                    gap: '6px', padding: '10px', boxSizing: 'border-box'
                }}>
                    {GRID_CELLS.map(i => {
                        const row = Math.floor(i / 3);
                        const col = i % 3;
                        const delay = (row + col) * 0.12;
                        return (
                            <div
                                key={i}
                                style={{ borderRadius: '4px', background: 'var(--text-accent)', animation: `calendarLoaderDot 1.4s ease-in-out ${delay}s infinite` }}
                            />
                        );
                    })}
                </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{label}</p>
        </div>
    );
};
