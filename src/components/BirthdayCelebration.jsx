export const BirthdayCelebration = ({ name, onClose }) => (
  <div className="view-enter" style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <div className="birthday-float" style={{ fontSize: '80px', marginBottom: '20px' }}>🎂</div>
      <h1 style={{ color: 'white', fontSize: '32px', margin: '0 0 10px' }}>Parabéns, {name}! 🥳</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', marginBottom: '30px' }}>A equipe Kairós deseja-te um dia incrível!</p>
      <button onClick={onClose} className="btn-primary boing-effect" style={{ padding: '12px 32px' }}>Obrigado!</button>
    </div>
    <style>{`
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
      .birthday-float { animation: float 3s ease-in-out infinite; }
    `}</style>
  </div>
);
